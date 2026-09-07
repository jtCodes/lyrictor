const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const allocations = [];
let glyphDraws = 0;
let pixelReads = 0;
let lastReadArea = 0;
let cpuBlurPasses = 0;
function rawContext(canvas, native = true) {
  return {
    canvas, ...(native ? { filter: 'none' } : {}),
    globalAlpha: 0.6, shadowColor: 'blue', shadowBlur: 2,
    shadowOffsetX: 1, shadowOffsetY: 2, lineJoin: 'round',
    save() {}, restore() {}, clearRect(...args) { this.cleared = args; }, setTransform(...args) { this.transform = args; },
    drawImage(...args) { this.drawn = args; },
    getImageData(x, y, width, height) { pixelReads++; lastReadArea = width * height; return {}; }, putImageData() {},
  };
}
class SceneCanvas {
  constructor({ width, height, pixelRatio }) {
    assert.equal(pixelRatio, 1); // Dimensions are already in physical pixels.
    this.width = width; this.height = height; this._canvas = { width, height };
    this.context = { _context: rawContext(this._canvas) };
    allocations.push(this);
  }
  getContext() { return this.context; }
}
class Text { _sceneFunc() { glyphDraws++; } }
const loaded = { exports: {} };
const mocks = {
  'konva/lib/Canvas': { SceneCanvas },
  'konva/lib/shapes/Text': { Text },
  'konva/lib/filters/Blur': { Blur() { assert.ok(this.blurRadius() <= 180); cpuBlurPasses++; } },
};
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,
  '../../src/Editor/Lyrics/LyricPreview/drawBlurredText.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
new Function('require', 'module', 'exports', source)((id) => {
  assert.ok(id in mocks, `Unexpected dependency ${id}`); return mocks[id];
}, loaded, loaded.exports);
const draw = loaded.exports.drawBlurredText;
const output = rawContext({ width: 1200, height: 600 });
let zoom = 1;
output.getTransform = () => ({ a: zoom * 2, b: 0, c: 0, d: zoom * 2, e: 15, f: 25 });
const context = { _context: output };
const textNode = (radius, bounds = { x: 0, y: 0, width: 100, height: 30 }) => ({
  getAttr: () => radius,
  getClientRect: (options) => {
    assert.equal(options.skipTransform, true);
    assert.equal(options.skipShadow, true);
    return bounds;
  },
  fontSize: () => 20,
});
const node = { ...textNode(6), getAttr: () => 6 / zoom };
draw.call(node, context);
assert.equal(allocations.length, 1);
assert.equal(pixelReads, 0, 'Native blur must avoid pixel readback');
assert.ok(output.filter.startsWith('blur('));
assert.equal(allocations[0].getContext()._context.globalAlpha, 0.6);
const first = allocations[0];
for (zoom of [2, 8, 20, 40, 1]) draw.call(node, context);
assert.equal(allocations.length, 1, 'Constant screen blur must reuse the same surface at every zoom');
assert.equal(first.width, 1328);
assert.equal(first.height, 728);
assert.deepEqual(output.transform, [1, 0, 0, 1, 0, 0], 'Composite in screen coordinates');
const previousGlyphDraws = glyphDraws;
draw.call({ getAttr: () => 0 }, context);
assert.equal(glyphDraws, previousGlyphDraws + 1);
assert.equal(allocations.length, 1, 'Sharp text needs no blur surface');
// Another text shares the surface; a resized output gets a correctly sized one.
draw.call(textNode(2), context);
assert.equal(allocations.length, 1);
output.canvas.width = 1600;
draw.call(node, context);
assert.equal(allocations.length, 2);
assert.equal(allocations[1].width, 1728);
const fallback = rawContext({ width: 600, height: 300 }, false);
fallback.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
draw.call(textNode(240), { _context: fallback });
assert.equal(pixelReads, 1);
assert.ok(cpuBlurPasses > 1, 'Large fallback kernels must remain within supported range');

const cropped = rawContext({ width: 1200, height: 600 }, false);
cropped.shadowBlur = 0;
cropped.shadowOffsetX = cropped.shadowOffsetY = 0;
let matrix = { a: 1, b: 0, c: 0, d: 1, e: 300, f: 200 };
cropped.getTransform = () => matrix;
draw.call(textNode(6), { _context: cropped });
assert.ok(lastReadArea < 1200 * 600 * 0.1, 'Small text must not blur a whole viewport');
const smallReadArea = lastReadArea;
const scratchContext = allocations.at(-1).getContext()._context;
assert.equal(scratchContext.cleared[2] * scratchContext.cleared[3], smallReadArea, 'Clear only the processed area');
assert.equal(cropped.drawn[3] * cropped.drawn[4], smallReadArea, 'Composite only the processed area');
assert.equal(cropped.drawn[3], cropped.drawn[7], 'Keep physical pixel resolution');
assert.equal(cropped.drawn[4], cropped.drawn[8], 'Keep physical pixel resolution');
const covers = (x, y) => {
  const [, , , width, height, left, top] = cropped.drawn;
  return x >= left && x <= left + width && y >= top && y <= top + height;
};
assert.ok(covers(294, 194) && covers(406, 236), 'Retain the entire blur halo');

