import * as assert from 'node:assert/strict';

import { countLinebreaks, ModifiedLines } from '../../src/core/modifiedLines';

suite('ModifiedLines', () => {
  test('單行編輯只標記那一行', () => {
    const lines = new ModifiedLines();
    lines.apply({ startLine: 2, endLine: 2, addedLines: 0 });
    assert.deepEqual(lines.values(), [2]);
  });

  test('插入換行會標記新行並把後面的行往下推', () => {
    const lines = new ModifiedLines();
    lines.apply({ startLine: 5, endLine: 5, addedLines: 0 });
    lines.apply({ startLine: 1, endLine: 1, addedLines: 2 });
    assert.deepEqual(lines.values(), [1, 2, 3, 7]);
  });

  test('刪除多行會把後面的行往上拉，被刪範圍內的標記消失', () => {
    const lines = new ModifiedLines();
    lines.apply({ startLine: 3, endLine: 3, addedLines: 0 });
    lines.apply({ startLine: 8, endLine: 8, addedLines: 0 });
    lines.apply({ startLine: 2, endLine: 5, addedLines: 0 });
    assert.deepEqual(lines.values(), [2, 5]);
  });

  test('同一事件多個變更從後往前套用，前面的行號不受影響', () => {
    const lines = new ModifiedLines();
    lines.applyAll([
      { startLine: 1, endLine: 1, addedLines: 1 },
      { startLine: 4, endLine: 4, addedLines: 0 },
    ]);
    assert.deepEqual(lines.values(), [1, 2, 5]);
  });

  test('clear 歸零', () => {
    const lines = new ModifiedLines();
    lines.apply({ startLine: 0, endLine: 0, addedLines: 0 });
    lines.clear();
    assert.equal(lines.size, 0);
  });
});

suite('countLinebreaks', () => {
  test('三種換行各算一次', () => {
    assert.equal(countLinebreaks('a\nb\r\nc\rd'), 3);
    assert.equal(countLinebreaks('plain'), 0);
  });
});
