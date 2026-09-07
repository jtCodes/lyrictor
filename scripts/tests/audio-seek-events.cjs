const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
let position = 0;
let frame;
const subscriptions = [];
const player = { seek(next) { if (next !== undefined) position = next; return position; }, duration: () => 100 };
global.requestAnimationFrame = callback => { frame = callback; return 1; };
global.cancelAnimationFrame = () => {};
const mocks = {
  react: {
    useCallback: callback => callback,
    useMemo: callback => callback(),
    useSyncExternalStore: (subscribe, snapshot) => { subscriptions.push(subscribe(() => {})); return snapshot(); },
  },
  howler: { Howler: { _howls: [player] } },
};
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('require','module','exports',source)(name => mocks[name] || load(path.resolve(path.dirname(file),name+'.ts')), module, module.exports);
  return module.exports;
}
const directory = path.resolve(__dirname, '../../src/Editor/AudioTimeline');
const events = load(`${directory}/audioSeekEvents.ts`);
const { useAudioPosition } = load(`${directory}/useAudioPosition.ts`);
const received = [];
const unsubscribe = events.subscribeToUserSeek(value => received.push(value));
const { seek } = useAudioPosition({ highRefreshRate: true });
position = 8; frame();
assert.deepEqual(received, [], 'Playback ticks must not select inspector state');
seek(0);
assert.deepEqual(received, [], 'Programmatic loop/export seek must not select inspector state');
seek(12, { userInitiated: true });
seek(12, { userInitiated: true });
assert.deepEqual(received, [12,12], 'Even a repeated explicit seek must override manual inspector selection');
const later = [];
const unsubscribeLater = events.subscribeToUserSeek(value => later.push(value));
assert.deepEqual(later, [], 'Mounting/subscribing must not replay old user navigation');
unsubscribe();
seek(20, { userInitiated: true });
assert.deepEqual(received, [12,12], 'Unmounted panels must not receive events');
assert.deepEqual(later, [20]);
unsubscribeLater(); subscriptions.forEach(cleanup => cleanup());
console.log('User seek tests passed: explicit/repeated seeks, playback, programmatic seeks, subscription cleanup.');
