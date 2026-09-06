const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    id => load(path.resolve(path.dirname(file), `${id}.ts`)), module, module.exports);
  return module.exports;
}
const { exportProjectJson, importProjectJson } = load(path.resolve(__dirname, '../../src/Project/projectJson.ts'));
const project = {
  id: 'AI test', projectDetail: { name: 'AI test', createdDate: new Date('2026-09-06T12:00:00Z'),
    audioFileName: 'song.mp3', audioFileUrl: 'blob:local-audio', isLocalUrl: true, editingMode: 'free',
    playbackAudioFileUrl: 'blob:runtime', cachedAudioFilePath: '/cache/song.mp3' },
  lyricTexts: [{ id: 1, start: 0, end: 30, text: '', textX: 0, textY: 0, textBoxTimelineLevel: 0,
    isCamera: true, cameraSettings: { focalLength: 70, overrides: [
      { id: 'change-1', startOffset: 2, endOffset: 4, focalLength: 120, focusTargetId: 2, preOverride: { rotation: 45 } },
    ] } }, { id: 2, start: 1, end: 9, text: 'Hello', textX: 20, textY: 30, textBoxTimelineLevel: 1 }],
  images: [{ url: 'https://example.com/image.png' }], promptLog: [], generatedImageLog: [], lyricReference: 'Unsaved lyrics',
};
const json = exportProjectJson(project);
assert.ok(!json.includes('playbackAudioFileUrl') && !json.includes('cachedAudioFilePath'));
assert.equal(JSON.parse(json).projectDetail.createdDate, '2026-09-06T12:00:00.000Z');
const result = importProjectJson(json);
assert.deepEqual(result.lyricTexts, project.lyricTexts);
assert.equal(result.lyricReference, 'Unsaved lyrics');
assert.ok(result.projectDetail.createdDate instanceof Date);
assert.deepEqual(importProjectJson('\uFEFF' + json).images, project.images);
const modified = JSON.parse(json);
modified.lyricTexts[0].cameraSettings.overrides[0].focalLength = 150;
assert.equal(importProjectJson(JSON.stringify(modified)).lyricTexts[0].cameraSettings.overrides[0].focalLength, 150);
for (const edit of [
  p => { p.lyricTexts = null; },
  p => { p.lyricTexts[1].id = 1; },
  p => { p.lyricTexts[0].end = -1; },
  p => { p.projectDetail.createdDate = 'bad'; },
  p => { p.lyricTexts[0].cameraSettings.overrides = {}; },
  p => { p.lyricTexts[0].cameraSettings.overrides[0].endOffset = 1; },
  p => { p.lyricTexts[0].cameraSettings.overrides[0].focalLength = 'oops'; },
  p => { p.images = [null]; },
]) {
  const bad = JSON.parse(json); edit(bad);
  assert.throws(() => importProjectJson(JSON.stringify(bad)));
}
assert.throws(() => importProjectJson('{broken'));
assert.throws(() => importProjectJson('{"__proto__":{}}'));
assert.equal(project.lyricTexts[0].cameraSettings.overrides[0].focalLength, 120, 'Export/import must not mutate input');
console.log('Project JSON checks passed: round trip, dates, camera edits, runtime exclusions, malformed imports.');
