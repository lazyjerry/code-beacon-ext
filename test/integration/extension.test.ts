import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

import type { CodeBeaconApi } from '../../src/extension';

const EXTENSION_ID = 'workjerry.code-beacon';
const SECTION = 'codeBeacon';
const TOUCHED_KEYS = ['excludeBySource', 'followCursor', 'excludeSchemes', 'trailingSpacesEnabled', 'trailingSpacesHighlightOnly'];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function getApi(): Promise<CodeBeaconApi> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `找不到延伸模組 ${EXTENSION_ID}`);
  return (await extension.activate()) as CodeBeaconApi;
}

async function setConfig(key: string, value: unknown): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update(key, value, vscode.ConfigurationTarget.Global);
}

async function openDocument(content: string): Promise<{ document: vscode.TextDocument; editor: vscode.TextEditor }> {
  const document = await vscode.workspace.openTextDocument({ content, language: 'plaintext' });
  const editor = await vscode.window.showTextDocument(document);
  return { document, editor };
}

function problem(line: number, message: string, severity: vscode.DiagnosticSeverity, source = 'test'): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(new vscode.Range(line, 0, line, 3), message, severity);
  diagnostic.source = source;
  return diagnostic;
}

suite('Beacooon 延伸模組', () => {
  let api: CodeBeaconApi;
  let collection: vscode.DiagnosticCollection;
  let workspaceDir: string;

  suiteSetup(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, '測試需要一個工作區資料夾');
    workspaceDir = folders[0].uri.fsPath;
    api = await getApi();
    collection = vscode.languages.createDiagnosticCollection('beacooon-test');
  });

  suiteTeardown(() => {
    collection.dispose();
  });

  teardown(async () => {
    collection.clear();
    for (const key of TOUCHED_KEYS) {
      await setConfig(key, undefined);
    }
    api.refresh();
  });

  test('行內顯示錯誤與警告，預設不顯示提示，文字以嚴重度符號開頭', async () => {
    const { document } = await openDocument('aaa\nbbb\nccc\n');
    collection.set(document.uri, [
      problem(0, 'boom', vscode.DiagnosticSeverity.Error),
      problem(1, 'meh', vscode.DiagnosticSeverity.Hint),
      problem(2, 'careful', vscode.DiagnosticSeverity.Warning),
    ]);
    api.refresh();
    const infos = api.getDiagnosticDecorations(document.uri);
    assert.deepEqual(
      infos.map((info) => [info.line, info.severity]),
      [
        [0, 'error'],
        [2, 'warning'],
      ],
    );
    assert.equal(infos[0].text, '✖ boom');
    assert.equal(infos[1].text, '▲ careful');
    assert.match(api.getStatusBarText(), /\$\(error\) 1 \$\(warning\) 1 \$\(info\) 0/);
  });

  test('excludeBySource 隱藏該來源的問題', async () => {
    const { document } = await openDocument('aaa\n');
    collection.set(document.uri, [problem(0, 'boom', vscode.DiagnosticSeverity.Error, 'noisy')]);
    await setConfig('excludeBySource', ['noisy']);
    api.refresh();
    assert.deepEqual(api.getDiagnosticDecorations(document.uri), []);
  });

  test('followCursor 為 activeLine 時只顯示游標所在行', async () => {
    const { document, editor } = await openDocument('aaa\nbbb\nccc\n');
    collection.set(document.uri, [problem(0, 'one', vscode.DiagnosticSeverity.Error), problem(2, 'three', vscode.DiagnosticSeverity.Error)]);
    await setConfig('followCursor', 'activeLine');
    editor.selection = new vscode.Selection(2, 0, 2, 0);
    api.refresh();
    assert.deepEqual(
      api.getDiagnosticDecorations(document.uri).map((info) => info.line),
      [2],
    );
  });

  test('複製游標所在行的問題訊息', async () => {
    const { document, editor } = await openDocument('aaa\n');
    collection.set(document.uri, [problem(0, 'copy me', vscode.DiagnosticSeverity.Warning)]);
    editor.selection = new vscode.Selection(0, 1, 0, 1);
    await vscode.commands.executeCommand('codeBeacon.copyProblemMessage');
    assert.equal(await vscode.env.clipboard.readText(), 'copy me');
  });

  test('尾端空白：高亮整份，清除預設只動修改過的行，整份清除是逃生口', async () => {
    const { document, editor } = await openDocument('a  \nb\t\n   \nc\n');
    api.refresh();
    assert.deepEqual(
      api.getTrailingRanges(document.uri).map((range) => [range.line, range.start]),
      [
        [0, 1],
        [1, 1],
        [2, 0],
      ],
    );
    assert.match(api.getStatusBarText(), /\$\(whitespace\) 3$/);

    await editor.edit((builder) => builder.insert(new vscode.Position(0, 3), ' '));
    await sleep(50);
    assert.equal(await api.trimTrailingSpaces(document, 'respectSettings'), 1);
    assert.equal(document.getText(), 'a\nb\t\n   \nc\n');

    assert.equal(await api.trimTrailingSpaces(document, 'wholeFile'), 2);
    assert.equal(document.getText(), 'a\nb\n\nc\n');
  });

  test('excludeSchemes 含 untitled 時兩個功能都不處理未命名檔', async () => {
    const { document } = await openDocument('a  \n');
    collection.set(document.uri, [problem(0, 'boom', vscode.DiagnosticSeverity.Error)]);
    await setConfig('excludeSchemes', ['output', 'untitled']);
    api.refresh();
    assert.deepEqual(api.getDiagnosticDecorations(document.uri), []);
    assert.deepEqual(api.getTrailingRanges(document.uri), []);
  });

  test('trailingSpacesEnabled 關閉後不高亮，但指令仍可清除', async () => {
    const { document } = await openDocument('a  \n');
    await setConfig('trailingSpacesEnabled', false);
    api.refresh();
    assert.deepEqual(api.getTrailingRanges(document.uri), []);
    assert.equal(await api.trimTrailingSpaces(document, 'wholeFile'), 1);
    assert.equal(document.getText(), 'a\n');
  });

  test('存檔：預設僅顯示不清除；關掉 trailingSpacesHighlightOnly 後存檔自動清除修改行', async () => {
    const file = path.join(workspaceDir, 'save.txt');
    fs.writeFileSync(file, 'x\ny  \n');
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    const editor = await vscode.window.showTextDocument(document);

    await editor.edit((builder) => builder.insert(new vscode.Position(0, 1), '  '));
    assert.ok(await document.save());
    assert.equal(fs.readFileSync(file, 'utf8'), 'x  \ny  \n');

    await setConfig('trailingSpacesHighlightOnly', false);
    api.refresh();
    await editor.edit((builder) => builder.insert(new vscode.Position(0, 3), ' '));
    await sleep(50);
    assert.ok(await document.save());
    // 只清修改過的第 0 行；第 1 行從開檔起沒動過，保留。
    assert.equal(fs.readFileSync(file, 'utf8'), 'x\ny  \n');
  });
});
