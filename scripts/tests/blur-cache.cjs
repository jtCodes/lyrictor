const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const folder = path.resolve(__dirname, '../../src/Editor/Rendering/blur');
function load(name, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(folder, name), 'utf8')
    .replaceAll('import.meta.url', JSON.stringify(`file://${folder}/${name}`)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', ...Object.keys(globals), source)(id => {
    assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
    return dependencies[id];
  }, module.exports, module, ...Object.values(globals));
  return module.exports;
}
let reads = 0, glyphs = 0, blurPasses = 0;
const allocations = [];
function context(canvas) {
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [];
  return {
    canvas, globalAlpha: 1, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    shadowColor: 'transparent', lineJoin: 'miter', draws: 0,
    getTransform() { return Object.fromEntries(['a','b','c','d','e','f'].map((key, i) => [key, matrix[i]])); },
    setTransform(...value) { matrix = value; },
    save() { stack.push({ ...this, matrix: [...matrix] }); },
    restore() { const state = stack.pop(); matrix = state.matrix; const draws = this.draws; Object.assign(this, state); this.draws = draws; },
    clearRect() {}, drawImage() { this.draws++; }, putImageData() {},
    getImageData(x, y, width, height) { reads++; return new Pixels(new Uint8ClampedArray(width*height*4), width, height); },
  };
}
class Pixels {
  constructor(data, width, height) { Object.assign(this, { data, width, height }); }
}
class Canvas {
  constructor() {
    this._canvas = { width: 0, height: 0, getContext: () => this.raw };
    this.raw = context(this._canvas);
    allocations.push(this);
  }
  getContext() { return this.context; }
  getPixelRatio() { return 1; }
  setSize(width, height) { this.width = this._canvas.width = width; this.height = this._canvas.height = height; }
}
class SceneContext { constructor(canvas) { this._context = canvas.raw; } }
class SceneCanvas extends Canvas {
  constructor({ width, height }) { super(); this.context = new SceneContext(this); this.setSize(width, height); }
}
const workers = [];
class Worker {
  constructor() { workers.push(this); }
  postMessage(payload) { this.payload = payload; }
  terminate() { this.terminated = true; }
  finish() { this.onmessage({ data: this.payload.data }); }
}
const cache = load('blurCache.ts', { 'konva/lib/Canvas': { SceneCanvas } }, { Worker, ImageData: Pixels });
const identity = [1,0,0,1,0,0];
const node = { getAttrs: () => attrs, hasShadow: () => false, hasStroke: () => false, fillPriority: () => 'color' };
let attrs = { text: 'Hey', fill: 'white', fontSize: 400, x: 10 };
const output = context({ width: 1200, height: 600 });
const key = () => cache.blurCacheKey(node, output, 6, 1);
const originalKey = key();
attrs.x = 200;
assert.equal(key(), originalKey, 'Placement must not invalidate pixel content');
attrs.fill = 'red';
assert.notEqual(key(), originalKey, 'Text styling must invalidate pixels');
attrs.fill = 'white';
output.globalAlpha = 0.5;
assert.notEqual(key(), originalKey, 'Inherited opacity must invalidate pixels');
output.globalAlpha = 1;
assert.notEqual(cache.blurCacheKey(node, output, 7, 1), originalKey, 'Focus must invalidate pixels');
assert.equal(cache.blurCacheKey({ ...node, hasShadow: () => true }, output, 6, 1), undefined);
assert.equal(cache.blurCacheKey({ ...node, fillPriority: () => 'linear-gradient' }, output, 6, 1), undefined);
assert.equal(cache.canCacheBlur(100, 100), false);
assert.equal(cache.canCacheBlur(10000, 10000), false);
const imageNode = { ...node, getAttrs: () => ({ image: new (class ImageAsset {})() }) };
assert.equal(cache.blurCacheKey(imageNode, output, 6, 1), undefined, 'External assets need an explicit pixel identity');
assert.notEqual(cache.blurCacheKey(imageNode, output, 6, 1, 'asset:revision-1'),
  cache.blurCacheKey(imageNode, output, 6, 1, 'asset:revision-2'), 'Asset revision changes invalidate cached images');
