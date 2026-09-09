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

const publishedFixture = { ...project, versionId: 'published', versionName: 'Version 2', versionRevision: 'r2', publishedAt: '2026-01-10T00:00:00Z' };
const lockedFixture = { id: 'published', number: 2, revision: 'r2', createdAt: '2026-01-02T00:00:00Z', lockedAt: publishedFixture.publishedAt, project };
const oldDraft = { id: 'old', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z', project };
const newerDraft = { id: 'editing', createdAt: '2026-01-04T00:00:00Z', updatedAt: '2026-01-12T00:00:00Z', project };
assert.equal(history.chooseEditableProject(project, [lockedFixture, oldDraft], publishedFixture).draftFrom.id, 'published');
assert.equal(history.chooseEditableProject(project, [newerDraft, lockedFixture], publishedFixture).versionId, 'editing');
assert.equal(history.chooseEditableProject(project, [lockedFixture]).draftFrom.id, 'published');
assert.equal(history.chooseEditableProject(project, []).versionId, undefined);

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
      const old = docs.get(path);
      if (path.includes('/versions/') && old?.lockedAt && kind !== 'delete') {
        const next = kind === 'update' ? { ...old, ...value } : value;
        assert.deepEqual({ ...next, name: undefined }, { ...old, name: undefined }, 'Locked cloud content cannot change');
      }
    }
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
  const lockedOne = (await service.loadCloudProjectHistory('owner', 'Song')).versions.find(v => v.id === one.versionId);
  assert.ok(lockedOne.lockedAt);
  const changed = await service.saveProjectToFirestore('owner', { ...one, lyricTexts: [{ text: 'three' }] });
  assert.notEqual(changed.versionId, one.versionId, 'Saving a locked version forks instead of overwriting');
  assert.equal(changed.versionName, 'Version 3');
  assert.equal(JSON.stringify(docs.get('published/' + publicId)), liveBefore);
  cloud = await service.loadCloudProjectHistory('owner', 'Song');
  assert.equal(cloud.versions.length, 3);
  assert.deepEqual(cloud.versions.find(v => v.id === one.versionId), lockedOne);
  const updated = await service.saveProjectToFirestore('owner', { ...changed, lyricTexts: [{ text: 'four' }] });
  assert.equal(updated.versionId, changed.versionId, 'Later saves keep updating the new editable version');
  const beforePublishFailure = JSON.stringify([...docs]);
  transactionFailure = true;
  await assert.rejects(service.publishSavedVersion('owner', 'creator', cloudProject, alternate.versionId), /Cloud unavailable/);
  assert.equal(JSON.stringify([...docs]), beforePublishFailure, 'Cloud lock and publication commit together');
  transactionFailure = false;
  await service.publishSavedVersion('owner', 'creator', cloudProject, changed.versionId);
  assert.equal(docs.get('published/' + publicId).lyricTexts[0].text, 'four');
  await service.unpublishProject(publicId, 'owner');
  cloud = await service.loadCloudProjectHistory('owner', 'Song');
  const lockedChanged = cloud.versions.find(v => v.id === changed.versionId);
  assert.ok(lockedChanged.lockedAt, 'Unpublishing does not unlock content');
  const draft = history.draftFromVersion(cloudProject, lockedChanged);
  assert.equal(draft.versionId, undefined);
  assert.equal(draft.draftFrom.id, changed.versionId);
  const next = await service.saveProjectToFirestore('owner', draft);
  assert.equal(next.versionName, 'Version 4');
  assert.equal(next.draftFrom, undefined);
  await service.deleteCloudVersion('owner', 'Song', one.versionId);
  assert.equal(docs.get('users/owner/projects/song').versionId, next.versionId);
  await assert.rejects(service.publishSavedVersion('owner', 'creator', cloudProject, one.versionId), /no longer available/);
  const localPublic = await service.publishSavedVersion('owner', 'creator', project, second.versionId);
  assert.equal(docs.get('published/' + localPublic).lyricTexts[0].text, 'two');
  assert.equal(docs.get('published/' + localPublic).publishedVersion.source, 'local');
  assert.equal(docs.get('published/' + localPublic).publishedVersion.id, second.versionId);
  const localLocked = history.readLocalProject(project).versionHistory.find(v => v.id === second.versionId);
  assert.ok(localLocked.lockedAt);
  const localCopy = history.saveLocalProjectVersion({ ...second, lyricTexts: [{ text: 'changed local' }] });
  assert.notEqual(localCopy.versionId, second.versionId);
  assert.deepEqual(history.readLocalProject(project).versionHistory.find(v => v.id === second.versionId), localLocked);
  await service.unpublishProject(localPublic, 'owner');
  assert.ok(history.readLocalProject(project).versionHistory.find(v => v.id === second.versionId).lockedAt);
  assert.throws(() => history.updateVersion(localLocked, project), /locked/);

  const resolver = load('src/Project/resolveProjectForEditing.ts', { './versionHistory': history, './firestoreProjectService': service });
  assert.equal((await resolver.resolveProjectForEditing(cloudProject, 'owner')).versionId, next.versionId);
  const legacy = { ...cloudProject, id: 'legacy', projectDetail: { ...project.projectDetail, name: 'Legacy' } };
  docs.set('users/owner/projects/legacy', legacy);
  const legacyDraft = await resolver.resolveProjectForEditing(legacy, 'owner');
  assert.equal(legacyDraft.versionId, undefined);
  assert.equal((await service.saveProjectToFirestore('owner', legacyDraft)).versionName, 'Version 1');
  const otherCreator = { ...project, uid: 'someone-else' };
  assert.equal(await resolver.resolveProjectForEditing(otherCreator, 'owner'), otherCreator);
  await service.publishSavedVersion('owner', 'creator', cloudProject, next.versionId);
  delete docs.get('users/owner/projects/song/versions/' + next.versionId).lockedAt;
  const migrated = await service.saveProjectToFirestore('owner', next);
  assert.notEqual(migrated.versionId, next.versionId, 'Legacy published revisions also fork');
  assert.ok(docs.get('users/owner/projects/song/versions/' + next.versionId).lockedAt);
  const localFailureVersion = history.saveLocalProjectVersion(project, 'manual');
  transactionFailure = true;
  await assert.rejects(service.publishSavedVersion('owner', 'creator', project, localFailureVersion.versionId), /remains locked/);
  transactionFailure = false;
  assert.ok(history.readLocalProject(project).versionHistory.find(v => v.id === localFailureVersion.versionId).lockedAt);
  await service.publishSavedVersion('owner', 'creator', project, localFailureVersion.versionId);
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
  console.log('Locked publication and draft checks passed: first Save, active-version saves, manual duplication, ordering, rename, deletion, atomic failures, and isolated publishing.');
})().catch(error => { console.error(error); process.exitCode = 1; });
