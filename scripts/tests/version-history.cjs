const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  });
  return exports;
}
const data = new Map();
let quotaFailure = false;
global.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => {
  if (quotaFailure) throw new Error('QuotaExceededError');
  data.set(key, value);
} };
const history = load('src/Project/versionHistory.ts');
const project = { id: 'song', source: 'local', projectDetail: { name: 'Song', createdDate: new Date('2026-01-01'), updatedDate: new Date('2026-01-02') }, lyricTexts: [{ text: 'one' }], images: [], generatedImageLog: [], promptLog: [] };
const first = history.saveLocalProjectVersion(project);
assert.equal(first.versionHistory.length, 1);
assert.equal(first.versionName, 'Version 1');
const saved = history.saveLocalProjectVersion({ ...first, lyricTexts: [{ text: 'two' }] });
assert.equal(saved.versionHistory.length, 1, 'Save updates the active version');
assert.equal(saved.versionId, first.versionId);
assert.notEqual(saved.versionRevision, first.versionRevision);
const second = history.createLocalVersionFromSaved(project);
assert.equal(second.versionName, 'Version 2');
const oldEdited = history.saveLocalProjectVersion({ ...first, lyricTexts: [{ text: 'old edited' }] });
assert.equal(oldEdited.versionId, first.versionId);
assert.equal(history.loadLocalProjectHistory(project).versions.find(v => v.id === second.versionId).project.lyricTexts[0].text, 'two');
history.renameLocalVersion(project, first.versionId, 'Alternate intro');
assert.equal(history.readLocalProject(project).versionName, 'Alternate intro');
const before = data.get('lyrictorProjects');
quotaFailure = true;
assert.throws(() => history.saveLocalProjectVersion(project, 'manual'), /Quota/);
assert.equal(data.get('lyrictorProjects'), before);
quotaFailure = false;
history.deleteLocalVersion(project, first.versionId);
assert.equal(history.readLocalProject(project).versionId, undefined);
assert.equal(history.readLocalProject(project).lyricTexts[0].text, 'old edited');
const afterDelete = history.saveLocalProjectVersion(project);
assert.equal(afterDelete.versionName, 'Version 3', 'Saving an unversioned draft must not overwrite another version');
assert.equal(history.loadLocalProjectHistory(project).versions.find(v => v.id === second.versionId).project.lyricTexts[0].text, 'two');
assert.ok(afterDelete.versionHistory.every(v => !v.project.versionHistory));
assert.equal(history.snapshotProject({ ...project, versionHistory: second.versionHistory, uid: 'private' }).uid, undefined);
assert.deepEqual(history.newestVersionsFirst([
  { id: 'middle', createdAt: '2026-01-02T00:00:00Z' },
  { id: 'newest', createdAt: '2026-01-03T01:00:00+01:00' },
  { id: 'oldest', createdAt: '2026-01-01T00:00:00Z' },
]).map(v => v.id), ['newest', 'middle', 'oldest']);

