import React, { useMemo } from 'react';
import { ALL_FORMATS, Input, UrlSource } from 'mediabunny';
import type { CalculateMetadataFunction } from 'remotion';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useVideoConfig } from 'remotion';

export type MergeClip = {
	src: string;
	// Provide either durationInFrames or duration_s.
	durationInFrames?: number;
	duration_s?: number;
};

export type MergeSegmentsProps = {
	clips: MergeClip[];
	backgroundColor?: string;
	fit?: 'cover' | 'contain';
	/**
	 * How long Remotion should wait for video metadata/frames.
	 * Useful for slow remote URLs.
	 */
	delayRenderTimeoutInMilliseconds?: number;
	/**
	 * How many times Remotion should retry loading a video.
	 */
	delayRenderRetries?: number;
};

const toFrames = (clip: MergeClip, fps: number): number => {
	if (typeof clip.durationInFrames === 'number' && Number.isFinite(clip.durationInFrames)) {
		return Math.max(0, Math.floor(clip.durationInFrames));
	}
	if (typeof clip.duration_s === 'number' && Number.isFinite(clip.duration_s)) {
		return Math.max(0, Math.round(clip.duration_s * fps));
	}
	return 0;
};

const resolveSrc = (src: string) => {
	const trimmed = (src ?? '').trim();
	if (!trimmed) {
		return trimmed;
	}
	if (/^(https?:)?\/\//i.test(trimmed)) {
		return trimmed;
	}
	if (/^(data:|blob:|file:)/i.test(trimmed)) {
		return trimmed;
	}
	return staticFile(trimmed.replace(/^\/+/, ''));
};

const getVideoDimensions = async (src: string): Promise<{ width: number; height: number }> => {
	const input = new Input({
		formats: ALL_FORMATS,
		source: new UrlSource(src, {
			getRetryDelay: () => null,
		}),
	});

	const videoTrack = await input.getPrimaryVideoTrack();
	if (!videoTrack) {
		throw new Error('No video track found');
	}

	return {
		width: videoTrack.displayWidth,
		height: videoTrack.displayHeight,
	};
};

export const calculateMergeSegmentsMetadata: CalculateMetadataFunction<MergeSegmentsProps> = async ({
	props,
}) => {
	const fps = 30;
	const total = (props.clips ?? []).reduce((sum, clip) => sum + toFrames(clip, fps), 0);

	let width = 1920;
	let height = 1080;
	const first = (props.clips ?? []).find((c) => typeof c?.src === 'string' && c.src.trim());
	if (first?.src) {
		try {
			const resolved = resolveSrc(first.src);
			const dims = await getVideoDimensions(resolved);
			if (Number.isFinite(dims.width) && Number.isFinite(dims.height) && dims.width > 0 && dims.height > 0) {
				width = Math.round(dims.width);
				height = Math.round(dims.height);
			}
		} catch {
			// Fall back to default width/height.
		}
	}

	return {
		fps,
		durationInFrames: Math.max(1, total),
		width,
		height,
		defaultOutName: 'merged.mp4',
	};
};

export const MergeSegments: React.FC<MergeSegmentsProps> = ({
	clips,
	backgroundColor = 'black',
	fit = 'cover',
	delayRenderTimeoutInMilliseconds = 120_000,
	delayRenderRetries = 2,
}) => {
	const { fps } = useVideoConfig();

	const timeline = useMemo(() => {
		const normalized = (clips ?? [])
			.map((clip) => ({
				...clip,
				durationInFrames: toFrames(clip, fps),
				src: resolveSrc(clip.src),
			}))
			.filter((clip) => clip.src && clip.durationInFrames > 0);

		let from = 0;
		return normalized.map((clip) => {
			const entry = { ...clip, from };
			from += clip.durationInFrames;
			return entry;
		});
	}, [clips, fps]);

	return (
		<AbsoluteFill style={{ backgroundColor }}>
			{timeline.map((clip, i) => (
				<Sequence key={`${clip.src}-${i}`} from={clip.from} durationInFrames={clip.durationInFrames}>
					<OffthreadVideo
						src={clip.src}
						delayRenderTimeoutInMilliseconds={delayRenderTimeoutInMilliseconds}
						delayRenderRetries={delayRenderRetries}
						pauseWhenBuffering
						style={{ width: '100%', height: '100%', objectFit: fit }}
					/>
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
