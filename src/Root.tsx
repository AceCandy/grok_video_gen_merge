import { Composition } from 'remotion';
import { BootAnimation } from './BootAnimation';

export const RemotionRoot = () => {
	return (
		<>
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