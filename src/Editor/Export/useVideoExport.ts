import { useCallback, useRef, useState } from "react";
import { Howler } from "howler";
import { ToastQueue } from "@react-spectrum/toast";
import { VideoAspectRatio } from "../../Project/types";

export type ExportState = "idle" | "exporting" | "done" | "error";

/**
 * CSS properties inlined into cloned elements so that SVG foreignObject rendering
 * (which has no access to the page's stylesheets) picks up all visual styling.
 */
const HTML_CANVAS_INLINE_PROPS = [
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant",
  "letter-spacing",
  "line-height",
  "text-align",
  "text-decoration",
  "text-shadow",
  "text-transform",
  "white-space",
  "word-break",
  "overflow-wrap",
  "opacity",
  "background-color",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "width",
  "height",
  "min-height",
  "max-height",
  "box-sizing",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "display",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "flex",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "overflow",
  "transform",
  "transform-origin",
] as const;

/** Recursively snapshot computed styles from a live element tree into its deep clone. */
function inlineComputedStyles(source: Element, target: Element): void {
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement))
    return;

  const computed = window.getComputedStyle(source);
  const styles = HTML_CANVAS_INLINE_PROPS.map(
    (prop) => `${prop}:${computed.getPropertyValue(prop)}`
  ).filter((decl) => !decl.endsWith(":"));

  target.style.cssText = styles.join(";");

  for (let i = 0; i < source.children.length; i++) {
    if (i < target.children.length) {
      inlineComputedStyles(source.children[i], target.children[i]);
    }
  }
}

/**
 * Render an HTMLElement to an offscreen canvas using the SVG foreignObject technique.
 * This is a practical approximation of the proposed html-in-canvas API:
 * https://github.com/wicg/html-in-canvas
 *
 * The element is deep-cloned with fully inlined computed styles so that the
 * SVG renderer (which cannot access the page stylesheets) faithfully reproduces
 * fonts, colors, opacity, transforms, and layout.
 *
 * Returns a canvas at `renderWidth × renderHeight` pixels, or null on failure.
 */
