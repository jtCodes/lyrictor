import { useLayoutEffect, useRef } from "react";
import { Layer } from "react-konva";
import type Konva from "konva";
import type { ComponentProps } from "react";
import { acquireUpscaler } from "./SpatialUpscaler";
import { previewResolution } from "./previewResolution";
import { usePreviewUpscaling } from "./store";
import { renderResourceBudget } from "../renderResourceBudget";

/** Only scene pixels are reduced. Konva's logical coordinates and hit canvas
 * stay unchanged, and selection/grid layers continue to use the native Layer. */
export default function PreviewSceneLayer({ native = false, ...props }: ComponentProps<typeof Layer> & { native?: boolean }) {
  const ref = useRef<Konva.Layer>(null);
  const enabled = usePreviewUpscaling(state => state.enabled && !state.exporting);
  useLayoutEffect(() => {
    const layer = ref.current;
    if (!layer || !enabled || native) return;
    return attachPreviewUpscaling(layer);
  }, [enabled, native]);
  return <Layer {...props} ref={ref} />;
}

/** Shared lifecycle adapter, driven exclusively by Konva draw events. */
export function attachPreviewUpscaling(layer: Konva.Layer) {
    const canvas = layer.getCanvas();
    const source = canvas._canvas;
    const originalRatio = canvas.getPixelRatio();
    const originalOpacity = source.style.opacity;
    const destination = document.createElement("canvas");
    destination.dataset.previewUpscale = "true";
    destination.setAttribute("aria-hidden", "true");
    Object.assign(destination.style, { position: "absolute", top: "0", left: "0", pointerEvents: "none" });
    let lease: ReturnType<typeof acquireUpscaler> | undefined;
    let failed = false;
    let updating = false;
    function reset() {
      source.style.opacity = originalOpacity;
      destination.remove();
      destination.width = destination.height = 0;
      renderResourceBudget.release(destination);
      lease?.release(); lease = undefined;
    }
    function beforeDraw() {
      if (updating || failed) return;
      const width = layer.width(), height = layer.height();
      const target = previewResolution(width, height, window.devicePixelRatio);
      const ratio = Math.min(originalRatio, target.ratio);
      if (canvas.getPixelRatio() !== ratio) canvas.setPixelRatio(ratio);
    }
    function draw() {
      if (updating || failed) return;
      const width = layer.width(), height = layer.height();
      if (width <= 0 || height <= 0 || !source.parentElement) return;
      if (canvas.getPixelRatio() >= originalRatio) { reset(); return; }
      try {
        lease ??= acquireUpscaler();
        const outputWidth = Math.ceil(width * originalRatio), outputHeight = Math.ceil(height * originalRatio);
        if (!renderResourceBudget.reserve(destination, outputWidth * outputHeight * 4)) throw new Error("Preview output budget reached");
        if (destination.width !== outputWidth || destination.height !== outputHeight) {
          destination.width = outputWidth; destination.height = outputHeight;
        }
        destination.style.width = `${width}px`; destination.style.height = `${height}px`;
        destination.style.display = source.style.display;
        lease.renderer.draw(source, destination);
        // Konva may reorder its source canvas. Keep its output immediately
        // alongside it, below native interaction overlays.
        if (source.nextSibling !== destination) source.after(destination);
        source.style.opacity = "0";
      } catch (error) {
        failed = true;
        reset();
        console.warn("Preview upscaling unavailable; using native rendering.", error);
        updating = true;
        canvas.setPixelRatio(originalRatio);
        layer.draw();
        updating = false;
      }
    }
    layer.on("beforeDraw.previewUpscale", beforeDraw);
    layer.on("draw.previewUpscale", draw);
    layer.draw();
    return () => {
      layer.off(".previewUpscale");
      reset();
      canvas.setPixelRatio(originalRatio);
      layer.batchDraw();
    };
}
