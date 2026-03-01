import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';

const parseArgs = (argv) => {
	const out = {
		inFile: 'merge-props.json',
		outFile: 'merge-props.local.json',
		publicDir: 'public',
		subDir: 'prefetched',
		force: false,
	};

	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--help' || a === '-h') {
			out.help = true;
			continue;
		}
		if (a === '--in') {
			out.inFile = argv[i + 1];
			i++;
			continue;
		}
		if (a === '--out') {
			out.outFile = argv[i + 1];
			i++;
			continue;
		}
		if (a === '--public') {
			out.publicDir = argv[i + 1];
			i++;
			continue;
		}
		if (a === '--dir') {
			out.subDir = argv[i + 1];
			i++;
			continue;
		}
		if (a === '--force') {
			out.force = true;
			continue;
		}
		rest.push(a);
	}

	// Back-compat: allow passing input file as first positional.
	if (rest.length > 0 && !rest[0].startsWith('-')) {
		out.inFile = rest[0];
	}

	return out;
};

const printHelp = () => {
	const msg = `\
Prefetch merge assets (sequential download)\n\n\
Usage:\n\
  node scripts/prefetch-merge-assets.mjs --in merge-props.json --out merge-props.local.json\n\n\
Options:\n\
  --in <file>       Input props JSON (default: merge-props.json)\n\
  --out <file>      Output props JSON (default: merge-props.local.json)\n\
  --public <dir>    Remotion public dir (default: public)\n\
  --dir <subdir>    Subdir inside public (default: prefetched)\n\
  --force           Redownload even if file exists\n\n\
Notes:\n\
  - Only downloads http(s) URLs. blob:/data: sources cannot be prefetched.\n\
  - Output JSON will replace clip.src with a path relative to the public dir, e.g. prefetched/segment-001.mp4\n\
`;

	// eslint-disable-next-line no-console
	console.log(msg);
};

const fileExists = async (p) => {
	try {
		await fs.promises.access(p);
		return true;
	} catch {
		return false;
	}
};

const toSafeExt = (ext) => {
	const clean = (ext ?? '').toLowerCase();
	if (['.mp4', '.webm', '.mov', '.m4v'].includes(clean)) {
		return clean;
	}
	return '.mp4';
};

const extFromUrl = (url) => {
	try {
		const u = new URL(url);
		const ext = path.extname(u.pathname);
		return toSafeExt(ext);
	} catch {
		return '.mp4';
	}
};

const extFromContentType = (contentType) => {
	const ct = (contentType ?? '').toLowerCase();
	if (ct.includes('video/webm')) {
		return '.webm';
	}
	if (ct.includes('video/quicktime')) {
		return '.mov';
	}
	if (ct.includes('video/mp4')) {
		return '.mp4';
	}
	return '.mp4';
};

const pad3 = (n) => String(n).padStart(3, '0');

const main = async () => {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printHelp();
		return;
	}

	if (!args.inFile) {
		throw new Error('Missing --in <file>');
	}
	if (!args.outFile) {
		throw new Error('Missing --out <file>');
	}

	const raw = await fs.promises.readFile(args.inFile, 'utf8');
	const parsed = JSON.parse(raw);
	if (!parsed || typeof parsed !== 'object') {
		throw new Error('Input JSON is not an object');
	}
	if (!Array.isArray(parsed.clips)) {
		throw new Error('Input JSON must contain "clips": []');
	}

	const destDir = path.join(args.publicDir, args.subDir);
	await fs.promises.mkdir(destDir, {recursive: true});

	const newClips = [];
	for (let i = 0; i < parsed.clips.length; i++) {
		const clip = parsed.clips[i];
		const index = i + 1;
		if (!clip || typeof clip !== 'object') {
			throw new Error(`clips[${i}] is not an object`);
		}
		const src = clip.src;
		if (typeof src !== 'string' || !src.trim()) {
			throw new Error(`clips[${i}].src must be a non-empty string`);
		}

		const trimmed = src.trim();
		if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
			throw new Error(
				`clips[${i}].src is a blob:/data: URL. Cannot prefetch in Node. ` +
					`Make the video model return a http(s) video_url instead.`
			);
		}

		if (!/^https?:\/\//i.test(trimmed)) {
			// Already local/static path. Keep as-is.
			newClips.push(clip);
			continue;
		}

		const baseExt = extFromUrl(trimmed);
		const fileBase = `segment-${pad3(index)}`;
		let fileName = `${fileBase}${baseExt}`;
		let destPath = path.join(destDir, fileName);

		const already = await fileExists(destPath);
		if (already && !args.force) {
			// eslint-disable-next-line no-console
			console.log(`[${index}/${parsed.clips.length}] Skip (exists): ${fileName}`);
			newClips.push({
				...clip,
				src: `${args.subDir}/${fileName}`,
			});
			continue;
		}

		// eslint-disable-next-line no-console
		console.log(`[${index}/${parsed.clips.length}] Download: ${trimmed}`);
		const res = await fetch(trimmed, {
			method: 'GET',
			redirect: 'follow',
		});
		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}\n${body}`);
		}
		if (!res.body) {
			throw new Error('Download failed: empty response body');
		}

		const ct = res.headers.get('content-type');
		const ext = baseExt === '.mp4' ? extFromContentType(ct) : baseExt;
		fileName = `${fileBase}${ext}`;
		destPath = path.join(destDir, fileName);

		await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath));
		// eslint-disable-next-line no-console
		console.log(`    Saved: ${path.relative(process.cwd(), destPath)}`);

		newClips.push({
			...clip,
			src: `${args.subDir}/${fileName}`,
		});
	}

	const outJson = {
		...parsed,
		clips: newClips,
	};
	await fs.promises.writeFile(args.outFile, `${JSON.stringify(outJson, null, 2)}\n`, 'utf8');
	// eslint-disable-next-line no-console
	console.log(`\nDone. Wrote: ${args.outFile}`);
};

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
});
