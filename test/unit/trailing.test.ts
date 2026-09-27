import * as assert from 'node:assert/strict';

import { compileTrailingRegex, findTrailingRange, scanTrailingSpaces, selectTrimRanges } from '../../src/core/trailing';

const regex = compileTrailingRegex('[ \\t]+');
assert.ok(regex);

suite('findTrailingRange', () => {
  test('回傳行尾空白的起訖', () => {
    assert.deepEqual(findTrailingRange('abc  ', regex), { start: 3, end: 5 });
    assert.deepEqual(findTrailingRange('a b\t', regex), { start: 3, end: 4 });
    assert.deepEqual(findTrailingRange('   ', regex), { start: 0, end: 3 });
  });

  test('沒有尾端空白回 null', () => {
    assert.equal(findTrailingRange('abc', regex), null);
    assert.equal(findTrailingRange('', regex), null);
    assert.equal(findTrailingRange('a b', regex), null);
  });

  test('無效的 regex 回 null', () => {
    assert.equal(compileTrailingRegex('('), null);
  });

  test('自訂 regex 只比對空格', () => {
    const spacesOnly = compileTrailingRegex(' +');
    assert.ok(spacesOnly);
    assert.deepEqual(findTrailingRange('a\t', spacesOnly), null);
    assert.deepEqual(findTrailingRange('a ', spacesOnly), { start: 1, end: 2 });
  });
});

suite('scanTrailingSpaces / selectTrimRanges', () => {
  const lines = ['a  ', 'b', '   ', 'c\t'];
  const ranges = scanTrailingSpaces(lines.length, (line) => lines[line], regex);

  test('掃出所有有尾端空白的行', () => {
    assert.deepEqual(ranges, [
      { line: 0, start: 1, end: 3 },
      { line: 2, start: 0, end: 3 },
      { line: 3, start: 1, end: 2 },
    ]);
  });

  test('includeEmptyLines 關閉時保留整行空白的行', () => {
    const selected = selectTrimRanges(ranges, { includeEmptyLines: false, modifiedLinesOnly: false, modifiedLines: new Set() });
    assert.deepEqual(selected.map((range) => range.line), [0, 3]);
  });

  test('modifiedLinesOnly 只留修改過的行', () => {
    const selected = selectTrimRanges(ranges, { includeEmptyLines: true, modifiedLinesOnly: true, modifiedLines: new Set([2, 3]) });
    assert.deepEqual(selected.map((range) => range.line), [2, 3]);
  });

  test('兩個條件同時套用', () => {
    const selected = selectTrimRanges(ranges, { includeEmptyLines: false, modifiedLinesOnly: true, modifiedLines: new Set([2, 3]) });
    assert.deepEqual(selected.map((range) => range.line), [3]);
  });
});
