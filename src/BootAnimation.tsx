import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	spring,
	Sequence,
} from 'remotion';

const Logo = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const scaleProgress = spring({
		frame,
		fps,
		config: { damping: 15, stiffness: 100 },
	});

	const scale = interpolate(scaleProgress, [0, 1], [0.3, 1]);
	const opacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				opacity,
			}}
		>
			<div
				style={{
					width: 200,
					height: 200,
					transform: `scale(${scale})`,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 20,
				}}
			>
				<div
					style={{
						width: 120,
						height: 120,
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						borderRadius: 24,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<div
						style={{
							width: 50,
							height: 50,
							background: 'white',
							borderRadius: '50%',
						}}
					/>
				</div>
			</div>
		</AbsoluteFill>
	);
};

const LoadingSpinner = () => {
	const frame = useCurrentFrame();
	const rotation = interpolate(frame, [0, 60], [0, 360], {
		extrapolateRight: 'extend',
	});
	const opacity = interpolate(frame, [0, 15], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'flex-end',
				paddingBottom: 180,
				opacity,
			}}
		>
			<div
				style={{
					width: 40,
					height: 40,
					border: '3px solid rgba(255,255,255,0.2)',
					borderTopColor: 'white',
					borderRadius: '50%',
					transform: `rotate(${rotation}deg)`,
				}}
			/>
		</AbsoluteFill>
	);
};

const WelcomeText = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const opacity = interpolate(frame, [0, 20], [0, 1], {
		extrapolateRight: 'clamp',
	});

	const translateY = spring({
		frame,
		fps,
		config: { damping: 200 },
	});

	const y = interpolate(translateY, [0, 1], [30, 0]);

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				opacity,
			}}
		>
			<div
				style={{
					transform: `translateY(${y}px)`,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 12,
				}}
			>
				<span
					style={{
						fontSize: 48,
						fontWeight: 600,
						color: 'white',
						letterSpacing: -1,
					}}
				>
					Welcome
				</span>
				<span
					style={{
						fontSize: 18,
						color: 'rgba(255,255,255,0.7)',
						fontWeight: 400,
					}}
				>
					Getting things ready for you...
				</span>
			</div>
		</AbsoluteFill>
	);
};

const Desktop = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const progress = spring({
		frame,
		fps,
		config: { damping: 200 },
	});

	const opacity = interpolate(progress, [0, 1], [0, 1]);
	const scale = interpolate(progress, [0, 1], [1.05, 1]);

	const iconDelay = 0.3 * fps;
	const icons = ['📁', '📄', '🌐', '💬', '🎵'];

	return (
		<AbsoluteFill
			style={{
				opacity,
				transform: `scale(${scale})`,
			}}
		>
			<div
				style={{
					width: '100%',
					height: '100%',
					background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 40,
						left: 40,
						display: 'flex',
						flexDirection: 'column',
						gap: 20,
					}}
				>
					{icons.map((icon, i) => {
						const iconProgress = spring({
							frame: frame - iconDelay - i * 8,
							fps,
							config: { damping: 15 },
						});
						const iconScale = interpolate(iconProgress, [0, 1], [0.5, 1]);
						const iconOpacity = interpolate(iconProgress, [0, 1], [0, 1]);

						return (
							<div
								key={i}
								style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: 6,
									opacity: iconOpacity,
									transform: `scale(${iconScale})`,
								}}
							>
								<div
									style={{
										width: 64,
										height: 64,
										background: 'rgba(255,255,255,0.1)',
										borderRadius: 12,
										display: 'flex',
										justifyContent: 'center',
										alignItems: 'center',
										fontSize: 32,
									}}
								>
									{icon}
								</div>
								<span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
									App {i + 1}
								</span>
							</div>
						);
					})}
				</div>

				<div
					style={{
						position: 'absolute',
						bottom: 40,
						left: 0,
						right: 0,
						height: 60,
						background: 'rgba(255,255,255,0.1)',
						backdropFilter: 'blur(10px)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 16,
					}}
				>
					{[...Array(7)].map((_, i) => {
						const dockProgress = spring({
							frame: frame - iconDelay - i * 5,
							fps,
							config: { damping: 12 },
						});
						const dockScale = interpolate(dockProgress, [0, 1], [0.3, 1]);

						return (
							<div
								key={i}
								style={{
									width: 40,
									height: 40,
									background: 'rgba(255,255,255,0.15)',
									borderRadius: 8,
									transform: `scale(${dockScale})`,
								}}
							/>
						);
					})}
				</div>
			</div>
		</AbsoluteFill>
	);
};

const SceneBlackScreen = () => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 30], [1, 0], {
		extrapolateRight: 'clamp',
	});

	return <AbsoluteFill style={{ background: 'black', opacity }} />;
};

const SceneLogo = () => {
	return (
		<AbsoluteFill style={{ background: 'black' }}>
			<Logo />
			<LoadingSpinner />
		</AbsoluteFill>
	);
};

const SceneWelcome = () => {
	const frame = useCurrentFrame();
	const bgOpacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
					opacity: bgOpacity,
				}}
			/>
			<WelcomeText />
		</AbsoluteFill>
	);
};

const SceneDesktop = () => {
	return <Desktop />;
};

export const BootAnimation = () => {
	const { fps } = useVideoConfig();

	return (
		<AbsoluteFill style={{ background: 'black' }}>
			<Sequence from={0} durationInFrames={2 * fps} premountFor={fps}>
				<SceneBlackScreen />
			</Sequence>
			<Sequence from={2 * fps} durationInFrames={3 * fps} premountFor={fps}>
				<SceneLogo />
			</Sequence>
			<Sequence from={5 * fps} durationInFrames={2 * fps} premountFor={fps}>
				<SceneWelcome />
			</Sequence>
			<Sequence from={7 * fps} premountFor={fps}>
				<SceneDesktop />
			</Sequence>
		</AbsoluteFill>
	);
};