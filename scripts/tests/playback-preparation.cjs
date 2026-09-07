const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(name, dependencies = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../src/Project', name), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('exports', 'module', 'require', source)(module.exports, module, id => {
    assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
    return dependencies[id];
  });
  return module.exports;
}
const { PlaybackPreparation } = load('playbackPreparation.ts');
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

(async () => {
  const gate = new PlaybackPreparation();
  const expensive = deferred(), smaller = deferred();
  const order = [];
  gate.register({ priority: () => 100, run: async () => { order.push('smaller'); await smaller.promise; } });
  gate.register({ priority: () => 1000, run: async () => { order.push('expensive'); await expensive.promise; } });
  let plays = 0;
  gate.requestPlay(() => plays++);
  await tick();
  assert.deepEqual(order, ['expensive'], 'Prepare the largest image first');
  assert.equal(plays, 0, 'Play must wait for the actual worker result');
  expensive.resolve();
  await tick();
  assert.deepEqual(order, ['expensive', 'smaller']);
  assert.equal(gate.getSnapshot().completed, 1);
  assert.equal(plays, 0, 'Finishing one image does not unlock playback');
  smaller.resolve();
  await tick();
  assert.equal(plays, 1);
  assert.equal(gate.getSnapshot().preparing, false);
  gate.requestPlay(() => plays++);
  assert.equal(plays, 2, 'Replay uses completed preparation immediately');

  const changed = deferred();
  gate.register({ priority: () => 100, run: () => changed.promise });
  gate.togglePlayRequest(() => plays++);
  assert.equal(gate.getSnapshot().queued, true);
  gate.togglePlayRequest(() => plays++);
  assert.equal(gate.getSnapshot().queued, false, 'Second press cancels queued playback');
  changed.resolve();
  await tick();
  assert.equal(plays, 2);

  // A Konva root can register its text refs after the surrounding page commits.
  const scene = new PlaybackPreparation(), barrier = deferred(), text = deferred();
  scene.register({ priority: () => Infinity, run: () => barrier.promise });
  scene.requestPlay(() => plays++);
  await tick();
  scene.register({ priority: () => 100, run: () => text.promise });
  barrier.resolve();
  await tick();
  assert.equal(plays, 2, 'Scene commit barrier must include jobs registered later');
  text.resolve();
  await tick();
  assert.equal(plays, 3);

  const abandoned = new PlaybackPreparation();
  let aborted = false;
  const unregister = abandoned.register({ priority: () => 1, run: signal => new Promise(resolve => {
    signal.addEventListener('abort', () => { aborted = true; resolve(); });
  }) });
  abandoned.requestPlay(() => plays++);
  await tick();
  unregister();
  await tick();
  assert.equal(aborted, true);
  assert.equal(plays, 3, 'Leaving a project must never start its queued audio');

  // Exercise the transport adapter used by buttons, keyboard and autoplay.
  const transportGate = new PlaybackPreparation(), worker = deferred();
  transportGate.register({ priority: () => 1, run: () => worker.promise });
  let pauses = 0;
  const audio = { playing: false, player: { play: () => plays++ }, pause: () => pauses++ };
  const { useAudioPlayer } = load('usePreparedAudioPlayer.ts', {
    react: { useRef: value => ({ current: value }), useCallback: callback => callback },
    'react-use-audio-player': { useAudioPlayer: () => audio },
    './PlaybackPreparationProvider': { usePlaybackPreparation: () => transportGate },
  });
  const controls = useAudioPlayer();
  controls.play();
  assert.equal(plays, 3, 'Autoplay also waits');
  controls.pause();
  worker.resolve();
  await tick();
  assert.equal(plays, 3, 'Pause cancels an autoplay request');
  assert.equal(pauses, 1);
  controls.togglePlayPause();
  assert.equal(plays, 4);
  audio.playing = true;
  controls.togglePlayPause();
  assert.equal(pauses, 2, 'Pause remains immediate');
  const failed = new PlaybackPreparation();
  const warn = console.warn;
  let failures = 0;
  console.warn = () => failures++;
  try {
    failed.register({ priority: () => 1, run: async () => { throw new Error('Worker unavailable'); } });
    failed.requestPlay(() => plays++);
    await tick();
    assert.equal(failures, 1);
    assert.equal(failed.getSnapshot().preparing, false, 'A failed task must not leave playback stuck');
    assert.equal(plays, 5, 'Failed preparation falls back to the existing live renderer');
  } finally { console.warn = warn; }
  console.log('Playback preparation passed: complete-before-play, size priority, replay, revised scenes, Konva commit barrier, cancellation and guarded transport.');
})().catch(error => { console.error(error); process.exitCode = 1; });
