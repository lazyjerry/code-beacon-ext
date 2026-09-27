// 尾端空白高亮：每次文件變更後整份掃描，游標所在行可選擇不標。
import * as vscode from 'vscode';

import type { CodeBeaconConfig } from '../config';
import { safeCssColor } from '../core/css';
import { compileTrailingRegex, scanTrailingSpaces } from '../core/trailing';
import type { TrailingRange } from '../core/trailing';
import { isDocumentExcluded } from '../documentFilter';

const DEFAULT_BACKGROUND = '#cca7004d';
const DEFAULT_BORDER = '#cca70026';

export class TrailingDecorator implements vscode.Disposable {
  private type: vscode.TextEditorDecorationType | undefined;
  private regex: RegExp | null = null;
  private config: CodeBeaconConfig;
  private readonly applied = new Map<string, TrailingRange[]>();

  constructor(config: CodeBeaconConfig, private readonly log: vscode.LogOutputChannel) {
    this.config = config;
    this.rebuild(config);
  }

  rebuild(config: CodeBeaconConfig): void {
    this.type?.dispose();
    this.type = undefined;
    this.applied.clear();
    this.config = config;
    this.regex = compileTrailingRegex(config.trailingSpacesRegexp);
    if (!this.regex) {
      this.log.warn(`codeBeacon.trailingSpacesRegexp 不是合法的 regex，尾端空白功能停用：${config.trailingSpacesRegexp}`);
      return;
    }
    if (config.enabled && config.trailingSpacesEnabled) {
      this.type = vscode.window.createTextEditorDecorationType({
        backgroundColor: safeCssColor(config.trailingSpacesBackgroundColor, DEFAULT_BACKGROUND),
        border: '1px solid',
        borderColor: safeCssColor(config.trailingSpacesBorderColor, DEFAULT_BORDER),
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      });
    }
  }

  update(editor: vscode.TextEditor): void {
    const key = editor.document.uri.toString();
    if (!this.type || !this.regex || isDocumentExcluded(editor.document, this.config)) {
      this.clear(editor);
      return;
    }
    const document = editor.document;
    const ranges = scanTrailingSpaces(document.lineCount, (line) => document.lineAt(line).text, this.regex);
    const activeLines = new Set(editor.selections.map((selection) => selection.active.line));
    const shown = this.config.trailingSpacesHighlightCurrentLine ? ranges : ranges.filter((range) => !activeLines.has(range.line));
    editor.setDecorations(
      this.type,
      shown.map((range) => new vscode.Range(range.line, range.start, range.line, range.end)),
    );
    this.applied.set(key, ranges);
  }

  clear(editor: vscode.TextEditor): void {
    if (this.type) {
      editor.setDecorations(this.type, []);
    }
    this.applied.delete(editor.document.uri.toString());
  }

  /** 含尾端空白的行數（不受游標行設定影響），給狀態列。 */
  count(uri: vscode.Uri): number {
    return this.applied.get(uri.toString())?.length ?? 0;
  }

  getRanges(uri: vscode.Uri): TrailingRange[] {
    return this.applied.get(uri.toString()) ?? [];
  }

  dispose(): void {
    this.type?.dispose();
    this.type = undefined;
  }
}
