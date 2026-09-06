const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)((name) => {
    if (name.endsWith('.css')) return {};
    if (!name.startsWith('.')) return require(name);
    const base = path.resolve(path.dirname(file), name);
    return load([base+'.tsx', base+'.ts'].find(fs.existsSync));
  }, module, module.exports);
  return module.exports;
}
const editorDir = path.resolve(__dirname, '../../src/Editor');
const { default: CameraValuesEditor } = load(`${editorDir}/Camera/CameraValuesEditor.tsx`);
const { DEFAULT_CAMERA_SETTINGS } = load(`${editorDir}/Camera/store.ts`);
const inspector = load(`${editorDir}/Settings/Inspector.tsx`);
const render = (props = {}) => renderToStaticMarkup(React.createElement(CameraValuesEditor, {
  values: DEFAULT_CAMERA_SETTINGS, onChange() {}, onCommit() {}, ...props,
}));
const markup = render();
assert.ok(markup.indexOf('Lens') < markup.indexOf('Movement'));
assert.ok(markup.indexOf('Movement') < markup.indexOf('Focus'));
assert.equal((markup.match(/class="inspector-property /g) || []).length, 7);
assert.equal((markup.match(/aria-label="Reset /g) || []).length, 7);
for (const label of ['Focal length','Back / forward','Left / right','Tilt','Rotation','Distance','Focus speed']) {
  assert.ok(markup.includes(`>${label}</label>`), `Missing visible label ${label}`);
}
const locked = render({ focusLocked: true });
const distance = locked.slice(locked.indexOf('>Distance</label>'), locked.indexOf('>Focus speed</label>'));
assert.ok(distance.includes('disabled=""'), 'Target-locked distance must remain visible and disabled');
const timing = renderToStaticMarkup(React.createElement(inspector.InspectorNumber, {
  label: 'Start', value: 2.25, min: 0, max: 29, step: 0.01, unit: 's', slider: false, onChange() {}, onCommit() {},
}));
assert.ok(timing.includes('2.25'));
assert.ok(!timing.includes('inspector-slider'), 'Timing should use precise number entry without a slider');
const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Control IDs must be unique');
for(const match of markup.matchAll(/\bfor="([^"]+)"/g)) assert.ok(ids.includes(match[1]), 'Label must point to a control');
console.log('Inspector server-render checks passed: section order, controls, labels, IDs, locked focus, precise timing.');
