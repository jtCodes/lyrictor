const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const pending = new Map();
let resets = 0;
const state = {
  setAutoPlayRequested(value) { this.autoPlayRequested = value; },
  setEditingProjectAccess() {}, setLyricReference() {}, setUnsavedLyricReference() {},
  updateLyricTexts(value) { this.lyricTexts = value; }, setImages() {}, updateEditorLayout() {}, markAsSaved() {},
};
const store = { getState: () => state, setState: value => Object.assign(state, value) };
const dependencies = {
  './store': {
    useProjectStore: store,
    resolveEditingProjectAccess: project => new Promise(resolve => pending.set(project.id, resolve)),
    resetProjectEditorState: () => { resets++; state.editingProject = undefined; state.editingProjectId = undefined; state.autoPlayRequested = false; },
  },
  '../Editor/Image/AI/store': { useAIImageGeneratorStore: { getState: () => ({ setPromptLog() {}, setGeneratedImageLog() {} }) } },
  '../Editor/store': { useEditorStore: { getState: () => ({}), setState() {} } },
  '../Editor/editorLayout': { normalizeEditorLayout: value => value ?? {} },
  '../Editor/editorWorkspace': { captureEditorWorkspace: () => ({}), restoreEditorWorkspace: () => ({}) },
};
const moduleUnderTest = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../src/Project/loadProjectIntoEditor.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('exports', 'require', code)(moduleUnderTest.exports, name => {
  assert.ok(name in dependencies, `Unexpected dependency ${name}`);
  return dependencies[name];
});
const { loadProjectIntoEditor } = moduleUnderTest.exports;
const first = { id: 'first', projectDetail: { name: 'Same title', audioFileUrl: 'same.mp3' }, lyricTexts: ['first'] };
const second = { ...first, id: 'second', lyricTexts: ['second'] };
(async () => {
  const oldRequest = loadProjectIntoEditor(first);
  const newRequest = loadProjectIntoEditor(second);
  pending.get('second')({ canSave: true });
  assert.equal(await newRequest, true);
  pending.get('first')({ canSave: true });
  assert.equal(await oldRequest, false);
  assert.equal(resets, 1, 'An outdated load must not clear the selected scene');
  assert.equal(state.editingProjectId, 'second', 'Same title and audio can still identify distinct projects');
  assert.deepEqual(state.lyricTexts, ['second']);
  assert.equal(state.autoPlayRequested, true);
  let current = true;
  const cancelled = loadProjectIntoEditor(first, { isCurrentRequest: () => current });
  current = false;
  pending.get('first')({ canSave: true });
  assert.equal(await cancelled, false);
  assert.equal(state.editingProjectId, 'second', 'A newer click on the active card cancels a pending switch');
  assert.equal(resets, 1);
  await loadProjectIntoEditor(first, { access: { canSave: true }, requestAutoPlay: false });
  assert.equal(state.autoPlayRequested, false, 'Initial preview does not autoplay');
  assert.equal(state.editingProjectId, 'first');
  state.editingProject = undefined;
  const clickedMine = loadProjectIntoEditor(second);
  assert.equal(await loadProjectIntoEditor(first, { initializeOnly: true, requestAutoPlay: false }), false,
    'A default preview arriving after a Mine click must not supersede that click');
  pending.get('second')({ canSave: true });
  assert.equal(await clickedMine, true);
  assert.equal(state.editingProjectId, 'second');
  state.editingProject = undefined;
  const initial = loadProjectIntoEditor(first, { initializeOnly: true, requestAutoPlay: false });
  const clickedDuringInitial = loadProjectIntoEditor(second);
  pending.get('first')({ canSave: true });
  assert.equal(await initial, false, 'An initial load already in flight yields to a later click');
  pending.get('second')({ canSave: true });
  assert.equal(await clickedDuringInitial, true);
  assert.equal(state.editingProjectId, 'second');
  assert.equal(state.autoPlayRequested, true);
  console.log('Project selection passed: latest request wins, cancellation, stable identity, and initial autoplay policy');
})().catch(error => { console.error(error); process.exitCode = 1; });
