import * as assert from 'node:assert/strict';

import { computeAlignment, DEFAULT_ALIGN_MESSAGE } from '../../src/core/alignMessage';

suite('computeAlignment', () => {
  test('預設不對齊，沿用 margin 設定', () => {
    assert.deepEqual(computeAlignment(10, 20, DEFAULT_ALIGN_MESSAGE, '4ch'), { margin: '4ch', padding: '' });
  });

  test('start 對齊：短行補到欄位，長行退回 minimumMargin', () => {
    const options = { ...DEFAULT_ALIGN_MESSAGE, start: 40 };
    assert.equal(computeAlignment(10, 20, options, '4ch').margin, '0 0 0 30ch');
    assert.equal(computeAlignment(50, 20, options, '4ch').margin, '0 0 0 4ch');
  });

  test('end 對齊依訊息長度往回算', () => {
    const options = { ...DEFAULT_ALIGN_MESSAGE, end: 80, padding: [1, 1] as [number, number] };
    assert.deepEqual(computeAlignment(10, 20, options, '4ch'), { margin: '0 0 0 48ch', padding: '0 1ch 0 1ch' });
  });

  test('useFixedPosition 關閉時忽略欄位，只留 padding', () => {
    const options = { ...DEFAULT_ALIGN_MESSAGE, start: 40, padding: [2, 0] as [number, number], useFixedPosition: false };
    assert.deepEqual(computeAlignment(10, 20, options, '4ch'), { margin: '4ch', padding: '0 0ch 0 2ch' });
  });
});
