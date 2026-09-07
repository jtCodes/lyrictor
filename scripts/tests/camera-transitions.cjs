const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Load the pure camera math without a browser or an additional test dependency.
const modules = new Map();
function loadTypeScript(filename) {
  filename = path.resolve(filename);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function("require", "module", "exports", source)(
    (id) => loadTypeScript(path.resolve(path.dirname(filename), `${id}.ts`)),
    module,
    module.exports
  );
  return module.exports;
}

const cameraDir = path.resolve(__dirname, "../../src/Editor/Camera");
const { resolveCameraSettingsAtPosition: resolve } = loadTypeScript(`${cameraDir}/overrides.ts`);
const { normalizeCameraSettings } = loadTypeScript(`${cameraDir}/store.ts`);
const cues = [];
const targets = new Map();
const settings = normalizeCameraSettings({
  rotation: 170,
  overrides: [
    { id: "a", startOffset: 2, endOffset: 4, focalLength: 100, rotation: -170 },
    { id: "b", startOffset: 3, endOffset: 5, focalLength: 150, rotation: 160 },
  ],
});
const at = (time) => resolve(settings, cues, targets, 10, time);
assert.equal(at(11).focalLength, 50);
assert.equal(at(13).focalLength, 75); // Overlap starts from the in-flight value.
assert.equal(at(14).focalLength, 112.5);
assert.equal(at(16).focalLength, 150); // Override persists past its end.
assert.equal(at(13).rotation, 180); // Short rotation path across +/-180.
assert.equal(at(11).rotation, 170); // Backward seeks use base state.
assert.equal(resolve(settings, cues, targets, 20, 23).focalLength, 75);

const tiedOverrides = normalizeCameraSettings({ overrides: [
  { id: "b", startOffset: 1, endOffset: 2, focalLength: 150 },
  { id: "a", startOffset: 1, endOffset: 2, focalLength: 100 },
] });
assert.equal(resolve(tiedOverrides, cues, targets, 0, 2).focalLength, 150);
const editedSettings = { ...settings, focalLength: 60 };
assert.equal(resolve(editedSettings, cues, targets, 10, 11).focalLength, 60);

const preOverride = normalizeCameraSettings({ overrides: [{
  id: "pre", startOffset: 1, endOffset: 3, focalLength: 100,
  preOverride: { focalLength: 20 },
}] });
assert.equal(resolve(preOverride, cues, targets, 0, 1).focalLength, 20);
assert.equal(resolve(preOverride, cues, targets, 0, 2).focalLength, 60);

const focusSettings = normalizeCameraSettings({ focusChangeSpeed: 100, overrides: [
  { id: "lock", startOffset: 1, endOffset: 2, focusTargetId: 7, focusChangeSpeed: 100 },
  { id: "unlock", startOffset: 3, endOffset: 4, focusDistance: 0.4, focusChangeSpeed: 100 },
] });
const focusCues = [
  { id: 1, start: -1, cameraZPosition: 0 },
  { id: 2, start: 1, cameraZPosition: 0.1 },
  { id: 3, start: 2, cameraZPosition: 0.2 },
  { id: 4, start: 3, cameraZPosition: 0.9 },
];
const focusTargets = new Map([[7, { cameraZPosition: 0.8 }]]);
const focusAt = (time) => resolve(focusSettings, focusCues, focusTargets, 0, time);
assert.equal(focusAt(0).focusDistance, 0.5); // Ignore cues before camera start.
assert.equal(focusAt(1.2).focusDistance, 0.8); // Explicit target wins tied cue.
assert.equal(focusAt(2.5).focusDistance, 0.8); // Lock suppresses later cues.
assert.equal(focusAt(3.2).focusDistance, 0.9); // Manual override unlocks tied cue.
assert.equal(resolve(focusSettings, focusCues, new Map([[7, { cameraDepth: 0.6 }]]), 0, 2.5).focusDistance, 0.6);
assert.ok(Math.abs(resolve(focusSettings, [...focusCues, { id: 5, start: 4, cameraZPosition: 0.3 }], focusTargets, 0, 5).focusDistance - 0.3) < 1e-12);
assert.equal(resolve(normalizeCameraSettings({ focalLength: 80 }), cues, targets, 0, 0).focalLength, 80);

// Optional comparison against a saved pre-optimization resolver, including a
// deterministic randomized history, exact boundaries, and shuffled seek order.
if (process.env.CAMERA_BASELINE) {
  const baselinePath = path.resolve(process.env.CAMERA_BASELINE);
  // Resolve the baseline's relative imports from the real camera directory.
  const source = fs.readFileSync(baselinePath, "utf8");
  const module = { exports: {} };
  new Function("require", "module", "exports", ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)((id) => loadTypeScript(path.resolve(cameraDir, `${id}.ts`)), module, module.exports);
  const baseline = module.exports.resolveCameraSettingsAtPosition;
  let seed = 73;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const values = () => ({ focalLength: 18 + random() * 182, dollyPosition: random() * 200 - 100,
    truckPosition: random() * 200 - 100, tilt: random() * 180 - 90,
    focusDistance: random(), focusChangeSpeed: random() * 100, rotation: random() * 360 - 180 });
  let comparisons = 0;
  for (let trial = 0; trial < 30; trial++) {
    const start = random() * 10;
    const project = normalizeCameraSettings({ ...values(), overrides: Array.from({ length: 80 }, (_, i) => ({
      ...values(), id: String(i), startOffset: Math.floor(random() * 100), endOffset: random() * 105,
      focusTargetId: i % 3 === 0 ? 7 : undefined, preOverride: i % 4 === 0 ? values() : undefined,
    })) });
    const projectCues = Array.from({ length: 100 }, (_, i) => ({ id: i, start: i, cameraZPosition: random() }));
    const times = [-1, start, 200, ...project.overrides.flatMap((o) => [start + o.startOffset - 0.001, start + o.startOffset, start + o.endOffset]),
      ...Array.from({ length: 100 }, () => random() * 120)];
    for (const time of times) {
      assert.deepEqual(resolve(project, projectCues, focusTargets, start, time), baseline(project, projectCues, focusTargets, start, time));
      comparisons++;
    }
  }
  console.log(`${comparisons} exact comparisons against baseline passed.`);
  const project = normalizeCameraSettings({ overrides: Array.from({ length: 300 }, (_, i) => ({ ...values(), id: String(i), startOffset: i, endOffset: i + 2 })) });
  const projectCues = Array.from({ length: 600 }, (_, i) => ({ id: i, start: i / 2, cameraZPosition: random() }));
  const { performance } = require("node:perf_hooks");
  for (const [name, resolver] of [["baseline", baseline], ["cached", resolve]]) {
    for (let i = 0; i < 1000; i++) resolver(project, projectCues, targets, 0, 280 + i / 1000);
    const begin = performance.now();
    for (let i = 0; i < 10000; i++) resolver(project, projectCues, targets, 0, 280 + i / 10000);
    console.log(`${name}: ${(performance.now() - begin).toFixed(1)} ms for 10,000 late-timeline evaluations`);
  }
}
console.log("Camera transition tests passed.");
