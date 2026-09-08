const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = ts.transpileModule(fs.readFileSync('src/fullscreen.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function load(userAgent = 'iPhone') {
  const listeners = new Map();
  const events = [];
  const style = () => {
    const values = new Map([['overflow', ['auto', 'important']]]);
    return { getPropertyValue: k => values.get(k)?.[0] ?? '', getPropertyPriority: k => values.get(k)?.[1] ?? '',
      setProperty: (k,v,p = '') => values.set(k,[v,p]), removeProperty: k => values.delete(k) };
  };
  const document = { documentElement: { style: style() }, body: { style: style() },
    addEventListener: (k,fn) => listeners.set(k,fn), removeEventListener: k => listeners.delete(k),
    dispatchEvent: e => events.push(e.type) };
  const context = { document, navigator: { userAgent }, Event: class { constructor(type) { this.type = type; } }, exports: {} };
  vm.runInNewContext(source, context);
  return { api: context.exports, document, listeners, events };
}
(async () => {
  const phone = load();
  await phone.api.requestDocumentFullscreen();
  assert.equal(phone.api.isDocumentFullscreen(), true);
  assert.equal(phone.document.body.style.getPropertyValue('overflow'), 'auto', 'Do not lock page scrolling and interfere with Safari toolbar collapse');
  assert.equal(phone.document.documentElement.style.getPropertyValue('overflow'), 'auto');
  assert.equal(phone.events.length, 1);
  await phone.api.requestDocumentFullscreen();
  assert.equal(phone.events.length, 1, 'Repeated entry must not lose saved scroll styles');
  phone.listeners.get('keydown')({ key: 'Escape' });
  assert.equal(phone.api.isDocumentFullscreen(), false);
  assert.equal(phone.document.body.style.getPropertyValue('overflow'), 'auto');
  assert.equal(phone.document.body.style.getPropertyPriority('overflow'), 'important');
  assert.equal(phone.listeners.size, 0);
  const native = load('Android');
  native.document.documentElement.requestFullscreen = async options => {
    assert.equal(options.navigationUI, 'hide');
    native.document.fullscreenElement = {};
  };
  native.document.exitFullscreen = async () => { native.document.fullscreenElement = null; };
  await native.api.requestDocumentFullscreen();
  assert.equal(native.api.isDocumentFullscreen(), true, 'Native mobile fullscreen must be recognized');
  assert.equal(native.events.length, 0, 'Prefer native fullscreen to fallback');
  await native.api.exitDocumentFullscreen();
  assert.equal(native.api.isDocumentFullscreen(), false);
  const rejected = load();
  rejected.document.documentElement.requestFullscreen = async () => { throw new Error('Unsupported'); };
  await rejected.api.requestDocumentFullscreen();
  assert.equal(rejected.api.isDocumentFullscreen(), true);
  await rejected.api.exitDocumentFullscreen();
  const unsupported = load();
  unsupported.document.fullscreenEnabled = false;
  unsupported.document.documentElement.requestFullscreen = () => { assert.fail('Do not attempt a native request the browser explicitly disables'); };
  await unsupported.api.requestDocumentFullscreen();
  assert.equal(unsupported.api.isDocumentFullscreen(), true);
  await unsupported.api.exitDocumentFullscreen();
  const desktop = load('Desktop');
  await desktop.api.requestDocumentFullscreen();
  desktop.document.documentElement.requestFullscreen = async () => { throw new Error('Denied'); };
  await assert.rejects(desktop.api.requestDocumentFullscreen(), /Denied/);
  assert.equal(desktop.api.isDocumentFullscreen(), false);
  // Desktop behavior: no new options, no fallback, route changes retain native
  // fullscreen, browser Escape is reflected by the native document state.
  for (const [enterName, stateName, exitName] of [
    ['requestFullscreen', 'fullscreenElement', 'exitFullscreen'],
    ['webkitRequestFullscreen', 'webkitFullscreenElement', 'webkitExitFullscreen'],
    ['webkitRequestFullScreen', 'webkitCurrentFullScreenElement', 'webkitCancelFullScreen'],
    ['mozRequestFullScreen', 'mozFullScreenElement', 'mozCancelFullScreen'],
    ['msRequestFullscreen', 'msFullscreenElement', 'msExitFullscreen'],
  ]) {
    const browser = load('Desktop');
    let exits = 0;
    browser.document.documentElement[enterName] = async (...args) => {
      assert.equal(args.length, 0, 'Preserve the original desktop request signature');
      browser.document[stateName] = {};
    };
    browser.document[exitName] = async () => { exits++; browser.document[stateName] = null; };
    await browser.api.requestDocumentFullscreen();
    assert.equal(browser.api.isDocumentFullscreen(), true);
    browser.api.resetMobilePageFullscreen();
    assert.equal(browser.api.isDocumentFullscreen(), true, 'Desktop fullscreen survives navigation');
    assert.equal(exits, 0);
    await browser.api.exitDocumentFullscreen();
    assert.equal(exits, 1);
    assert.equal(browser.api.isDocumentFullscreen(), false);
    await browser.api.requestDocumentFullscreen();
    browser.document[stateName] = null; // Browser's own Escape handling.
    assert.equal(browser.api.isDocumentFullscreen(), false);
    assert.equal(browser.events.length, 0, 'No mobile fallback events on desktop');
    assert.equal(browser.listeners.size, 0, 'No mobile Escape listener on desktop');
  }
  await rejected.api.requestDocumentFullscreen();
  rejected.api.resetMobilePageFullscreen();
  assert.equal(rejected.api.isDocumentFullscreen(), false, 'Route change exits mobile fallback');
  const pending = load();
  let fail;
  pending.document.documentElement.requestFullscreen = () => new Promise((_, reject) => { fail = reject; });
  const enter = pending.api.requestDocumentFullscreen();
  pending.api.resetMobilePageFullscreen();
  fail(new Error('Late rejection'));
  await enter;
  assert.equal(pending.api.isDocumentFullscreen(), false, 'Navigation/exit cancels a pending fallback');
  console.log('Fullscreen passed: native mobile, fallback, exit/Escape, unchanged document scrolling, desktop rejection and cancelled entry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
