const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/Project/usePreparedAudioPlayer.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function setup(resume) {
  let playing = false, starts = 0;
  const queued = [], cleanups = [];
  const player = { playing: () => playing, play: () => { starts++; playing = true; } };
  const audio = { player, playing: false, pause: () => { playing = false; } };
  const exports = {};
  new Function('exports', 'require', source)(exports, id => {
    if (id === 'react') return { useCallback: f => f, useRef: current => ({ current }), useEffect: f => { const cleanup = f(); if (cleanup) cleanups.push(cleanup); } };
    if (id === 'react-use-audio-player') return { useAudioPlayer: () => audio };
    if (id === '@react-spectrum/toast') return { ToastQueue: { negative() {} } };
    if (id === './resumePlaybackAudio') return { registerPlaybackAudio: () => () => {}, resumePlaybackAudio: () => resume };
    if (id === './PlaybackPreparationProvider') return { usePlaybackPreparation: () => ({ requestPlay: f => queued.push(f), cancelPlay() {} }) };
    throw new Error(id);
  });
  return { api: exports.useAudioPlayer(), queued, cleanups, starts: () => starts };
}
(async () => {
  for (const resume of [undefined, Promise.resolve(true)]) {
    const test = setup(resume);
    const flush = async () => { test.queued.splice(0).forEach(f => f()); await Promise.resolve(); };
    test.api.play(); test.api.play(); await flush();
    assert.equal(test.starts(), 1, 'Rapid requests start once');
    test.api.play(); await flush();
    assert.equal(test.starts(), 1, 'Already-playing audio does not stack');
    test.api.pause(); test.api.play(); await flush();
    assert.equal(test.starts(), 2, 'Paused audio can resume');
    test.api.pause(); test.api.play(); test.api.pause(); await flush();
    assert.equal(test.starts(), 2, 'Pause invalidates pending preparation');
    test.api.play(); test.cleanups.forEach(f => f()); await flush();
    assert.equal(test.starts(), 2, 'Unmount invalidates pending preparation');
  }
  console.log('Prepared audio start checks passed');
})();
