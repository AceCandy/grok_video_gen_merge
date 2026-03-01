import { Composition } from 'remotion';
import { BootAnimation } from './BootAnimation';
import { MergeSegments, calculateMergeSegmentsMetadata } from './MergeSegments';

export const RemotionRoot = () => {
	return (
		<>
			<Composition
				id="MergeSegments"
				component={MergeSegments}
				durationInFrames={30}
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{ clips: [] }}
				calculateMetadata={calculateMergeSegmentsMetadata}
			/>
			<Composition
				id="BootAnimation"
				component={BootAnimation}
				durationInFrames={270}
				fps={30}
				width={1920}
				height={1080}
			/>
		</>
	);
};
