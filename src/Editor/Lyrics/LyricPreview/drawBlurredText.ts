import { Canvas, SceneCanvas } from "konva/lib/Canvas";
import { Context, SceneContext } from "konva/lib/Context";
import { Text } from "konva/lib/shapes/Text";
import { Blur } from "konva/lib/filters/Blur";

const BLUR_BUFFER_MAX_DIMENSION = 1280;
const MIN_SAMPLED_BLUR_RADIUS = 6;

// One reusable surface per output canvas, shared by all blurred text nodes.
// Its size depends on the viewport and blur margin, never the zoomed text box.
const surfaces = new WeakMap<HTMLCanvasElement, {
  canvas: Canvas;
  width: number;
  height: number;
  nativeBlur: boolean;
}>();

function createBlurCanvas(width: number, height: number, nativeBlur: boolean) {
  if (nativeBlur) return new SceneCanvas({ width, height, pixelRatio: 1 });

  // Context options only take effect on the FIRST getContext call. Create the
  // readback context before Konva wraps it, and leave the display canvas alone.
  const canvas = new Canvas({ pixelRatio: 1 });
  canvas._canvas.getContext("2d", { willReadFrequently: true });
  canvas.context = new SceneContext(canvas);
  canvas.setSize(width, height);
  return canvas;
}