function renderHtmlElementToCanvas(
  el: HTMLElement,
  renderWidth: number,
  renderHeight: number,
  displayWidth: number,
  displayHeight: number
): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    try {
      const clone = el.cloneNode(true) as HTMLElement;
      inlineComputedStyles(el, clone);

      // Remove mask-image — SVG foreignObject in canvas does not reliably support CSS masks.
      // Edge fading is handled by the top/bottom gradient overlays later in the export pipeline.
      clone.style.setProperty("-webkit-mask-image", "none");
      clone.style.setProperty("mask-image", "none");
      clone.style.overflow = "hidden";
      clone.style.width = `${displayWidth}px`;
      clone.style.height = `${displayHeight}px`;
      clone.style.position = "relative";
      clone.style.top = "0";
      clone.style.left = "0";

      const svgStr = [
        `<svg xmlns="http://www.w3.org/2000/svg"`,
        ` width="${displayWidth}" height="${displayHeight}">`,
        `<foreignObject x="0" y="0"`,
        ` width="${displayWidth}" height="${displayHeight}">`,
        `<div xmlns="http://www.w3.org/1999/xhtml">`,
        clone.outerHTML,
        `</div>`,
        `</foreignObject>`,
        `</svg>`,
      ].join("");

      const blob = new Blob([svgStr], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        try {
          const offscreen = document.createElement("canvas");
          offscreen.width = renderWidth;
          offscreen.height = renderHeight;
          const offCtx = offscreen.getContext("2d");
          if (offCtx) {
            offCtx.drawImage(img, 0, 0, renderWidth, renderHeight);
          }
          URL.revokeObjectURL(url);
          resolve(offscreen);
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export function useVideoExport() {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [progress, setProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number>(0);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const pauseRef = useRef<(() => void) | null>(null);
  const seekRef = useRef<((time: number) => void) | null>(null);

  const failExport = useCallback(
    (message: string, error?: unknown) => {
      if (error) {
        console.error("Export error:", error);
      }

      cancelAnimationFrame(animFrameRef.current);

      try {
        if (audioDestRef.current) {
          Howler.masterGain.disconnect(audioDestRef.current);
        }
        if (Howler.ctx?.destination) {
          Howler.masterGain.connect(Howler.ctx.destination);
        }
      } catch {
        // audio graph already restored
      }

      pauseRef.current?.();
      seekRef.current?.(0);
      setProgress(0);
      setExportState("error");
      ToastQueue.negative(message, { timeout: 5000 });
    },
    []
  );

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

        function drawImageLayer(
          targetCtx: CanvasRenderingContext2D,
          image: HTMLImageElement
        ) {
          if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
            return;
          }

          const imgRatio = image.naturalWidth / image.naturalHeight;
          const canvasRatio = width / height;
          const imageOpacity = Number.parseFloat(
            window.getComputedStyle(image).opacity
          );

          let sx = 0;
          let sy = 0;
          let sw = image.naturalWidth;
          let sh = image.naturalHeight;

          if (imgRatio > canvasRatio) {
            sw = image.naturalHeight * canvasRatio;
            sx = (image.naturalWidth - sw) / 2;
          } else {
            sh = image.naturalWidth / canvasRatio;
            sy = (image.naturalHeight - sh) / 2;
          }

          targetCtx.save();
          targetCtx.globalAlpha = Number.isFinite(imageOpacity)
            ? imageOpacity
            : 1;
          targetCtx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
          targetCtx.restore();
        }

        function drawNonTextLayers(targetCtx: CanvasRenderingContext2D) {
          const layerElements = Array.from(
            previewElement.querySelectorAll("[data-export-non-text-layer]")
          ) as HTMLElement[];

          layerElements.forEach((layerElement) => {
            const layerOpacity = Number.parseFloat(
              window.getComputedStyle(layerElement).opacity
            );
            const layerType = layerElement.getAttribute("data-export-non-text-layer");

            targetCtx.save();
            targetCtx.globalAlpha = Number.isFinite(layerOpacity)
              ? layerOpacity
              : 1;

            if (layerType === "image") {
              const image = layerElement.querySelector(
                'img[data-modded="true"]'
              ) as HTMLImageElement | null;

              if (image) {
                drawImageLayer(targetCtx, image);
              }

              targetCtx.restore();

              return;
            }

            const canvas = layerElement.querySelector("canvas") as
              | HTMLCanvasElement
              | null;

            if (!canvas) {
              targetCtx.restore();
              return;
            }

            try {
              targetCtx.drawImage(canvas, 0, 0, width, height);
            } catch {
              // cross-origin or tainted canvas
            }

            targetCtx.restore();
          });
        }

        function drawTextStages(targetCtx: CanvasRenderingContext2D) {
          const textStageCanvases = Array.from(
            previewElement.querySelectorAll("[data-export-text-stage] canvas")
          ) as HTMLCanvasElement[];

          textStageCanvases.forEach((canvas) => {
            try {
              targetCtx.drawImage(canvas, 0, 0, width, height);
            } catch {
              // cross-origin or tainted canvas
            }
          });
        }

        // HTML-to-canvas overlay state for static mode
        // Approximates the proposed ctx.drawElement() from the html-in-canvas spec:
        // https://github.com/wicg/html-in-canvas
        let lyricsOverlayCanvas: HTMLCanvasElement | null = null;
        let lyricsRenderPending = false;
        const lyricsContainer = isStaticMode
          ? previewElement.querySelector<HTMLElement>(
              "[data-lyric-scroll-container]"
            )
          : null;

        async function refreshLyricsOverlay(): Promise<void> {
          if (lyricsRenderPending || !lyricsContainer) return;
          lyricsRenderPending = true;
          try {
            const canvas = await renderHtmlElementToCanvas(
              lyricsContainer,
              width,
              height,
              previewWidth,
              previewHeight
            );
            if (canvas) lyricsOverlayCanvas = canvas;
          } finally {
            lyricsRenderPending = false;
          }
        }

        // Pre-render lyrics overlay so the first captured frame already has lyrics
        if (isStaticMode && lyricsContainer) {
          await refreshLyricsOverlay();
        }

        // Compositing render loop
        function renderFrame() {
          ctx.clearRect(0, 0, width, height);

          if (isStaticMode) {
            // STATIC MODE: visualizer → blur → tint → lyrics → edge gradients

            // 1. Draw Konva visualizer canvas, then blur it
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);

            // Draw visualizer to temp canvas, then blur onto main
            if (blurCtx && blurCanvas) {
              blurCtx.clearRect(0, 0, width, height);
              drawNonTextLayers(blurCtx);

              // Draw blurred version onto compositing canvas
              ctx.save();
              ctx.filter = "blur(80px) saturate(180%)";
              ctx.drawImage(blurCanvas, 0, 0);
              ctx.restore();
            }

            // 2. Dark tint overlay
            ctx.fillStyle = "rgba(17, 25, 40, 0.30)";
            ctx.fillRect(0, 0, width, height);

            // 3. Render lyrics using HTML-to-canvas (approximates html-in-canvas proposal).
            //    Queue an async refresh each frame so the overlay tracks lyric scroll state.
            //    Falls back to manual canvas text drawing when the overlay is unavailable.
            refreshLyricsOverlay().catch(() => {
              // Failures are non-fatal: the fallback manual text path below will be
              // used until a successful render populates lyricsOverlayCanvas.
            });

            if (lyricsOverlayCanvas) {
              ctx.drawImage(lyricsOverlayCanvas, 0, 0, width, height);
            } else {
              // Fallback: manual canvas text rendering
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
                const fontWeight = computedStyle.fontWeight || "700";
                const fontFamily =
                  computedStyle.fontFamily ||
                  '"Inter Variable", Inter, sans-serif';
                const color = computedStyle.color;
                const opacity = Number.parseFloat(computedStyle.opacity);
                const padding =
                  (parseFloat(computedStyle.padding) || 0) * scaleX;
                const letterSpacing = computedStyle.letterSpacing;

                ctx.save();
                ctx.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
                ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                if (
                  letterSpacing &&
                  letterSpacing !== "normal" &&
                  "letterSpacing" in ctx
                ) {
                  type CtxWithLetterSpacing = CanvasRenderingContext2D & {
                    letterSpacing: string;
                  };
                  (ctx as CtxWithLetterSpacing).letterSpacing = `${parseFloat(letterSpacing) * scaleX}px`;
                }
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
            }

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

            // 2. Draw non-text layers in timeline stack order
            drawNonTextLayers(ctx);

            // 3. Draw dark overlay
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(0, 0, width, height);

            // 4. Draw lyric/text stages above the non-text stack
            drawTextStages(ctx);
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

        mediaRecorder.onerror = (event) => {
          failExport("Export failed while recording the video.", event);
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
        const message =
          err instanceof DOMException && err.name === "SecurityError"
            ? "Export failed because one of the visual layers uses media the browser cannot capture."
            : err instanceof Error && err.message
              ? err.message
              : "Export failed. Please try again.";

        failExport(message, err);
      }
    },
    [failExport]
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
