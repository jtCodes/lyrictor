import { SceneCanvas } from "konva/lib/Canvas";
import { Context } from "konva/lib/Context";
import { Text } from "konva/lib/shapes/Text";
import { Blur } from "konva/lib/filters/Blur";

// One reusable surface per output canvas, shared by all blurred text nodes.
// Its size depends on the viewport and blur margin, never the zoomed text box.
const surfaces = new WeakMap<HTMLCanvasElement, {
  canvas: SceneCanvas;
  width: number;
  height: number;
  margin: number;
}>();

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
  const passes = Math.max(1, Math.ceil((radius / 180) ** 2));
  const passRadius = radius / Math.sqrt(passes);
  const sigma = radius / Math.sqrt(6);
  const neededMargin = Math.ceil(
    (nativeBlur ? sigma * 3 : passes * Math.round(passRadius)) + 2
  );
  const width = output.canvas.width;
  const height = output.canvas.height;

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
  const x = Math.floor(Math.max(-neededMargin,
    Math.min(...xs) + Math.min(0, output.shadowOffsetX) - shadowPadding - neededMargin));
  const y = Math.floor(Math.max(-neededMargin,
    Math.min(...ys) + Math.min(0, output.shadowOffsetY) - shadowPadding - neededMargin));
  const endX = Math.ceil(Math.min(width + neededMargin,
    Math.max(...xs) + Math.max(0, output.shadowOffsetX) + shadowPadding + neededMargin));
  const endY = Math.ceil(Math.min(height + neededMargin,
    Math.max(...ys) + Math.max(0, output.shadowOffsetY) + shadowPadding + neededMargin));
  if (endX <= 0 || endY <= 0 || x >= width || y >= height) return;
  const regionWidth = endX - x;
  const regionHeight = endY - y;

  let surface = surfaces.get(output.canvas);
  if (!surface || surface.width !== width || surface.height !== height ||
      surface.margin < neededMargin) {
    const margin = Math.ceil(neededMargin / 64) * 64;
    surface = {
      canvas: new SceneCanvas({ width: width + margin * 2,
        height: height + margin * 2, pixelRatio: 1 }),
      width, height, margin,
    };
    surfaces.set(output.canvas, surface);
  }
  const { canvas } = surface;
  const scratch = canvas.getContext();
  const raw = scratch._context;
  // Reuse the allocation, but clear/read/blur/composite only this item's area.
  raw.clearRect(0, 0, regionWidth, regionHeight);
  raw.save();
  raw.setTransform(transform.a, transform.b, transform.c, transform.d,
    transform.e - x, transform.f - y);
  raw.globalAlpha = output.globalAlpha;
  raw.shadowColor = output.shadowColor;
  raw.shadowBlur = output.shadowBlur;
  raw.shadowOffsetX = output.shadowOffsetX;
  raw.shadowOffsetY = output.shadowOffsetY;
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
    // Older browsers retain focus effects using the same viewport-sized
    // surface. Split large kernels to stay within Konva's lookup table.
    const pixels = raw.getImageData(0, 0, regionWidth, regionHeight);
    for (let i = 0; i < passes; i++) {
      Blur.call({ blurRadius: () => passRadius } as Text, pixels);
    }
    raw.putImageData(pixels, 0, 0);
  }
  output.drawImage(canvas._canvas, 0, 0, regionWidth, regionHeight,
    x, y, regionWidth, regionHeight);
  output.restore();
}
