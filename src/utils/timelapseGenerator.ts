// Generates a smooth, fast-forward 5-second Timelapse video in MP4/WebM format

export async function create5sTimelapse(
  snapshots: string[],
  width = 640,
  height = 480
): Promise<Blob | null> {
  if (!snapshots || snapshots.length === 0) return null;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(null);
      return;
    }

    const TARGET_FRAMES = 120;
    const FPS = 24;
    const frameInterval = 1000 / FPS;

    const stream = canvas.captureStream(FPS);

    // Prioritize MP4 for iOS & Mobile compatibility, fallback to WebM
    let mimeType = 'video/mp4';
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      // Determine final blob type (use video/mp4 if recorded as mp4)
      const isMp4 = mimeType.includes('mp4');
      resolve(new Blob(chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' }));
    };

    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    snapshots.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === snapshots.length) {
          startRendering();
        }
      };
      img.src = src;
      loadedImages.push(img);
    });

    function startRendering() {
      recorder.start();
      let frameIndex = 0;

      const timer = setInterval(() => {
        if (frameIndex >= TARGET_FRAMES) {
          clearInterval(timer);
          recorder.stop();
          return;
        }

        const snapshotIndex = Math.floor((frameIndex / TARGET_FRAMES) * loadedImages.length);
        const currentImg = loadedImages[snapshotIndex];

        if (currentImg && ctx) {
          ctx.drawImage(currentImg, 0, 0, width, height);
        }

        frameIndex++;
      }, frameInterval);
    }
  });
}