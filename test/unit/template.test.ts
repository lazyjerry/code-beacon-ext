import * as assert from 'node:assert/strict';

import { collapseLinebreaks, renderTemplate, truncate } from '../../src/core/template';

const input = { message: 'Unused variable', count: 1, severity: '✖', source: 'eslint', code: 'no-unused-vars' };

suite('renderTemplate', () => {
  test('替換五個變數', () => {
    assert.equal(renderTemplate('$severity [$source($code)] $message', input, 0), '✖ [eslint(no-unused-vars)] Unused variable');
  });

  test('$count 只在超過一個問題時顯示', () => {
    assert.equal(renderTemplate('$message $count', input, 0), 'Unused variable');
    assert.equal(renderTemplate('$message ($count)', { ...input, count: 3 }, 0), 'Unused variable (3)');
  });

  test('空樣板回空字串', () => {
    assert.equal(renderTemplate('', input, 0), '');
  });

  test('多行訊息壓成一行', () => {
    assert.equal(collapseLinebreaks('a\n  b\r\nc'), 'a ⏎ b ⏎ c');
    assert.equal(renderTemplate('$message', { ...input, message: 'first\nsecond' }, 0), 'first ⏎ second');
  });

  test('超過 maxChars 截斷並加省略號，0 表示不截', () => {
    assert.equal(truncate('abcdef', 3), 'abc…');
    assert.equal(truncate('abcdef', 0), 'abcdef');
    assert.equal(truncate('abc', 3), 'abc');
    assert.equal(renderTemplate('$message', input, 6), 'Unused…');
  });
});
