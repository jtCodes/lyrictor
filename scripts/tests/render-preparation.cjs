const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'module', source)(module.exports, module);
  return module.exports;
}
const { collectPreparationCandidates, registerRenderPreparation } = load('Editor/Rendering/renderPreparation.ts');
const { PlaybackPreparation } = load('Project/playbackPreparation.ts');
const items = [{ id: 1, kind: 'text' }, { id: 2, kind: 'image' }, { id: 3, kind: 'text' }];
const policies = [
  { needsPreparation: (item, scene) => scene.cpu && item.kind === 'text' },
  { needsPreparation: item => item.kind === 'image' },
];
assert.deepEqual([...collectPreparationCandidates(items, { cpu: true }, policies)], [1, 2, 3]);
assert.deepEqual([...collectPreparationCandidates(items, { cpu: false }, policies)], [2],
  'A new renderer can select assets independently of text and CPU blur support');

(async () => {
  const queue = new PlaybackPreparation();
  const order = [], released = [];
  let plays = 0;
  let complete;
  const first = { id: 'custom effect' }, second = { id: 'bitmap' };
  const renderer = {
    estimate: target => target === first ? 200 : 100,
    release: target => released.push(target),
    prepare: (target, signal) => {
      order.push(target);
      if (target === second) return Promise.resolve();
      return new Promise(resolve => { complete = resolve; signal.addEventListener('abort', resolve, { once: true }); });
    },
  };
  const stopFirst = registerRenderPreparation(queue, renderer, first);
  const stopSecond = registerRenderPreparation(queue, renderer, second);
  queue.requestPlay(() => plays++);
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.deepEqual(order, [first]);
  assert.equal(plays, 0);
  complete();
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.deepEqual(order, [first, second], 'Heterogeneous render targets use one queue');
  assert.equal(plays, 1);
  stopFirst(); stopSecond();
  assert.deepEqual(released, [first, second, first, second], 'Shared registration owns invalidation and cleanup');

  // Asset-dependent estimates must not break the common playback gate.
  queue.register({ priority: () => { throw new Error('Image not decoded yet'); }, run: async () => {} });
  queue.register({ priority: () => 100, run: async () => {} });
  queue.requestPlay(() => plays++);
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(plays, 2);
  console.log('Shared render preparation passed: independent policies, heterogeneous targets, common lifecycle, asset readiness and playback gate.');
})().catch(error => { console.error(error); process.exitCode = 1; });
