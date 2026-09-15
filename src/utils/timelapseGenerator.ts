// Generates a smooth, fast-forward 5-second Timelapse video from captured snapshots

export async function create5sTimelapse(
  snapshots: string[],
  width = 640,
  height = 480,
): Promise<Blob | null> {
  if (!snapshots || snapshots.length === 0) return null;

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve(null);
      return;
    }

    // Target duration: ~5 seconds at 24 frames per second -> total 120 target frames
    const TARGET_FRAMES = 120;
    const FPS = 24;
    const frameInterval = 1000 / FPS;

    const stream = canvas.captureStream(FPS);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };

    // Preload snapshots into Image elements
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

        // Map target frame (0..120) to captured snapshot index
        const snapshotIndex = Math.floor(
          (frameIndex / TARGET_FRAMES) * loadedImages.length,
        );
        const currentImg = loadedImages[snapshotIndex];

        if (currentImg && ctx) {
          ctx.drawImage(currentImg, 0, 0, width, height);
        }

        frameIndex++;
      }, frameInterval);
    }
  });
}