const snapshot = {
  key: originalKey, matrix: identity, x: -200, y: -200, width: 1600, height: 1000,
  sampledWidth: 1600, sampledHeight: 1000, margin: 10,
  clipped: { left: false, right: false, top: false, bottom: false },
};
cache.storeBlur(node, snapshot, {});
assert.equal(cache.drawCachedBlur(node, output, originalKey, identity), true);
const angle = 0.04;
const rotated = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 80, -20];
assert.equal(cache.drawCachedBlur(node, output, originalKey, rotated), true, 'Rotation and movement reuse the finished blur');
assert.equal(cache.drawCachedBlur(node, output, originalKey, [1.1,0,0,1.1,0,0]), false, 'Zoom needs fresh rasterization');
assert.equal(cache.drawCachedBlur(node, output, originalKey, [1,0,0.1,1,0,0]), false, 'Skew needs fresh rasterization');
assert.ok(cache.rigidDelta(identity, [1.00000193,0,0,1.00000193,0,0], 4400),
  'Subpixel settling at the end of the first Hey camera move should reuse its prepared image');
assert.equal(cache.drawCachedBlur(node, output, 'changed', identity), false);
cache.storeBlur(node, { ...snapshot, clipped: { ...snapshot.clipped, left: true } }, {});
assert.equal(cache.drawCachedBlur(node, output, originalKey, [1,0,0,1,100,0]), true);
assert.equal(cache.drawCachedBlur(node, output, originalKey, [1,0,0,1,250,0]), false, 'Never expose clipped pixels after movement');
cache.releaseBlurCache(node);
assert.equal(cache.drawCachedBlur(node, output, originalKey, identity), false);
assert.equal(allocations.at(-1).width, 0, 'Released cache canvas must relinquish its backing store');
const huge = { ...snapshot, sampledWidth: 4000, sampledHeight: 2500 };
const first = {}, second = {};
cache.storeBlur(first, huge, {});
const firstCanvas = allocations.at(-1);
cache.storeBlur(second, huge, {});
assert.equal(firstCanvas.width, 0, '64 MiB budget must evict the oldest entry');
assert.equal(cache.hasPreparedBlur(first, originalKey, identity), false);
cache.releaseBlurCache(second);
// Later cues must not lose their prepared image to intervening live rendering.
cache.storeBlur(first, huge, {}, true);
const reservedCanvas = allocations.at(-1);
cache.storeBlur(second, huge, {});
assert.equal(reservedCanvas.width, 4000, 'A live cache must not evict a pre-playback image');
assert.equal(cache.hasPreparedBlur(first, originalKey, identity), true);
assert.equal(cache.hasPreparedBlur(second, originalKey, identity), false);
assert.equal(cache.canRetainPreparedBlur(4000, 2500), false, 'Preparation must honor its memory budget');
cache.storeBlur(first, { ...huge, key: 'animated focus' }, {});
assert.equal(cache.hasPreparedBlur(first, originalKey, identity), true, 'Animation must preserve the prepared cue for replay');
cache.releaseBlurCache(first);
assert.equal(cache.canRetainPreparedBlur(4000, 2500), true, 'Project cleanup returns reserved memory');

// Exercise the actual renderer and cache together: hidden pre-rendering does
// no main-thread blur or output drawing; the next live frame uses its result.
class Text { _sceneFunc() { glyphs++; } }
const genericRenderer = load('createBlurRenderer.ts', {
  'konva/lib/Canvas': { Canvas, SceneCanvas }, 'konva/lib/Context': { SceneContext },
  'konva/lib/shapes/Text': { Text }, './blurCache': cache,
  'konva/lib/filters/Blur': { Blur() { blurPasses++; } },
});
const renderer = load('../../Lyrics/LyricPreview/drawBlurredText.ts', {
  'konva/lib/shapes/Text': { Text },
  '../../Rendering/blur/createBlurRenderer': genericRenderer,
  './fontLoad': { ensureFontReady: () => Promise.resolve() },
});
const layer = new SceneCanvas({ width: 1200, height: 600 });
const live = layer.raw;
const text = {
  ...node, fontSize: () => 100, getAttr: () => 6,
  getClientRect: () => ({ x: 100, y: 100, width: 1000, height: 400 }),
  getLayer: () => ({ getCanvas: () => layer }),
  getAbsoluteTransform: () => ({ getMatrix: () => identity }),
  getAbsoluteOpacity: () => 1, lineJoin: () => 'miter',
};
assert.equal(renderer.preRenderBlurredText(text), true);
assert.equal(reads, 1);
assert.equal(blurPasses, 0, 'Pre-render blur must run outside the main thread');
assert.equal(live.draws, 0, 'An upcoming lyric must never appear early');
assert.equal(cache.canPrepareBlur(), false, 'Only one pre-render worker may run at a time');
workers.at(-1).finish();
assert.equal(workers.at(-1).terminated, true);
assert.equal(cache.canPrepareBlur(), true);
renderer.drawBlurredText.call(text, layer.context);
assert.equal(reads, 1, 'Prepared live frame must avoid another readback');
assert.equal(blurPasses, 0);
assert.equal(live.draws, 1);
live.setTransform(...rotated);
renderer.drawBlurredText.call(text, layer.context);
assert.equal(reads, 1, 'Camera rotation must avoid recomputing blur');
attrs.fill = 'yellow';
renderer.drawBlurredText.call(text, layer.context);
assert.equal(reads, 2, 'Changed appearance must be drawn immediately');
assert.equal(blurPasses, 1);
cache.releaseBlurCache(text);

