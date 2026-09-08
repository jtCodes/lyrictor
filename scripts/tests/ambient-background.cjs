const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const modules = new Map();
let items = [];
function load(file) {
  if (file.endsWith('/Project/store.ts')) {
    return { useProjectStore: selector => selector({ lyricTexts: items, editingProject: { resolution: "16:9" } }) };
  }
  if (file.endsWith('/src/utils.ts')) return { useWindowSize: () => ({ width: 1600, height: 900 }) };
  if (file.endsWith('/LyricPreview/LyricPreview.tsx')) return { __esModule: true, default: props => {
    assert.equal(props.backgroundOnly, true);
    assert.notEqual(props.disableAnimation, true, 'Ambient colors should follow playback');
    assert.equal(props.maxWidth, 128, 'Keep the decorative canvas small');
    return React.createElement('canvas', { 'data-ambient-preview': true });
  } };
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(!['react-konva', 'react-use-audio-player', 'howler'].includes(name),
      'Ambient decoration must not create canvases or subscribe to audio');
    if (!name.startsWith('.')) return require(name);
    const base = path.resolve(path.dirname(file), name);
    return load([base + '.tsx', base + '.ts'].find(fs.existsSync));
  }, module, module.exports);
  return module.exports;
}

const { getAmbientBackground } = load(path.resolve(__dirname, '../../src/Project/ambientPalette.ts'));
const light = {
  id: 1, elementType: 'light', start: 0, end: 30, textBoxTimelineLevel: 1,
  lightSettings: { baseColor: { r: 255, g: 0, b: 0, a: 0.5 }, baseOpacity: 0.5, fields: [] },
};
const before = JSON.stringify(light);
assert.ok(getAmbientBackground([light]).includes('rgba(255, 0, 0, 0.25)'));
assert.equal(getAmbientBackground([{ ...light, renderEnabled: false }]), 'none');
assert.equal(getAmbientBackground([{ ...light, itemOpacity: 0 }]), 'none');
assert.equal(getAmbientBackground([]), 'none');
assert.equal(getAmbientBackground([{ id: 2, text: 'Lyrics', start: 0, end: 30 }]), 'none');
assert.ok(getAmbientBackground([{ ...light, end: 2 }]).includes('255, 0, 0'), 'Short scenes retain their palette');
assert.ok(getAmbientBackground([{ ...light, start: 40, end: 70 }]).includes('255, 0, 0'), 'Delayed scenes retain their palette');
const visualizer = { ...light, elementType: 'visualizer', visualizerSettings: {
  fillRadialGradientColorStops: Array.from({ length: 20 }, (_, index) => ({
    stop: index / 19, color: { r: 0, g: index, b: 255, a: 1 },
  })),
} };
const background = getAmbientBackground([visualizer]);
assert.equal((background.match(/radial-gradient/g) || []).length, 4);
assert.ok(background.includes('0, 0, 255') && background.includes('0, 19, 255'), 'Retain both palette ends');
assert.equal(JSON.stringify(light), before, 'Palette extraction must not change the project');

const Ambient = load(path.resolve(__dirname, '../../src/components/ProjectAmbientBackground.tsx')).default;
items = [light];
const render = () => renderToStaticMarkup(React.createElement(Ambient));
const first = render();
assert.ok(first.includes('aria-hidden="true"') && first.includes('data-ambient-preview'));
assert.ok(!first.includes('blur(80px)') && !first.includes('filter:blur('), 'No large CSS blur path');
assert.ok(first.includes('feGaussianBlur stdDeviation="6.4"'), 'Preserve scaled Gaussian softness');
assert.ok(first.includes('feColorMatrix type="saturate" values="1.1"'), 'Preserve saturation');
assert.ok(first.includes('color-interpolation-filters="sRGB"'), 'Match CSS filter color space');
assert.ok(first.includes('filterUnits="userSpaceOnUse"') && first.includes('width="170" height="114"'),
  'Bound the filter to the preview plus transparent blur bleed');
const filterId = first.match(/<filter id="([^"]+)"/)[1];
assert.ok(first.includes(`filter:url(#${filterId})`), 'Connect the preview to its filter');
const pair = renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(Ambient), React.createElement(Ambient)));
const ids = [...pair.matchAll(/<filter id="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, 2, 'Independent mounted previews need unique filter IDs');
const { getAmbientRenderGeometry } = load(path.resolve(__dirname, '../../src/components/ambientRenderGeometry.ts'));
for (const [width, height] of [[1600, 900], [390, 844], [7680, 4320], [1, 1]]) {
  const g = getAmbientRenderGeometry(width, height);
  assert.ok(g.previewWidth <= 256 && g.previewHeight <= 256, 'Bound source dimensions even on 8K screens');
  assert.ok(Math.abs(g.blurSigma / g.scale - 80) < 1e-8, 'Keep displayed blur independent of viewport');
  assert.ok(g.margin >= 3 * g.blurSigma, 'Avoid clipping the blur halo');
}
console.log('Ambient background passed: palette helpers, low-resolution shared animated preview, decorative accessibility and blur treatment.');

const { getAmbientCoverScale } = load(path.resolve(__dirname, '../../src/components/ambientRenderGeometry.ts'));
const { getPreviewSize } = load(path.resolve(__dirname, '../../src/Editor/Lyrics/LyricPreview/previewSizing.ts'));
for (const [width, height] of [[390, 844], [430, 932], [844, 390], [1600, 900]]) {
  const scale = getAmbientCoverScale(width, height, '16:9');
  const scene = getPreviewSize(width, height, '16:9');
  assert.ok(scene.previewWidth * scale >= width * 2.5 - 1e-8, 'Scene covers page width with blur overscan');
  assert.ok(scene.previewHeight * scale >= height * 2.5 - 1e-8, 'Scene covers page height with blur overscan');
}
assert.equal(getAmbientCoverScale(1600, 900, '16:9'), 2.5, 'Keep matching desktop composition');
assert.equal(getAmbientCoverScale(390, 844), 2.5, 'Unconstrained scenes already fill the page');
console.log('Mobile ambient coverage passed: portrait, landscape, desktop and unconstrained scenes.');
