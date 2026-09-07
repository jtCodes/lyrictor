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
    return { useProjectStore: selector => selector({ lyricTexts: items }) };
  }
  assert.ok(!file.includes('/LyricPreview/'), 'Ambient decoration must not load the scene renderer');
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
assert.ok(first.includes('aria-hidden="true"') && first.includes('radial-gradient'));
assert.ok(!/canvas|filter:|mask|transform:|animation:/.test(first));
items = [visualizer];
assert.notEqual(render(), first, 'Switching projects updates the decorative palette');
console.log('Ambient background passed: palette/opacity, disabled and short scenes, bounded gradients, project switching, no scene/audio renderer.');
