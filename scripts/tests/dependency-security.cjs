const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');

// Exercise the copy Draft.js actually uses. Keep the vulnerable operation in a
// bounded child process so a dependency regression cannot hang the test runner.
const draftRequire = createRequire(require.resolve('draft-js'));
const immutablePath = draftRequire.resolve('immutable');
const overflow = spawnSync(process.execPath, ['--max-old-space-size=128', '-e', `
  const assert = require('node:assert/strict');
  const { List, fromJS } = require(${JSON.stringify(immutablePath)});
  assert.throws(() => List().set(2 ** 30, 'x'), RangeError);
  assert.throws(() => List([1, 2, 3]).setSize(2 ** 31), RangeError);
  assert.throws(() => fromJS({ items: Array(64).fill(0) })
    .setIn(['items', '1073741824'], 'x'), RangeError);
`], { encoding: 'utf8', timeout: 5000 });
assert.ifError(overflow.error);
assert.equal(overflow.status, 0, overflow.stderr);

const {
  ContentState, EditorState, Modifier, convertFromRaw, convertToRaw,
} = require('draft-js');
const lyrics = 'Into the BLACKHOLE\n빛을 따라 (Hey)';
const content = ContentState.createFromText(lyrics);
const raw = convertToRaw(content);
assert.deepEqual(convertToRaw(convertFromRaw(raw)), raw);
const editor = EditorState.createWithContent(content);
const inserted = Modifier.insertText(content, editor.getSelection(), 'Boom! ');
const updated = EditorState.push(editor, inserted, 'insert-characters');
assert.equal(updated.getCurrentContent().getPlainText(), `Boom! ${lyrics}`);
assert.equal(EditorState.undo(updated).getCurrentContent().getPlainText(), lyrics);

console.log('Dependency security checks passed: Immutable overflow protection, lyric round trip, editing and undo.');
