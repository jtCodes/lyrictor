const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/Homepage/layout.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, context);
const { getHomepageLayout: layout, isPhoneLandscape } = context.exports;
assert.equal(isPhoneLandscape(912, 420, 'iPhone'), true);
assert.equal(isPhoneLandscape(740, 360, 'Android Mobile'), true);
assert.equal(isPhoneLandscape(420, 912, 'iPhone'), false);
assert.equal(isPhoneLandscape(1024, 768, 'iPad'), false);
assert.equal(isPhoneLandscape(912, 420, 'Macintosh'), false);
// Available content sizes include browser chrome, header and safe-area deductions.
for (const [width, height] of [[800, 335], [668, 250], [480, 220], [840, 180]]) {
  for (const narrow of [false, true]) {
    const result = layout({ isFullScreen: false, usePhoneHomepageLayout: narrow,
      phoneLandscape: true, maxContentWidth: width, maxContentHeight: height });
    assert.ok(result.maxWidth > 0);
    assert.ok(result.maxFeaturedHeight <= height);
    assert.ok(result.maxWidth + result.desktopLayoutGap + result.effectiveDesktopProjectRailWidth <= width);
    assert.ok(result.effectiveDesktopProjectRailWidth >= 302, 'Expanded search fits the rail');
    assert.equal(result.effectiveProjectListHeight, height, 'List stays inside available height');
    assert.equal(result.shouldUsePhoneHomepageLayout, true, 'Use native mobile scrolling');
    assert.equal(result.shouldUseWideHomepageLayout, false, 'No desktop metadata reservation');
    assert.equal(result.shouldUseDesktopPreviewBranch, true);
  }
}
const desktop = layout({ isFullScreen: false, usePhoneHomepageLayout: false,
  phoneLandscape: false, maxContentWidth: 1400, maxContentHeight: 800 });
assert.equal(desktop.maxWidth, 1020);
assert.equal(desktop.maxFeaturedHeight, 573.75);
assert.equal(desktop.desktopLayoutGap, 40);
assert.equal(desktop.effectiveDesktopProjectRailWidth, 340);
assert.equal(desktop.effectiveProjectListHeight, 788);
const portrait = layout({ isFullScreen: false, usePhoneHomepageLayout: true,
  phoneLandscape: false, maxContentWidth: 390, maxContentHeight: 650 });
assert.equal(portrait.maxWidth, 366);
assert.equal(portrait.maxFeaturedHeight, 205.875);
assert.equal(portrait.effectiveProjectListHeight, 420.125);
const fullscreen = layout({ isFullScreen: true, usePhoneHomepageLayout: true,
  phoneLandscape: true, maxContentWidth: 668, maxContentHeight: 250 });
assert.equal(fullscreen.shouldUseDesktopPreviewBranch, true, 'Keep player mounted when entering landscape fullscreen');
assert.equal(fullscreen.shouldUsePhoneHomepageLayout, false);
console.log('Homepage layout checks passed');
