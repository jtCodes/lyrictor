import { useCallback, useRef, useState } from "react";
import { Howler } from "howler";
import { VideoAspectRatio } from "../../Project/types";

export type ExportState = "idle" | "exporting" | "done" | "error";

export function useVideoExport() {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [progress, setProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number>(0);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const pauseRef = useRef<(() => void) | null>(null);
  const seekRef = useRef<((time: number) => void) | null>(null);

  const startExport = useCallback(
    async (
      previewElement: HTMLElement,
      seek: (time: number) => void,
      play: () => void,
      pause: () => void,
      duration: number,
      projectName: string,
      resolution: VideoAspectRatio
    ) => {
      try {
        setExportState("exporting");
        setProgress(0);
        chunksRef.current = [];
        pauseRef.current = pause;
        seekRef.current = seek;

        // Export at 1080p based on project aspect ratio
        const isVertical = resolution === VideoAspectRatio["9/16"];
        const width = isVertical ? 1080 : 1920;
        const height = isVertical ? 1920 : 1080;

        const previewWidth = previewElement.offsetWidth;
        const previewHeight = previewElement.offsetHeight;
        const scaleX = width / previewWidth;
        const scaleY = height / previewHeight;

        // Create offscreen compositing canvas
        const offscreen = document.createElement("canvas");
        offscreen.width = width;
        offscreen.height = height;
        const ctx = offscreen.getContext("2d")!;

        // Find source elements in the preview
        const bgImage = previewElement.querySelector(
          'img[data-modded="true"]'
        ) as HTMLImageElement | null;
        const exportMode = previewElement.getAttribute("data-export-mode");
        const isStaticMode = exportMode === "static";

        // For static mode, create a temp canvas for the blur effect
        let blurCanvas: HTMLCanvasElement | undefined;
        let blurCtx: CanvasRenderingContext2D | undefined;
        if (isStaticMode) {
          blurCanvas = document.createElement("canvas");
          blurCanvas.width = width;
          blurCanvas.height = height;
          blurCtx = blurCanvas.getContext("2d")!;
        }

        // Compositing render loop
        function renderFrame() {
          ctx.clearRect(0, 0, width, height);
          const konvaCanvases = previewElement.querySelectorAll("canvas");

          if (isStaticMode) {
            // STATIC MODE: visualizer → blur → tint → lyrics → edge gradients

            // 1. Draw Konva visualizer canvas, then blur it
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);

            // Draw visualizer to temp canvas, then blur onto main
            if (blurCtx && blurCanvas) {
              blurCtx.clearRect(0, 0, width, height);
              konvaCanvases.forEach((c) => {
                try {
                  blurCtx!.drawImage(c, 0, 0, width, height);
                } catch {
                  // tainted canvas
                }
              });

              // Draw blurred version onto compositing canvas
              ctx.save();
              ctx.filter = "blur(80px) saturate(180%)";
              ctx.drawImage(blurCanvas, 0, 0);
              ctx.restore();
            }

            // 2. Dark tint overlay
            ctx.fillStyle = "rgba(17, 25, 40, 0.30)";
            ctx.fillRect(0, 0, width, height);

            // 3. Render lyrics text from DOM
            const lyricDivs = previewElement.querySelectorAll(
              "[data-lyric-line]"
            );
            const containerRect = previewElement.getBoundingClientRect();

            lyricDivs.forEach((div) => {
              const el = div as HTMLElement;
              const rect = el.getBoundingClientRect();
              const relativeTop = (rect.top - containerRect.top) * scaleY;
              const relativeLeft = (rect.left - containerRect.left) * scaleX;

              // Skip off-screen lyrics
              if (
                relativeTop + rect.height * scaleY < 0 ||
                relativeTop > height
              ) {
                return;
              }

              const computedStyle = window.getComputedStyle(el);
              const fontSize = parseFloat(computedStyle.fontSize) * scaleY;
              const color = computedStyle.color;
              const padding =
                (parseFloat(computedStyle.padding) || 0) * scaleX;

              ctx.save();
              ctx.font = `900 ${fontSize}px "Inter Variable", Inter, sans-serif`;
              ctx.fillStyle = color;
              ctx.textBaseline = "top";
              ctx.textAlign = "center";

              // Word-wrap text within the element width
              const words = el.textContent?.split(" ") || [];
              const scaledWidth = rect.width * scaleX;
              const maxWidth = scaledWidth - padding * 2;
              const centerX = relativeLeft + scaledWidth / 2;
              let line = "";
              let y = relativeTop + padding;
              const lineHeight = fontSize * 1.3;

              for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + " ";
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && i > 0) {
                  ctx.fillText(line.trim(), centerX, y);
                  line = words[i] + " ";
                  y += lineHeight;
                } else {
                  line = testLine;
                }
              }
              ctx.fillText(line.trim(), centerX, y);
              ctx.restore();
            });

            // 4. Top edge gradient overlay
            const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.3);
            topGrad.addColorStop(0, "rgba(17, 25, 40, 0.75)");
            topGrad.addColorStop(1, "rgba(17, 25, 40, 0)");
            ctx.fillStyle = topGrad;
            ctx.fillRect(0, 0, width, height * 0.3);

            // 5. Bottom edge gradient overlay
            const bottomGrad = ctx.createLinearGradient(
              0,
              height * 0.5,
              0,
              height
            );
            bottomGrad.addColorStop(0, "rgba(17, 25, 40, 0)");
            bottomGrad.addColorStop(1, "rgba(17, 25, 40, 0.75)");
            ctx.fillStyle = bottomGrad;
            ctx.fillRect(0, height * 0.5, width, height * 0.5);
          } else {
            // FREE MODE: background image → dark overlay → Konva canvases (visualizer + text)

            // 1. Fill black base
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(0, 0, width, height);

            // 2. Draw background image (album art) if present
            if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
              const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
              const canvasRatio = width / height;
              const imageOpacity = Number.parseFloat(
                window.getComputedStyle(bgImage).opacity
              );
              let sx = 0,
                sy = 0,
                sw = bgImage.naturalWidth,
                sh = bgImage.naturalHeight;
              if (imgRatio > canvasRatio) {
                sw = bgImage.naturalHeight * canvasRatio;
                sx = (bgImage.naturalWidth - sw) / 2;
              } else {
                sh = bgImage.naturalWidth / canvasRatio;
                sy = (bgImage.naturalHeight - sh) / 2;
              }
              ctx.save();
              ctx.globalAlpha = Number.isFinite(imageOpacity)
                ? imageOpacity
                : 1;
              ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, width, height);
              ctx.restore();
            }

            // 3. Draw dark overlay
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(0, 0, width, height);

            // 4. Draw all Konva canvases (visualizer + text layers)
            konvaCanvases.forEach((c) => {
              try {
                ctx.drawImage(c, 0, 0, width, height);
              } catch {
                // cross-origin or tainted canvas
              }
            });
          }

          animFrameRef.current = requestAnimationFrame(renderFrame);
        }

        // Start compositing loop
        renderFrame();

        // Capture video stream from compositing canvas
        const videoStream = offscreen.captureStream(30);

        // Capture audio from Howler's AudioContext
        const audioCtx = Howler.ctx;
        const dest = audioCtx.createMediaStreamDestination();
        audioDestRef.current = dest;
        Howler.masterGain.connect(dest);

        // Mute speakers during export (audio still records via dest)
        Howler.masterGain.disconnect(audioCtx.destination);

        // Merge video + audio streams
        const combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);

        // Determine best supported codec
        const mimeType = MediaRecorder.isTypeSupported(
          "video/webm; codecs=vp9,opus"
        )
          ? "video/webm; codecs=vp9,opus"
          : MediaRecorder.isTypeSupported("video/webm; codecs=vp8,opus")
          ? "video/webm; codecs=vp8,opus"
          : "video/webm";

        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 5_000_000,
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          cancelAnimationFrame(animFrameRef.current);
          try {
            Howler.masterGain.disconnect(dest);
          } catch {
            // already disconnected
          }
          // Restore audio to speakers
          try {
            Howler.masterGain.connect(audioCtx.destination);
          } catch {
            // already connected
          }

          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${projectName || "lyrictor-export"}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          pause();
          seek(0);
          setExportState("done");
          setProgress(100);
        };

        mediaRecorder.onerror = () => {
          cancelAnimationFrame(animFrameRef.current);
          try {
            Howler.masterGain.disconnect(dest);
          } catch {
            // already disconnected
          }
          // Restore audio to speakers
          try {
            Howler.masterGain.connect(audioCtx.destination);
          } catch {
            // already connected
          }
          pause();
          seek(0);
          setExportState("error");
        };

        // Seek to start and begin
        pause();
        seek(0);

        // Small delay for seek to settle
        await new Promise((r) => setTimeout(r, 300));

        mediaRecorder.start(1000);
        play();

        // Track progress
        const progressInterval = setInterval(() => {
          const howl = (Howler as any)._howls?.[0];
          const currentTime = howl?.seek() ?? 0;
          if (typeof currentTime === "number" && duration > 0) {
            setProgress(Math.min(99, (currentTime / duration) * 100));
          }
        }, 500);

        // Wait for audio to end, then stop recording
        const checkEnd = setInterval(() => {
          const howl = (Howler as any)._howls?.[0];
          const currentTime = howl?.seek() ?? 0;
          if (
            typeof currentTime === "number" &&
            duration > 0 &&
            currentTime >= duration - 0.3
          ) {
            clearInterval(checkEnd);
            clearInterval(progressInterval);
            setTimeout(() => {
              if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== "inactive"
              ) {
                mediaRecorderRef.current.stop();
              }
            }, 500);
          }
        }, 200);
      } catch (err) {
        console.error("Export error:", err);
        setExportState("error");
      }
    },
    []
  );

  const cancelExport = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    // Restore audio to speakers
    try {
      if (audioDestRef.current) {
        Howler.masterGain.disconnect(audioDestRef.current);
      }
      Howler.masterGain.connect(Howler.ctx.destination);
    } catch {
      // already connected
    }
    pauseRef.current?.();
    seekRef.current?.(0);
    setExportState("idle");
    setProgress(0);
  }, []);

  return { exportState, progress, startExport, cancelExport };
}
