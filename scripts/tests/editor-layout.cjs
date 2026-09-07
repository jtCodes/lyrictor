const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createStore } = require('zustand/vanilla');
const root = path.resolve(__dirname, '../../src');
const modules = new Map();
const auth = { user: undefined, storagePreference: 'local' };
const ai = { generatedImageLog: [], promptLog: [], reset() {},
  setPromptLog(value) { this.promptLog = value; },
  setGeneratedImageLog(value) { this.generatedImageLog = value; } };
let cloudProject, completeCloudSave;
let audioPosition = 0;
const stubs = {
  "Editor/AudioTimeline/useAudioPosition": { getCurrentAudioPosition: () => audioPosition },
  'Auth/store': { useAuthStore: { getState: () => auth } },
  'Editor/Image/AI/store': { useAIImageGeneratorStore: { getState: () => ai } },
  'Editor/AudioTimeline/utils': { normalizeLyricTextTimelineLevels: items => items },
  'Editor/Lyrics/LyricPreview/textCentering': {},
  'Project/demoProjects': { getDemoProjects: () => [] },
  'Project/browserInfo': { withSavedBrowserInfo: project => project },
  'Project/firestoreProjectService': {
    saveProjectToFirestore: async (_, project) => {
      cloudProject = JSON.parse(JSON.stringify(project));
      await new Promise(resolve => { completeCloudSave = resolve; });
      return project.lyricTexts;
    },
  },
};
function load(file) {
  const key = path.relative(root, file).replace(/\.ts$/, '');
  if (stubs[key]) return stubs[key];
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'zustand') {
      const create = initializer => {
        const store = createStore(initializer);
        return Object.assign(selector => selector(store.getState()), store);
      };
      return { __esModule: true, create, default: create };
    }
    if (name === 'react') return { useEffect() {}, useRef: value => ({ current: value }) };
    if (name === '@react-spectrum/toast') return { ToastQueue: { positive() {}, negative() {}, info() {} } };
    if (!name.startsWith('.')) return require(name);
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }, module, module.exports);
  return module.exports;
}
const storage = new Map();
global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value) };
const { normalizeEditorLayout, DEFAULT_EDITOR_LAYOUT, fitEditorPanelWidths } = load(root+'/Editor/editorLayout.ts');
const { useProjectStore, getEditorLayoutForSave, getSavedProjectSnapshot, resetProjectEditorState, completeTimelineWorkspaceRestore } = load(root+'/Project/store.ts');
const { loadProjectIntoEditor } = load(root+'/Project/loadProjectIntoEditor.ts');
const { useProjectService } = load(root+'/Project/useProjectService.ts');
const { exportProjectJson, importProjectJson } = load(root+'/Project/projectJson.ts');
const { useEditorStore } = load(root+'/Editor/store.ts');
const { resolveWorkspaceTimeline, getWorkspaceHorizontalThumbX, restoreEditorWorkspace } = load(root+'/Editor/editorWorkspace.ts');
const dirty = () => getSavedProjectSnapshot() !== useProjectStore.getState().savedLyricTextsSnapshot;
const detail = { name: 'Layout test', createdDate: new Date('2026-09-06'), audioFileName: 'song.mp3',
  audioFileUrl: 'https://example.com/song.mp3', isLocalUrl: false, editingMode: 'free' };
const project = { id: detail.name, projectDetail: detail, lyricTexts: [], images: [], generatedImageLog: [], promptLog: [] };
const layout = { ...DEFAULT_EDITOR_LAYOUT, leftPanelWidth: 480, rightPanelWidth: 510, timelineHeight: 420,
  leftPanelVisible: false, rightPanelVisible: true };

