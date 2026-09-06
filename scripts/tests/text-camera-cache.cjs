const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const allocations = [];
let glyphDraws = 0;
let pixelReads = 0;
let cpuBlurPasses = 0;
function rawContext(canvas, native = true) {
  return {
    canvas, ...(native ? { filter: 'none' } : {}),
    globalAlpha: 0.6, shadowColor: 'blue', shadowBlur: 2,
    shadowOffsetX: 1, shadowOffsetY: 2, lineJoin: 'round',
    save() {}, restore() {}, clearRect() {}, setTransform(...args) { this.transform = args; },
    drawImage(...args) { this.drawn = args; },
    getImageData() { pixelReads++; return {}; }, putImageData() {},
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
const node = { getAttr: () => 6 / zoom };
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
draw.call({ getAttr: () => 2 }, context);
assert.equal(allocations.length, 1);
output.canvas.width = 1600;
draw.call(node, context);
assert.equal(allocations.length, 2);
assert.equal(allocations[1].width, 1728);
const fallback = rawContext({ width: 600, height: 300 }, false);
fallback.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
draw.call({ getAttr: () => 240 }, { _context: fallback });
assert.equal(pixelReads, 1);
assert.ok(cpuBlurPasses > 1, 'Large fallback kernels must remain within supported range');
console.log('Viewport text rendering tests passed: zoom-independent allocation, reuse, native blur, fallback, resize, sharp path.');
