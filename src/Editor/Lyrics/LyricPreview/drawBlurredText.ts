import { Canvas, SceneCanvas } from "konva/lib/Canvas";
import { Context, SceneContext } from "konva/lib/Context";
import { Text } from "konva/lib/shapes/Text";
import { Blur } from "konva/lib/filters/Blur";
import { blurCacheKey, drawCachedBlur, canCacheBlur, canPrepareBlur, canRetainPreparedBlur, supportsBlurPreparation, hasPreparedBlur, storeBlur, shouldStoreRenderedBlur, prepareBlur, type BlurSnapshot } from "./blurCache";

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
  renderBlurredText(this, context, false);
}

export function preRenderBlurredText(node: Text, measureOnly = false) {
  const canvas = node.getLayer()?.getCanvas();
  if (!canvas) return false;
  const context = canvas.getContext();
  if (Reflect.has(context._context, "filter")) return measureOnly ? 0 : true;
  const ratio = canvas.getPixelRatio();
  const matrix = node.getAbsoluteTransform().getMatrix();
  context._context.save();
  context._context.setTransform(matrix[0]*ratio, matrix[1]*ratio, matrix[2]*ratio,
    matrix[3]*ratio, matrix[4]*ratio, matrix[5]*ratio);
  context._context.globalAlpha = node.getAbsoluteOpacity();
  context._context.shadowColor = "transparent";
  context._context.shadowBlur = 0;
  context._context.shadowOffsetX = context._context.shadowOffsetY = 0;
  context._context.lineJoin = node.lineJoin();
  try { return renderBlurredText(node, context, true, measureOnly); }
  finally { context._context.restore(); }
}

function renderBlurredText(node: Text, context: Context, prepareOnly: boolean, measureOnly = false) {
  const output = context._context;
  const transform = output.getTransform();
  const scale = Math.max(
    Math.hypot(transform.a, transform.b),
    Math.hypot(transform.c, transform.d)
  );
  const radius = Number(node.getAttr("blurRadius") ?? 0) * scale;
  if (!(radius > 0.2)) {
    if (!prepareOnly) Text.prototype._sceneFunc.call(node, context);
    return measureOnly ? 0 : true;
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
  const key = nativeBlur ? undefined : blurCacheKey(node, output, radius, renderScale);
  const matrix: BlurSnapshot["matrix"] = [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f];
  if (prepareOnly && !measureOnly && (!key || hasPreparedBlur(node, key, matrix) || !supportsBlurPreparation())) return true;
  if (!prepareOnly && key && drawCachedBlur(node, output, key, matrix)) return true;
  if (prepareOnly && !measureOnly && !canPrepareBlur()) return false;
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
  const bounds = node.getClientRect({ skipTransform: true, skipShadow: true });
  const overhang = node.fontSize();
  const left = bounds.x - overhang;
  const top = bounds.y - overhang;
  const right = bounds.x + bounds.width + overhang;
  const bottom = bounds.y + bounds.height + overhang;
  const corners = [[left, top], [right, top], [left, bottom], [right, bottom]];
  const xs = corners.map(([x, y]) => transform.a * x + transform.c * y + transform.e);
  const ys = corners.map(([x, y]) => transform.b * x + transform.d * y + transform.f);
  const shadowPadding = output.shadowBlur * 3;
  const desiredPadding = Math.min(256, Math.max(width, height) * 0.1);
  const capturePadding = key && canCacheBlur(
    (width+2*(neededMargin+desiredPadding))*renderScale,
    (height+2*(neededMargin+desiredPadding))*renderScale
  ) ? desiredPadding : 0;
  const leftEdge = Math.min(...xs) + Math.min(0, output.shadowOffsetX) - shadowPadding - neededMargin;
  const topEdge = Math.min(...ys) + Math.min(0, output.shadowOffsetY) - shadowPadding - neededMargin;
  const rightEdge = Math.max(...xs) + Math.max(0, output.shadowOffsetX) + shadowPadding + neededMargin;
  const bottomEdge = Math.max(...ys) + Math.max(0, output.shadowOffsetY) + shadowPadding + neededMargin;
  // Align the crop to the intermediate pixel grid to keep sampling stable as
  // text moves. Keep all scene positions and the destination in screen pixels.
  const x = Math.floor(Math.max(-neededMargin-capturePadding, leftEdge) * renderScale) / renderScale;
  const y = Math.floor(Math.max(-neededMargin-capturePadding, topEdge) * renderScale) / renderScale;
  const endX = Math.ceil(Math.min(width+neededMargin+capturePadding, rightEdge) * renderScale) / renderScale;
  const endY = Math.ceil(Math.min(height+neededMargin+capturePadding, bottomEdge) * renderScale) / renderScale;
  if (endX <= 0 || endY <= 0 || x >= width || y >= height) return measureOnly ? 0 : true;
  const regionWidth = endX - x;
  const regionHeight = endY - y;
  const sampledWidth = Math.round(regionWidth * renderScale);
  const sampledHeight = Math.round(regionHeight * renderScale);
  const snapshot: BlurSnapshot | undefined = key && canCacheBlur(sampledWidth, sampledHeight) ? {
    key, matrix, x, y, width: regionWidth, height: regionHeight, sampledWidth, sampledHeight, margin: neededMargin,
    clipped: { left: leftEdge < x, top: topEdge < y, right: rightEdge > endX, bottom: bottomEdge > endY },
  } : undefined;
  if (measureOnly) return snapshot ? sampledWidth * sampledHeight : 0;
  if (prepareOnly && !snapshot) return true;
  if (prepareOnly && !canRetainPreparedBlur(sampledWidth, sampledHeight)) return true;

  let surface = surfaces.get(output.canvas);
  const margin = Math.ceil(neededMargin / 64) * 64;
  const samplingPadding = renderScale < 1 ? 2 : 0;
  const bufferWidth = Math.ceil((width + (margin+capturePadding) * 2) * renderScale) + samplingPadding;
  const bufferHeight = Math.ceil((height + (margin+capturePadding) * 2) * renderScale) + samplingPadding;
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
  Text.prototype._sceneFunc.call(node, scratch);
  raw.restore();

  if (!nativeBlur) {
    // Split large sampled kernels to stay within Konva's lookup table.
    const pixels = raw.getImageData(0, 0, sampledWidth, sampledHeight);
    if (prepareOnly && snapshot) {
      prepareBlur(node, snapshot, pixels, passRadius, passes);
      return true;
    }
    for (let i = 0; i < passes; i++) {
      Blur.call({ blurRadius: () => passRadius } as Text, pixels);
    }
    raw.putImageData(pixels, 0, 0);
    if (snapshot && shouldStoreRenderedBlur(node, snapshot)) storeBlur(node, snapshot, canvas._canvas);
  }
  output.save();
  output.setTransform(1, 0, 0, 1, 0, 0);
  output.globalAlpha = 1;
  output.shadowColor = "transparent";
  output.shadowBlur = 0;
  if (nativeBlur) output.filter = `blur(${sigma}px)`;
  if (renderScale < 1) {
    output.imageSmoothingEnabled = true;
    output.imageSmoothingQuality = "high";
  }
  output.drawImage(canvas._canvas, 0, 0, sampledWidth, sampledHeight,
    x, y, regionWidth, regionHeight);
  output.restore();
  return true;
}