live.setTransform(...identity);
const animatedText = { ...text };
let radius = 10;
animatedText.getAttr = () => radius;
renderer.drawBlurredText.call(animatedText, layer.context);
const allocationCount = allocations.length;
for (radius of [11, 12, 13, 14]) renderer.drawBlurredText.call(animatedText, layer.context);
assert.equal(allocations.length, allocationCount, 'Continuous focus changes must not allocate finished caches every frame');
cache.releaseBlurCache(animatedText);

const pixels = new Pixels(new Uint8ClampedArray(1600*1000*4), 1600, 1000);
cache.prepareBlur(text, snapshot, pixels, 6, 1);
const cancelled = workers.at(-1);
cache.releaseBlurCache(text);
assert.equal(cancelled.terminated, true);
cancelled.finish();
assert.equal(cache.hasPreparedBlur(text, originalKey, identity), false, 'Late worker result must not resurrect released text');
cache.prepareBlur(text, snapshot, pixels, 6, 1);
workers.at(-1).onerror();
assert.equal(cache.canPrepareBlur(), true, 'Worker failure must release the preparation slot');

(async () => {
  let rectangleDraws = 0;
  const rectangleRenderer = genericRenderer.createBlurRenderer({ cacheKey: "attributes", draw: () => rectangleDraws++ });
  const rectangle = { ...text, fontSize: undefined, getAttrs: () => ({ fill: 'blue', width: 1000, height: 400 }) };
  const glyphsBeforeRectangle = glyphs;
  const preparation = rectangleRenderer.prepare(rectangle, new AbortController().signal);
  await Promise.resolve();
  workers.at(-1).finish();
  await preparation;
  const readsAfterPreparation = reads;
  rectangleRenderer.draw.call(rectangle, layer.context);
  assert.equal(reads, readsAfterPreparation, 'A non-text shape uses the same prepared cache');
  assert.equal(rectangleDraws, 1, 'The adapter draws its content only once');
  assert.equal(glyphs, glyphsBeforeRectangle, 'The shared renderer must not invoke text drawing');
  const otherRenderer = genericRenderer.createBlurRenderer({ cacheKey: "attributes", draw: () => rectangleDraws++ });
  otherRenderer.draw.call(rectangle, layer.context);
  assert.equal(reads, readsAfterPreparation + 1, 'Different renderers must never share an image solely because node attributes match');
  rectangleRenderer.release(rectangle);

  let assetReady = false;
  const asset = { ...rectangle, getClientRect: () => assetReady
    ? { x: 100, y: 100, width: 1000, height: 400 } : { x: 0, y: 0, width: 0, height: 0 } };
  const assetRenderer = genericRenderer.createBlurRenderer({
    cacheKey: () => 'decoded-asset:revision-1',
    ready: async () => { assetReady = true; },
    draw: () => rectangleDraws++,
  });
  const beforeWorkers = workers.length;
  const assetPreparation = assetRenderer.prepare(asset, new AbortController().signal);
  await Promise.resolve();
  assert.equal(workers.length, beforeWorkers + 1, 'Load assets before deciding whether their decoded bounds qualify');
  workers.at(-1).finish();
  await assetPreparation;
  assetRenderer.release(asset);
  const { Blur } = await import('konva/lib/filters/Blur.js');
  const workerScope = { postMessage(data) { this.result = data; } };
  load('blurCache.worker.ts', { 'konva/lib/filters/Blur': { Blur } }, { self: workerScope, ImageData: Pixels });
  for (const [radius, passes] of [[1,1], [23,1], [170,2]]) {
    const input = Uint8ClampedArray.from({ length: 64*64*4 }, (_, i) => (i*37+Math.floor(i/7))%256);
    const expected = new Pixels(input.slice(), 64, 64);
    for (let i = 0; i < passes; i++) Blur.call({ blurRadius: () => radius }, expected);
    workerScope.onmessage({ data: { width: 64, height: 64, data: input.buffer, radius, passes } });
    assert.deepEqual(new Uint8ClampedArray(workerScope.result), expected.data, 'Worker must preserve the exact existing blur pixels');
  }
  console.log('Blur cache passed: worker pixel parity, pre-render-to-playback reuse, camera movement, invalidation, clipping, memory budget and cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
