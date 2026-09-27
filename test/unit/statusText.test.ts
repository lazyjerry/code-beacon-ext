import * as assert from 'node:assert/strict';

import { buildStatusText, statusBackground } from '../../src/core/statusText';

const counts = { error: 2, warning: 1, info: 0, hint: 4, trailing: 3 };

suite('buildStatusText', () => {
  test('只列 levels 內的嚴重度，尾端空白最後', () => {
    assert.equal(
      buildStatusText(counts, { levels: ['error', 'warning', 'info'], showTrailing: true }),
      '$(error) 2 $(warning) 1 $(info) 0 $(whitespace) 3',
    );
  });

  test('關掉尾端空白就不顯示', () => {
    assert.equal(buildStatusText(counts, { levels: ['error'], showTrailing: false }), '$(error) 2');
  });
});

suite('statusBackground', () => {
  test('有錯誤用 error，只有警告用 warning，其餘無', () => {
    assert.equal(statusBackground(counts, ['error', 'warning']), 'error');
    assert.equal(statusBackground({ ...counts, error: 0 }, ['error', 'warning']), 'warning');
    assert.equal(statusBackground({ ...counts, error: 0, warning: 0 }, ['error', 'warning']), undefined);
    assert.equal(statusBackground(counts, ['info']), undefined);
  });
});
