import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const pad2 = (n) => String(n).padStart(2, '0');

const formatTimestamp = (d) => {
	const yyyy = d.getFullYear();
	const mm = pad2(d.getMonth() + 1);
	const dd = pad2(d.getDate());
	const hh = pad2(d.getHours());
	const mi = pad2(d.getMinutes());
	const ss = pad2(d.getSeconds());
	return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
};

const parseArgs = (argv) => {
	const out = {
		composition: 'MergeSegments',
		props: 'merge-props.local.json',
		outDir: 'out',
		baseName: 'merged',
		concurrency: '1',
	};

	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--help' || a === '-h') {
			out.help = true;
			continue;
		}
		if (a === '--composition') {
			out.composition = argv[i + 1];
			i++;
			continue;
		}
		if (a === '--props') {
			out.props = argv[i + 1];
			i++;
			continue;
		}
		if (a === '--outDir') {
			out.outDir = argv[i + 1];
			i++;
			continue;
		}
		if (a === '--baseName') {
			out.baseName = argv[i + 1];
			i++;
			continue;
		}
		if (a === '--concurrency') {
			out.concurrency = argv[i + 1];
			i++;
			continue;
		}
	}

	return out;
};

const printHelp = () => {
	const msg = `\
Render Remotion composition to a timestamped file\n\n\
Usage:\n\
  node scripts/render-merge-with-timestamp.mjs --props merge-props.local.json\n\n\
Options:\n\
  --composition <id>   Composition id (default: MergeSegments)\n\
  --props <file>       Props JSON file (default: merge-props.local.json)\n\
  --outDir <dir>       Output directory (default: out)\n\
  --baseName <name>    Output base name (default: merged)\n\
  --concurrency <n>    Remotion concurrency (default: 1)\n\n\
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

const main = async () => {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printHelp();
		return;
	}

	const propsExists = await fileExists(args.props);
	if (!propsExists) {
		throw new Error(`Props file not found: ${args.props}`);
	}

	await fs.promises.mkdir(args.outDir, { recursive: true });
	const ts = formatTimestamp(new Date());
	const outPath = path.join(args.outDir, `${args.baseName}-${ts}.mp4`);

	// eslint-disable-next-line no-console
	console.log(`Output: ${outPath}`);

	const localBin = path.resolve(
		process.cwd(),
		'node_modules',
		'.bin',
		process.platform === 'win32' ? 'remotion.cmd' : 'remotion'
	);
	const bin = (await fileExists(localBin)) ? localBin : process.platform === 'win32' ? 'remotion.cmd' : 'remotion';
	const cmdArgs = [
		'render',
		args.composition,
		outPath,
		`--props=${args.props}`,
		`--concurrency=${args.concurrency}`,
	];

	const child = spawn(bin, cmdArgs, {
		stdio: 'inherit',
		shell: false,
	});

	await new Promise((resolve, reject) => {
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`remotion exited with code ${code ?? 'unknown'}`));
		});
	});
};

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
});
