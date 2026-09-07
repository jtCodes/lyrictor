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
const range = renderToStaticMarkup(React.createElement(inspector.InspectorRange, {
  value: [2.25, 8.75], min: 0, max: 30, step: 0.01, labels: ['Start', 'End'], onChange() {}, onCommit() {},
}));
assert.equal((range.match(/type="range"/g) || []).length, 2, 'Timing range needs two keyboard-accessible handles');
assert.ok(range.includes('aria-label="Start"') && range.includes('aria-label="End"'));
assert.ok(range.includes('value="2.25"') && range.includes('value="8.75"'));
assert.equal(new Set(ids).size, ids.length, 'Control IDs must be unique');
for(const match of markup.matchAll(/\bfor="([^"]+)"/g)) assert.ok(ids.includes(match[1]), 'Label must point to a control');
console.log('Inspector server-render checks passed: section order, controls, labels, IDs, locked focus, precise timing.');

const { default: LightFieldEditor } = load(`${editorDir}/Light/LightFieldEditor.tsx`);
const { createDefaultLightField, normalizeLightSettings } = load(`${editorDir}/Light/store.ts`);
const lightEditing = load(`${editorDir}/Light/lightEditing.ts`);
const { createLightPaletteKeyframe, resolveLightPalette } = load(`${editorDir}/Light/paletteKeyframes.ts`);
const renderField = scoped => renderToStaticMarkup(React.createElement(LightFieldEditor, {
  field: createDefaultLightField(), scoped, onChange() {}, onCommit() {},
}));
const baseField = renderField(false), changeField = renderField(true);
assert.ok(baseField.includes('>Horizontal</label>'));
assert.ok(!changeField.includes('>Horizontal</label>'), 'Changes cannot edit global field geometry');
for (const html of [baseField, changeField]) {
  for (const label of ['Color', 'Opacity', 'Strength', 'Frequency', 'Affects']) assert.ok(html.includes(`>${label}</label>`));
  assert.ok(html.includes('Color alpha percent'), 'Existing color alpha must remain editable');
  assert.ok(html.includes('value="#ff97f5"'));
  assert.ok(html.includes('Beat response'));
}
const settings = normalizeLightSettings();
settings.paletteKeyframes = [createLightPaletteKeyframe(settings, 2, 4), createLightPaletteKeyframe(settings, 3, 5)];
settings.paletteKeyframes[0].fieldColors[2] = { r: 1, g: 2, b: 3, a: .4 };
settings.paletteKeyframes[0].fieldOpacities[2] = .23;
settings.paletteKeyframes[0].fieldBeatReactive[2].intensity = 1.9;
const before = JSON.stringify(settings);
const removed = lightEditing.removeLightField(settings, 1);
assert.deepEqual(removed.paletteKeyframes[0].fieldColors[1], settings.paletteKeyframes[0].fieldColors[2]);
assert.equal(removed.paletteKeyframes[0].fieldOpacities[1], .23);
assert.equal(removed.paletteKeyframes[0].fieldBeatReactive[1].intensity, 1.9);
assert.equal(JSON.stringify(settings), before, 'Field changes must not mutate undo history');
const added = lightEditing.addLightField(removed);
assert.equal(added.fields.length, 4);
for (const change of added.paletteKeyframes) {
  assert.equal(change.fieldColors.length, 4);
  assert.equal(change.fieldOpacities.length, 4);
  assert.equal(change.fieldBeatReactive.length, 4);
  assert.deepEqual(change.fieldColors[3], added.fields[3].color);
}
const legacy = lightEditing.addLightField({ ...settings, paletteKeyframes: [{ ...settings.paletteKeyframes[0], fieldColors: [], fieldOpacities: undefined, fieldBeatReactive: undefined }] });
assert.deepEqual(legacy.paletteKeyframes[0].fieldColors[2], settings.fields[2].color);
assert.equal(lightEditing.activeLightChange(settings, 1), undefined);
assert.equal(lightEditing.activeLightChange(settings, 3.5).id, settings.paletteKeyframes[1].id);
assert.equal(lightEditing.activeLightChange(settings, 5), undefined, 'Return to base at the end');
assert.deepEqual(resolveLightPalette(settings, 10, 15).baseColor, settings.baseColor);
assert.deepEqual(lightEditing.lightInsertionRange(9, 10, 5), [0, 1]);
assert.deepEqual(lightEditing.lightInsertionRange(12, 10, 5), [2, 3]);
assert.deepEqual(lightEditing.lightInsertionRange(99, 10, 5), [4.99, 5]);
const clipped = lightEditing.updateLightChange(settings, settings.paletteKeyframes[0].id,
  { startOffset: -2, endOffset: 20, transitionDuration: 20 }, 5).paletteKeyframes[0];
assert.equal(clipped.startOffset, 0); assert.equal(clipped.endOffset, 5); assert.equal(clipped.transitionDuration, 2.5);
console.log('Light inspector passed: shared controls, base/change scope, palette alignment, immutable edits, range timing and playhead boundaries.');