// Rotated/skewed/mirrored text must use all four transformed corners.
matrix = { a: -1, b: 0.5, c: 0.75, d: 1, e: 300, f: 100 };
draw.call(textNode(6), { _context: cropped });
for (const point of [[300, 100], [200, 150], [322.5, 130], [222.5, 180]]) {
  assert.ok(covers(...point), 'Transformed text was clipped');
}
matrix = { a: 1, b: 0, c: 0, d: 1, e: 300, f: 200 };
cropped.shadowBlur = 10;
cropped.shadowOffsetX = 150;
cropped.shadowOffsetY = -80;
draw.call(textNode(6), { _context: cropped });
assert.ok(covers(550, 120), 'Screen-space shadow offsets must be included');
cropped.shadowBlur = 0;
cropped.shadowOffsetX = cropped.shadowOffsetY = 0;
matrix.e = -112;
draw.call(textNode(20), { _context: cropped });
assert.ok(covers(0, 200), 'Offscreen text whose blur enters the viewport must still render');
const readsBeforeCull = pixelReads;
const drawsBeforeCull = glyphDraws;
matrix.e = -1000;
draw.call(textNode(6), { _context: cropped });
assert.equal(pixelReads, readsBeforeCull, 'Fully offscreen blur must skip readback');
assert.equal(glyphDraws, drawsBeforeCull, 'Fully offscreen blur must skip glyph rendering');
matrix = { a: 1000, b: 0, c: 0, d: 1000, e: -50000, f: -15000 };
draw.call(textNode(6 / 1000), { _context: cropped });
assert.ok(lastReadArea <= (1200 + 16) * (600 + 16), 'Extreme zoom must stay viewport-bounded');
console.log(`Viewport text rendering passed: reuse, sharp/native/fallback paths, cropped readback (${smallReadArea} vs 720000 viewport pixels), transforms, shadows, edge halo, offscreen culling and extreme zoom.`);

// Compare actual Konva CPU-blur pixels with an uncropped reference. Rasterize
// a synthetic glyph mask here; browser/font rendering still needs visual QA.
async function checkBlurPixels() {
  const { Blur } = await import('../../node_modules/konva/lib/filters/Blur.js');
  mocks['konva/lib/filters/Blur'].Blur = Blur;
  let textX = 140;
  let textY = 70;
  class PixelCanvas {
    constructor({ width, height }) {
      this.width = width;
      this.height = height;
      this._canvas = { width, height };
      const raw = rawContext(this._canvas, false);
      raw.getImageData = (_x, _y, w, h) => {
        const data = new Uint8ClampedArray(w * h * 4);
        const originX = textX - raw.transform[4];
        const originY = textY - raw.transform[5];
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const gx = originX + x - textX;
            const gy = originY + y - textY;
            if (gx < 0 || gx >= 100 || gy < 0 || gy >= 30) continue;
            const offset = (y * w + x) * 4;
            data[offset] = 230;
            data[offset + 1] = 120;
            data[offset + 2] = 255;
            data[offset + 3] = (gx % 17 < 10 || gy < 6) ? 180 : 0;
          }
        }
        return { width: w, height: h, data };
      };
      raw.putImageData = pixels => { this._canvas.pixels = pixels; };
      this.context = { _context: raw };
    }
    getContext() { return this.context; }
  }
  mocks['konva/lib/Canvas'].SceneCanvas = PixelCanvas;
  const render = (radius, fullViewport) => {
    const target = rawContext({ width: 320, height: 180 }, false);
    const result = new Uint8ClampedArray(320 * 180 * 4);
    target.shadowBlur = target.shadowOffsetX = target.shadowOffsetY = 0;
    target.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: textX, f: textY });
    target.drawImage = (canvas, sx, sy, w, h, dx, dy) => {
      const { pixels } = canvas;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const outX = dx + x, outY = dy + y;
          if (outX < 0 || outX >= 320 || outY < 0 || outY >= 180) continue;
          const from = ((sy + y) * pixels.width + sx + x) * 4;
          result.set(pixels.data.subarray(from, from + 4), (outY * 320 + outX) * 4);
        }
      }
    };
    draw.call(textNode(radius, fullViewport
      ? { x: -10000, y: -10000, width: 20000, height: 20000 }
      : undefined), { _context: target });
    return result;
  };
  for (const radius of [1, 6, 20, 185]) {
    for (const [x, y] of [[140, 70], [-80, 70], [300, 165]]) {
      textX = x;
      textY = y;
      const croppedPixels = render(radius, false);
      const referencePixels = render(radius, true);
      assert.deepEqual(croppedPixels, referencePixels,
        `CPU blur pixels changed at radius ${radius}, position ${x},${y}`);
    }
  }
  console.log('Actual Konva CPU blur matches the uncropped reference pixel-for-pixel across 12 radius/viewport-edge cases.');
}
checkBlurPixels().catch(error => { console.error(error); process.exitCode = 1; });