(async () => {
  assert.deepEqual(normalizeEditorLayout(), DEFAULT_EDITOR_LAYOUT);
  assert.equal(normalizeEditorLayout({ settingsPanelTab: 'reference' }).settingsPanelTab, 'text_settings', 'Obsolete tabs cannot restore an empty settings panel');
  const invalid = normalizeEditorLayout({ leftPanelWidth: Infinity, rightPanelWidth: -10,
    timelineHeight: 'bad', leftPanelVisible: 'false', rightPanelVisible: false });
  assert.deepEqual(invalid, { ...DEFAULT_EDITOR_LAYOUT, rightPanelVisible: false });
  for (const width of [0, 320, 800, 1280, 3000]) {
    for (const visible of [[false,false],[true,false],[false,true],[true,true]]) {
      const preferred = { ...layout, leftPanelWidth: 1500, rightPanelWidth: 1200,
        leftPanelVisible: visible[0], rightPanelVisible: visible[1] };
      const fit = fitEditorPanelWidths(preferred, width);
      assert.ok(Number.isFinite(fit.left) && Number.isFinite(fit.right));
      assert.ok(fit.left >= 0 && fit.right >= 0);
      assert.ok(fit.left + fit.right <= Math.max(0, width - 245) + 1e-8);
      assert.equal(preferred.leftPanelWidth, 1500, 'Viewport fitting must not erase preferred dimensions');
    }
  }
  const options = { access: { canSave: true, shouldWarnOnLoad: false }, requestAutoPlay: false };
  await loadProjectIntoEditor(project, options);
  assert.equal(dirty(), false);
  useProjectStore.getState().updateEditorLayout(layout);
  assert.equal(dirty(), true, 'Layout-only edits must enable Save and unsaved protection');
  const [save] = useProjectService();
  await save();
  const saved = JSON.parse(storage.get('lyrictorProjects'))[0];
  assert.deepEqual(saved.editorLayout, layout);
  assert.equal(dirty(), false);

  useProjectStore.getState().updateEditorLayout({ leftPanelVisible: true, timelineHeight: 200 });
  await loadProjectIntoEditor(importProjectJson(exportProjectJson(saved)), options);
  assert.deepEqual(useProjectStore.getState().editorLayout, layout, 'Save/export/import/load restores sizes and hidden-panel width');
  assert.equal(dirty(), false);
  await loadProjectIntoEditor(project, options);
  assert.deepEqual(useProjectStore.getState().editorLayout, DEFAULT_EDITOR_LAYOUT, 'Legacy project cannot inherit previous project layout');
  await loadProjectIntoEditor({ ...project, editorLayout: { rightPanelVisible: false } }, options);
  assert.deepEqual(useProjectStore.getState().editorLayout, { ...DEFAULT_EDITOR_LAYOUT, rightPanelVisible: false });

  auth.user = { uid: 'test-user' }; auth.storagePreference = 'cloud';
  useProjectStore.getState().updateEditorLayout(layout);
  const saving = save();
  assert.deepEqual(cloudProject.editorLayout, layout, 'Firebase receives the same project layout');
  useProjectStore.getState().updateEditorLayout({ timelineHeight: 500 });
  completeCloudSave(); await saving;
  assert.equal(dirty(), true, 'Resize during cloud save must remain unsaved');
  await loadProjectIntoEditor(cloudProject, options);
  assert.deepEqual(useProjectStore.getState().editorLayout, layout);
  assert.equal(dirty(), false);
  resetProjectEditorState();
  assert.deepEqual(useProjectStore.getState().editorLayout, DEFAULT_EDITOR_LAYOUT);
  const camera = { id: 7, text: '', start: 0, end: 30, textX: 0, textY: 0, textBoxTimelineLevel: 0,
    isCamera: true, cameraSettings: { overrides: [{ id: 'change-1', startOffset: 3, endOffset: 5 }] } };
  const workspace = normalizeEditorLayout({ ...layout, mediaPanelTab: 'effects', settingsPanelTab: 'element_settings',
    selectedItemIds: [7, 999], customizationPanelOpen: true, previewGrid: true, previewAllText: true,
    activeTool: 'cut', timelineZoom: 4, timelineScrollX: .4, timelineScrollY: .25, playheadPosition: 12,
    loopEnabled: true, loopStart: 10, loopEnd: 18, inspectorSections: { Focus: false },
    cameraEditors: { 7: { overrideId: 'change-1', endpoint: 'from' }, 999: { overrideId: 'gone', endpoint: 'to' } } });
  await loadProjectIntoEditor(importProjectJson(exportProjectJson({ ...project, lyricTexts: [camera], editorLayout: workspace })), options);
  let editor = useEditorStore.getState();
  assert.deepEqual([...editor.selectedLyricTextIds], [7], 'Deleted selections are discarded');
  assert.equal(editor.mediaPanelTabId, 'effects'); assert.equal(editor.customizationPanelTabId, 'element_settings');
  assert.equal(editor.isCustomizationPanelOpen, true);
  assert.equal(editor.showPreviewGrid, true); assert.equal(editor.showAllTextPreviewOverlay, true);
  assert.equal(editor.activeTimelineTool, 'cut');
  assert.deepEqual(editor.inspectorSections, { Focus: false });
  assert.deepEqual(editor.cameraEditors, { 7: { overrideId: 'change-1', endpoint: 'from' } });
  assert.equal(getEditorLayoutForSave().playheadPosition, 12, 'Saving before audio is ready preserves the pending playhead');
  const restored = resolveWorkspaceTimeline(workspace, 800, 30);
  assert.deepEqual(restored.interaction, { width: 3200, layerX: -1280, cursorX: 1280 });
  assert.equal(restored.position, 12); assert.deepEqual(restored.loopRange, { start: 10, end: 18 });
  completeTimelineWorkspaceRestore(useEditorStore.getState().pendingWorkspaceRestore, 800, 30, value => { audioPosition = value; });
  assert.equal(dirty(), false, 'Restoration itself must not make the project dirty');
  audioPosition = 14.25;
  assert.equal(getEditorLayoutForSave().playheadPosition, 14.25);
  assert.equal(dirty(), false, 'Playback alone must not make the project dirty');
  useEditorStore.getState().setMediaPanelTabId('images');
  assert.equal(useProjectStore.getState().editorLayout.mediaPanelTab, 'images');
  assert.equal(dirty(), true, 'Opening a different panel must be saved');
  useEditorStore.getState().setInspectorSectionOpen('Lens', false);
  useEditorStore.getState().setCameraEditor(7, { overrideId: 'change-1', endpoint: 'to' });
  assert.equal(getEditorLayoutForSave().inspectorSections.Lens, false);
  assert.equal(getEditorLayoutForSave().cameraEditors[7].endpoint, 'to');
  const short = resolveWorkspaceTimeline(workspace, 400, 2);
  assert.equal(short.position, 2);
  assert.ok(short.loopRange.start >= 0 && short.loopRange.end <= 2);
  assert.ok(short.interaction.layerX >= 400 - short.interaction.width);
  await loadProjectIntoEditor({ ...project, editorLayout: workspace }, options);
  assert.equal(useEditorStore.getState().selectedLyricTextIds.size, 0);
  assert.equal(useEditorStore.getState().isCustomizationPanelOpen, false);
  assert.deepEqual(useEditorStore.getState().cameraEditors, {});
  const unopened = restoreEditorWorkspace(normalizeEditorLayout(), [camera]);
  assert.deepEqual(unopened.cameraEditors, {}, 'An unopened camera must select from the playhead when opened, not project-load time');
  assert.equal(getWorkspaceHorizontalThumbX(-2400, 3200, 800, 200), 600);
  assert.equal(getWorkspaceHorizontalThumbX(-5000, 100000, 800, 20), 40);
  assert.equal(getWorkspaceHorizontalThumbX(-99999, 100000, 800, 20), 780, 'Minimum thumb size must not push the thumb outside its track');

  await loadProjectIntoEditor({ ...project, lyricTexts: [camera], editorLayout: workspace }, options);
  const pending = useEditorStore.getState().pendingWorkspaceRestore;
  useEditorStore.getState().setTimelineLoopRange({ start: 4, end: 9 });
  useEditorStore.getState().setMediaPanelTabId('images');
  useProjectStore.getState().updateEditorLayout({ timelineZoom: 3 });
  completeTimelineWorkspaceRestore(pending, 800, 30, value => { audioPosition = value; });
  assert.deepEqual(useEditorStore.getState().timelineLoopRange, { start: 4, end: 9 }, 'Restore must preserve loop edits made during loading');
  assert.equal(useEditorStore.getState().timelineInteractionState.width, 2400);
  assert.equal(useEditorStore.getState().mediaPanelTabId, 'images');
  assert.equal(dirty(), true, 'Edits made during audio loading must not be marked saved');
  useEditorStore.getState().setTimelineLoopRange({ start: 10, end: 18 });
  useEditorStore.getState().setMediaPanelTabId('effects');
  useProjectStore.getState().updateEditorLayout({ timelineZoom: 4, timelineScrollX: .4 });
  assert.equal(dirty(), false, 'Saved baseline must still describe the loaded project');

  await loadProjectIntoEditor(project, options);
  const stale = pending;
  let seeks = 0;
  assert.equal(completeTimelineWorkspaceRestore(stale, 800, 30, () => seeks++), undefined);
  assert.equal(seeks, 0, 'A previous project restore must never seek the new project');
  const fresh = useEditorStore.getState().pendingWorkspaceRestore;
  assert.equal(completeTimelineWorkspaceRestore(fresh, 800, 0, () => seeks++), undefined);
  assert.equal(seeks, 0, 'Restore must wait for audio duration');
  completeTimelineWorkspaceRestore(fresh, 800, 30, () => seeks++);
  assert.equal(dirty(), false, 'Legacy full-song loop initialization must stay clean');
  assert.equal(completeTimelineWorkspaceRestore(fresh, 800, 30, () => seeks++), undefined);
  assert.equal(seeks, 1, 'Restoration must run only once');
  useProjectStore.setState({ savedLyricTextsSnapshot: '' });
  useEditorStore.setState({ pendingWorkspaceRestore: normalizeEditorLayout() });
  completeTimelineWorkspaceRestore(useEditorStore.getState().pendingWorkspaceRestore, 800, 30, () => {});
  assert.equal(dirty(), true, 'Import must stay unsaved after audio restoration');
  console.log('Editor workspace passed: save/load/import, defaults, dirty tracking, save race, responsive zoom/scroll, tabs, selection, playhead, loop, preview and camera inspector state.');

})().catch(error => { console.error(error); process.exitCode = 1; });
