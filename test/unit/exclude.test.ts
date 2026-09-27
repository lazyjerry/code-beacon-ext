import * as assert from 'node:assert/strict';

import { compileRegexes, isDiagnosticExcluded, isFileExcluded } from '../../src/core/exclude';

suite('isFileExcluded', () => {
  test('依 languageId 或 scheme 排除，區分大小寫', () => {
    const rules = { languages: ['markdown'], schemes: ['output', 'untitled'] };
    assert.equal(isFileExcluded({ languageId: 'markdown', scheme: 'file' }, rules), true);
    assert.equal(isFileExcluded({ languageId: 'typescript', scheme: 'untitled' }, rules), true);
    assert.equal(isFileExcluded({ languageId: 'Markdown', scheme: 'file' }, rules), false);
    assert.equal(isFileExcluded({ languageId: 'typescript', scheme: 'file' }, rules), false);
  });
});

suite('isDiagnosticExcluded', () => {
  const diagnostic = { message: 'Unused variable x', source: 'eslint', code: 'no-unused-vars' };

  test('來源規則：只寫來源時整個來源都排除', () => {
    assert.equal(isDiagnosticExcluded(diagnostic, { messageRegexes: [], sources: ['eslint'] }), true);
    assert.equal(isDiagnosticExcluded(diagnostic, { messageRegexes: [], sources: ['ts'] }), false);
  });

  test('來源規則：來源(代碼) 要兩者都相同', () => {
    assert.equal(isDiagnosticExcluded(diagnostic, { messageRegexes: [], sources: ['eslint(no-unused-vars)'] }), true);
    assert.equal(isDiagnosticExcluded(diagnostic, { messageRegexes: [], sources: ['eslint(semi)'] }), false);
    assert.equal(isDiagnosticExcluded(diagnostic, { messageRegexes: [], sources: ['ts(no-unused-vars)'] }), false);
  });

  test('訊息 regex 命中任一條就排除', () => {
    assert.equal(isDiagnosticExcluded(diagnostic, { messageRegexes: [/^Unused/], sources: [] }), true);
    assert.equal(isDiagnosticExcluded(diagnostic, { messageRegexes: [/^Missing/, /variable y/], sources: [] }), false);
  });
});

suite('compileRegexes', () => {
  test('無效的 regex 跳過並回報，其餘照常', () => {
    const invalid: string[] = [];
    const compiled = compileRegexes(['^ok', '(unclosed', 'fine$'], (pattern) => invalid.push(pattern));
    assert.deepEqual(invalid, ['(unclosed']);
    assert.deepEqual(compiled.map((regex) => regex.source), ['^ok', 'fine$']);
  });
});
