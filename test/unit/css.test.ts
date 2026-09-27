import * as assert from 'node:assert/strict';

import { safeCssColor, safeCssLength } from '../../src/core/css';

suite('safeCssLength', () => {
  test('放行常見長度，空字串維持空', () => {
    assert.equal(safeCssLength('4ch', '1em'), '4ch');
    assert.equal(safeCssLength('0 0 0 12px', '1em'), '0 0 0 12px');
    assert.equal(safeCssLength('', '1em'), '');
  });

  test('不像長度的字串退回預設', () => {
    assert.equal(safeCssLength('4ch; position: fixed', '1em'), '1em');
    assert.equal(safeCssLength('url(x)', '1em'), '1em');
  });
});

suite('safeCssColor', () => {
  test('放行 hex、rgba、名稱，其餘退回預設', () => {
    assert.equal(safeCssColor('#cca7004d', '#000'), '#cca7004d');
    assert.equal(safeCssColor('rgba(255, 0, 0, 0.3)', '#000'), 'rgba(255, 0, 0, 0.3)');
    assert.equal(safeCssColor('red', '#000'), 'red');
    assert.equal(safeCssColor('red; background: url(x)', '#000'), '#000');
  });
});