export function drawBlurredText(this: Text, context: Context) {
  const output = context._context;
  const transform = output.getTransform();
  const scale = Math.max(
    Math.hypot(transform.a, transform.b),
    Math.hypot(transform.c, transform.d)
  );
  const radius = Number(this.getAttr("blurRadius") ?? 0) * scale;
  if (!(radius > 0.2)) {
    Text.prototype._sceneFunc.call(this, context);
    return;
  }

  // Stack blur's triangular kernel has sigma ~= radius / sqrt(6). Native
  // canvas filtering avoids JS pixel readback in supported browsers.
  const nativeBlur = "filter" in output;
  const width = output.canvas.width;
  const height = output.canvas.height;
  // Strong CPU blur needs little fine detail. Aim for a 720p-sized working
  // image, smoothly restoring resolution as focus approaches sharpness. The
  // native path already avoids CPU readback and retains its original quality.
  const renderScale = nativeBlur ? 1 : Math.min(1, Math.max(
    BLUR_BUFFER_MAX_DIMENSION / Math.max(width, height, 1),
    MIN_SAMPLED_BLUR_RADIUS / radius
  ));
  const sampledRadius = radius * renderScale;
  const passes = Math.max(1, Math.ceil((sampledRadius / 180) ** 2));
  const passRadius = sampledRadius / Math.sqrt(passes);
  const sigma = radius / Math.sqrt(6);
  const neededMargin = Math.ceil(nativeBlur
    ? sigma * 3 + 2
    : (passes * Math.round(passRadius) + 2) / renderScale);

  // Work in physical screen pixels so camera zoom cannot create unbounded
  // text textures. Leave room for glyph overhang beyond Konva's layout box,
  // then include the actual screen-space shadow before adding blur padding.
  const bounds = this.getClientRect({ skipTransform: true, skipShadow: true });
  const overhang = this.fontSize();
  const left = bounds.x - overhang;
  const top = bounds.y - overhang;
  const right = bounds.x + bounds.width + overhang;
  const bottom = bounds.y + bounds.height + overhang;
  const corners = [[left, top], [right, top], [left, bottom], [right, bottom]];
  const xs = corners.map(([x, y]) => transform.a * x + transform.c * y + transform.e);
  const ys = corners.map(([x, y]) => transform.b * x + transform.d * y + transform.f);
  const shadowPadding = output.shadowBlur * 3;
  // Align the crop to the intermediate pixel grid to keep sampling stable as
  // text moves. Keep all scene positions and the destination in screen pixels.
  const x = Math.floor(Math.max(-neededMargin,
    Math.min(...xs) + Math.min(0, output.shadowOffsetX) - shadowPadding - neededMargin) * renderScale) / renderScale;
  const y = Math.floor(Math.max(-neededMargin,
    Math.min(...ys) + Math.min(0, output.shadowOffsetY) - shadowPadding - neededMargin) * renderScale) / renderScale;
  const endX = Math.ceil(Math.min(width + neededMargin,
    Math.max(...xs) + Math.max(0, output.shadowOffsetX) + shadowPadding + neededMargin) * renderScale) / renderScale;
  const endY = Math.ceil(Math.min(height + neededMargin,
    Math.max(...ys) + Math.max(0, output.shadowOffsetY) + shadowPadding + neededMargin) * renderScale) / renderScale;
  if (endX <= 0 || endY <= 0 || x >= width || y >= height) return;
  const regionWidth = endX - x;
  const regionHeight = endY - y;
  const sampledWidth = Math.round(regionWidth * renderScale);
  const sampledHeight = Math.round(regionHeight * renderScale);

  let surface = surfaces.get(output.canvas);
  const margin = Math.ceil(neededMargin / 64) * 64;
  const samplingPadding = renderScale < 1 ? 2 : 0;
  const bufferWidth = Math.ceil((width + margin * 2) * renderScale) + samplingPadding;
  const bufferHeight = Math.ceil((height + margin * 2) * renderScale) + samplingPadding;
  if (!surface || surface.width !== width || surface.height !== height ||
      surface.canvas.width < bufferWidth || surface.canvas.height < bufferHeight ||
      surface.nativeBlur !== nativeBlur) {
    // Grow in buckets and reuse during focus changes instead of reallocating
    // on every small change in sampling scale.
    surface = {
      canvas: createBlurCanvas(
        nativeBlur ? bufferWidth : Math.ceil(bufferWidth / 64) * 64,
        nativeBlur ? bufferHeight : Math.ceil(bufferHeight / 64) * 64,
        nativeBlur
      ),
      width, height, nativeBlur,
    };
    surfaces.set(output.canvas, surface);
  }
  const { canvas } = surface;
  const scratch = canvas.getContext();
  const raw = scratch._context;
  // Reuse the allocation, but clear/read/blur/composite only this item's area.
  raw.clearRect(0, 0, sampledWidth, sampledHeight);
  raw.save();
  raw.setTransform(transform.a * renderScale, transform.b * renderScale,
    transform.c * renderScale, transform.d * renderScale,
    (transform.e - x) * renderScale, (transform.f - y) * renderScale);
  raw.globalAlpha = output.globalAlpha;
  raw.shadowColor = output.shadowColor;
  raw.shadowBlur = output.shadowBlur * renderScale;
  raw.shadowOffsetX = output.shadowOffsetX * renderScale;
  raw.shadowOffsetY = output.shadowOffsetY * renderScale;
  raw.lineJoin = output.lineJoin;
  // Preserve Konva's typography, gradients, wrapping, stroke and shadow logic.
  Text.prototype._sceneFunc.call(this, scratch);
  raw.restore();

  output.save();
  output.setTransform(1, 0, 0, 1, 0, 0);
  output.globalAlpha = 1;
  output.shadowColor = "transparent";
  output.shadowBlur = 0;
  if (nativeBlur) {
    output.filter = `blur(${sigma}px)`;
  } else {
    // Split large sampled kernels to stay within Konva's lookup table.
    const pixels = raw.getImageData(0, 0, sampledWidth, sampledHeight);
    for (let i = 0; i < passes; i++) {
      Blur.call({ blurRadius: () => passRadius } as Text, pixels);
    }
    raw.putImageData(pixels, 0, 0);
  }
  if (renderScale < 1) {
    output.imageSmoothingEnabled = true;
    output.imageSmoothingQuality = "high";
  }
  output.drawImage(canvas._canvas, 0, 0, sampledWidth, sampledHeight,
    x, y, regionWidth, regionHeight);
  output.restore();
}
