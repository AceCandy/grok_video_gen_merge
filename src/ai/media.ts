export const asDataUrlFromBase64 = (base64: string, mimeType: string) => {
	return `data:${mimeType};base64,${base64}`;
};

export const base64ToBlob = async (base64: string, mimeType: string): Promise<Blob> => {
	const dataUrl = asDataUrlFromBase64(base64, mimeType);
	const res = await fetch(dataUrl);
	return await res.blob();
};

export const base64ToObjectUrl = async (base64: string, mimeType: string) => {
	const blob = await base64ToBlob(base64, mimeType);
	return URL.createObjectURL(blob);
};

export const extractLastFrameAsDataUrl = async (videoSrc: string): Promise<string> => {
	// Uses the browser's decoder (works best with Blob/object URLs).
	return await new Promise<string>((resolve, reject) => {
		const video = document.createElement('video');
		video.crossOrigin = 'anonymous';
		video.muted = true;
		video.playsInline = true;
		video.preload = 'auto';
		video.src = videoSrc;

		const cleanup = () => {
			video.remove();
		};

		const onError = () => {
			cleanup();
			reject(new Error('无法加载视频用于抽帧（可能是 CORS 或格式问题）'));
		};

		video.addEventListener('error', onError, { once: true });
		video.addEventListener(
			'loadedmetadata',
			() => {
				const duration = video.duration;
				if (!Number.isFinite(duration) || duration <= 0) {
					cleanup();
					reject(new Error('视频 duration 无效，无法抽取最后一帧'));
					return;
				}

				const seekTime = Math.max(0, duration - 0.05);
				const onSeeked = () => {
					try {
						const canvas = document.createElement('canvas');
						canvas.width = video.videoWidth;
						canvas.height = video.videoHeight;
						const ctx = canvas.getContext('2d');
						if (!ctx) {
							cleanup();
							reject(new Error('无法创建 canvas 2D context'));
							return;
						}

						ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
						const dataUrl = canvas.toDataURL('image/png');
						cleanup();
						resolve(dataUrl);
					} catch (err) {
						cleanup();
						reject(err instanceof Error ? err : new Error(String(err)));
					}
				};

				video.addEventListener('seeked', onSeeked, { once: true });
				try {
					video.currentTime = seekTime;
				} catch (err) {
					cleanup();
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			},
			{ once: true }
		);

		// Some browsers require the element to be in DOM.
		video.style.position = 'fixed';
		video.style.left = '-99999px';
		video.style.top = '0';
		document.body.appendChild(video);
	});
};