// Real service functions with an atomic, in-memory Firestore adapter.
const docs = new Map();
let transactionFailure = false;
const reference = (...parts) => parts.filter(Boolean).map(part => typeof part === 'string' ? part : part.path).join('/');
const snap = path => ({ exists: () => docs.has(path), data: () => structuredClone(docs.get(path)), id: path.split('/').at(-1), ref: { path } });
const firestore = {
  collection: (...parts) => ({ path: reference(...parts) }), doc: (...parts) => ({ path: reference(...parts) }),
  getDoc: async ref => snap(ref.path),
  setDoc: async (ref, value) => { if (transactionFailure) throw new Error('Cloud unavailable'); docs.set(ref.path, structuredClone(value)); },
  deleteDoc: async ref => docs.delete(ref.path),
  deleteField: () => ({ deleteField: true }),
  getDocs: async ref => ({ docs: [...docs.keys()].filter(path => path.startsWith(ref.path + '/') && !path.slice(ref.path.length + 1).includes('/')).map(snap) }),
  runTransaction: async (_, callback) => {
    if (transactionFailure) throw new Error("Cloud unavailable");
    const pending = [];
    const result = await callback({ get: async ref => snap(ref.path),
      set: (ref, value) => pending.push(['set', ref.path, structuredClone(value)]),
      update: (ref, value) => pending.push(['update', ref.path, structuredClone(value)]),
      delete: ref => pending.push(['delete', ref.path]),
    });
    for (const [kind, path, value] of pending) {
      if (kind === 'delete') docs.delete(path);
      else {
        const next = kind === 'update' ? { ...docs.get(path), ...value } : value;
        Object.keys(next).forEach(key => { if (next[key]?.deleteField) delete next[key]; });
        docs.set(path, next);
      }
    }
    return result;
  },
};
const service = load('src/Project/firestoreProjectService.ts', {
  './versionHistory': history,
  './projectSerialization': load('src/Project/projectSerialization.ts'),
  'firebase/firestore': firestore,
  'firebase/storage': { ref: (_, path) => ({ path }), uploadBytes: async () => {}, getDownloadURL: async ref => 'https://assets.example/' + ref.path },
  '../api/firebase': { db: '' },
  './browserInfo': { withSavedBrowserInfo: value => value, withPublishedBrowserInfo: value => value },
});
(async () => {
  const image1 = await service.uploadBase64Image('owner', 'Song', 'data:image/png;base64,YQ==', 1);
  const image2 = await service.uploadBase64Image('owner', 'Song', 'data:image/png;base64,Yg==', 1);
  assert.notEqual(image1, image2, 'Changing an image never overwrites an older version asset');
  const cloudProject = { ...project, source: 'cloud' };
  const one = await service.saveProjectToFirestore('owner', cloudProject);
  const two = await service.saveProjectToFirestore('owner', { ...one, lyricTexts: [{ text: 'two' }] });
  let cloud = await service.loadCloudProjectHistory('owner', 'Song');
  assert.equal(cloud.versions.length, 1);
  assert.equal(two.versionId, one.versionId);
  assert.notEqual(two.versionRevision, one.versionRevision);
  const alternate = await service.createCloudVersionFromSaved('owner', 'Song');
  assert.equal(alternate.versionName, 'Version 2');
  await service.renameCloudVersion('owner', 'Song', alternate.versionId, 'New ending');
  assert.equal(docs.get('users/owner/projects/song').versionName, 'New ending');
  const beforeFailure = JSON.stringify([...docs]);
  transactionFailure = true;
  await assert.rejects(service.saveProjectToFirestore('owner', cloudProject, 'manual'), /Cloud unavailable/);
  assert.equal(JSON.stringify([...docs]), beforeFailure);
  transactionFailure = false;
  const publicId = await service.publishSavedVersion('owner', 'creator', { ...cloudProject, lyricTexts: [{ text: 'UNSAVED' }] }, one.versionId);
  assert.equal(docs.get('published/' + publicId).lyricTexts[0].text, 'two', 'Publish reads the saved version, never inflight edits');
  assert.equal(docs.get('published/' + publicId).versionId, one.versionId);
  const publishedVersion = docs.get('published/' + publicId).publishedVersion;
  assert.deepEqual(publishedVersion, {
    id: two.versionId, name: 'Version 1', number: 1, revision: two.versionRevision,
    createdAt: cloud.versions[0].createdAt,
    updatedAt: (await service.loadCloudProjectHistory('owner', 'Song')).versions.find(v => v.id === one.versionId).updatedAt,
    source: 'cloud',
  });
  assert.ok(docs.get('published/' + publicId).publishedAt);
  assert.equal(history.snapshotProject(docs.get('published/' + publicId)).publishedVersion, undefined);
  await service.renameCloudVersion('owner', 'Song', one.versionId, 'Renamed after publishing');
  assert.deepEqual(docs.get('published/' + publicId).publishedVersion, publishedVersion);
  assert.equal(docs.get('published/' + publicId).versionHistory, undefined);
  const liveBefore = JSON.stringify(docs.get('published/' + publicId));
  const changed = await service.saveProjectToFirestore('owner', { ...one, lyricTexts: [{ text: 'three' }] });
  assert.equal(JSON.stringify(docs.get('published/' + publicId)), liveBefore);
  assert.notEqual(changed.versionRevision, docs.get('published/' + publicId).versionRevision);
  cloud = await service.loadCloudProjectHistory('owner', 'Song');
  assert.equal(cloud.versions.length, 2);
  assert.equal(cloud.versions.find(v => v.id === alternate.versionId).project.lyricTexts[0].text, 'two');
  await service.publishSavedVersion('owner', 'creator', cloudProject, one.versionId);
  assert.equal(docs.get('published/' + publicId).lyricTexts[0].text, 'three');
  const publishedBeforeDelete = JSON.stringify(docs.get('published/' + publicId));
  await service.deleteCloudVersion('owner', 'Song', one.versionId);
  assert.equal(docs.get('users/owner/projects/song').versionId, undefined);
  assert.equal(docs.get('users/owner/projects/song').versionName, undefined);
  assert.equal(docs.get('users/owner/projects/song').lyricTexts[0].text, 'three');
  assert.equal(JSON.stringify(docs.get('published/' + publicId)), publishedBeforeDelete);
  await assert.rejects(service.publishSavedVersion('owner', 'creator', cloudProject, one.versionId), /no longer available/);
  const third = await service.saveProjectToFirestore('owner', cloudProject);
  assert.equal(third.versionName, 'Version 3');
  await service.unpublishProject(publicId, 'owner');
  assert.equal((await service.loadCloudProjectHistory('owner', 'Song')).versions.length, 2);
  const localPublic = await service.publishSavedVersion('owner', 'creator', project, second.versionId);
  assert.equal(docs.get('published/' + localPublic).lyricTexts[0].text, 'two');
  assert.equal(docs.get('published/' + localPublic).publishedVersion.source, 'local');
  assert.equal(docs.get('published/' + localPublic).publishedVersion.id, second.versionId);
  const unavailableAudio = history.saveLocalProjectVersion({ ...project, projectDetail: { ...project.projectDetail, isLocalUrl: true } }, 'manual');
  await assert.rejects(service.publishSavedVersion('owner', 'creator', project, unavailableAudio.versionId), /local audio/);
  const desktop = load('src/desktop/bridge.ts');
  global.window = { location: { hash: '#/lyrictor/local?versionPreview=lyrictor-version-preview:test', origin: 'file://' },
    parent: { location: { origin: 'file://' }, lyrictorDesktop: { getAppInfo: async () => 'desktop preview' } } };
  assert.equal(await desktop.getDesktopAppInfo(), 'desktop preview');
  window.parent.location.origin = 'https://unrelated.example';
  await assert.rejects(desktop.getDesktopAppInfo(), /bridge is unavailable/);
  window.parent.location.origin = 'file://';
  window.location.hash = '#/lyrictor/local';
  await assert.rejects(desktop.getDesktopAppInfo(), /bridge is unavailable/);
  console.log('Version checks passed: first Save, active-version saves, manual duplication, ordering, rename, deletion, atomic failures, and isolated publishing.');
})().catch(error => { console.error(error); process.exitCode = 1; });
