const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const warnings = [], diagnostics = [], timers = new Map();
const browser = { isSafariBrowser: true };
function events(extra = {}) {
  const listeners = new Map();
  return { ...extra, listeners,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
    emit: name => listeners.get(name)?.(),
  };
}
const document = events({ visibilityState: 'visible' });
let timerId = 0, calls = 0, suspends = 0;
const window = events({
  setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
  clearTimeout: id => timers.delete(id),
});
const context = { state: 'running', currentTime: 12, sampleRate: 48000,
  resume: () => { calls++; context.state = 'running'; return Promise.resolve(); },
  suspend: () => { suspends++; context.state = 'suspended'; return Promise.resolve(); },
};
const Howler = { ctx: context, usingWebAudio: true, volume: () => 0.4, masterGain: { gain: { value: 0.4 } } };
const moduleUnderTest = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../src/Project/resumePlaybackAudio.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('exports', 'require', 'document', 'window', 'console', source)(moduleUnderTest.exports,
  id => {
    if (id === 'howler') return { Howler };
    if (id === '../utils') return browser;
    throw new Error(`Unexpected dependency: ${id}`);
  }, document, window, { warn: (...args) => warnings.push(args), info: (...args) => diagnostics.push(args) });
const { resumePlaybackAudio, registerPlaybackAudio } = moduleUnderTest.exports;
(async () => {
  assert.equal(resumePlaybackAudio(), undefined);
  browser.isSafariBrowser = false;
  const unregisterOther = registerPlaybackAudio(() => undefined);
  assert.equal(document.listeners.size, 0, 'No lifecycle listeners outside Safari');
  unregisterOther();
  for (const state of ['suspended', 'interrupted', 'closed']) {
    context.state = state;
    assert.equal(resumePlaybackAudio(), undefined);
  }
  assert.equal(calls, 0, 'Non-Safari contexts are not modified');
  browser.isSafariBrowser = true;
  for (const state of ['suspended', 'interrupted']) {
    context.state = state;
    const before = calls;
    const recovery = resumePlaybackAudio();
    assert.equal(calls, before + 1, 'Resume starts in the original event');
    assert.equal(await recovery, true);
  }
  let playing = true;
  const player = { playing: () => playing, volume: () => 0.4, mute: () => false };
  const unregister = registerPlaybackAudio(() => player);
  const unregisterDuplicate = registerPlaybackAudio(() => player);
  assert.equal(document.listeners.size, 1, 'Consumers share one listener');
  document.visibilityState = 'hidden';
  document.emit('visibilitychange');
  assert.equal(suspends, 0, 'Active background playback is preserved');
  playing = false;
  document.emit('visibilitychange');
  window.emit('pagehide');
  assert.equal(suspends, 1, 'Paused context suspends once, without resetting the track');
  context.state = 'running'; // Safari can report running even though its output is stale.
  document.visibilityState = 'visible';
  document.emit('visibilitychange');
  const before = calls;
  assert.equal(await resumePlaybackAudio(), true);
  assert.equal(calls, before + 1, 'Parked context resumes even if its reported state is running');
  assert.equal(diagnostics.at(-1)[1].before.players[0].volume, 0.4);
  assert.equal(context.currentTime, 12, 'Recovery does not seek');
  assert.equal(Howler.masterGain.gain.value, 0.4, 'Recovery does not change gain');
  context.state = 'suspended';
  let lateResume;
  context.resume = () => { calls++; return new Promise(resolve => { lateResume = resolve; }); };
  const pending = resumePlaybackAudio();
  assert.equal(resumePlaybackAudio(), pending, 'Concurrent recovery shares one attempt');
  for (const timer of [...timers.values()]) timer();
  assert.equal(await pending, false, 'A stuck browser promise has a bounded timeout');
  const infoCount = diagnostics.length;
  context.state = 'running';
  lateResume();
  await Promise.resolve();
  assert.equal(diagnostics.length, infoCount, 'Late results cannot report a timed-out request as successful');
  context.state = 'suspended';
  context.resume = () => Promise.reject(new Error('NotAllowedError'));
  assert.equal(await resumePlaybackAudio(), false);
  assert.equal(warnings.at(-1)[1].after.masterGain, 0.4);
  context.resume = () => Promise.resolve();
  assert.equal(await resumePlaybackAudio(), false, 'Resolved resume must restore running state');
  context.resume = () => { throw new Error('closed'); };
  assert.equal(await resumePlaybackAudio(), false);
  Howler.usingWebAudio = false;
  assert.equal(resumePlaybackAudio(), undefined);
  unregisterDuplicate();
  assert.equal(document.listeners.size, 1);
  unregister();
  assert.equal(document.listeners.size, 0);
  assert.equal(window.listeners.size, 0);
  assert.equal(timers.size, 0);
  console.log('Safari audio lifecycle, timeout, diagnostics, and non-Safari bypass checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
