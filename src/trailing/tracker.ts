// 每份文件一個 ModifiedLines；存檔或關閉後歸零，之後以磁碟版本為基準。
import type * as vscode from 'vscode';

import { countLinebreaks, ModifiedLines } from '../core/modifiedLines';

const EMPTY: ReadonlySet<number> = new Set();

export class ModifiedLinesTracker {
  private readonly byUri = new Map<string, ModifiedLines>();

  onChange(event: vscode.TextDocumentChangeEvent): void {
    if (event.contentChanges.length === 0) {
      return;
    }
    const key = event.document.uri.toString();
    let lines = this.byUri.get(key);
    if (!lines) {
      lines = new ModifiedLines();
      this.byUri.set(key, lines);
    }
    lines.applyAll(
      event.contentChanges.map((change) => ({
        startLine: change.range.start.line,
        endLine: change.range.end.line,
        addedLines: countLinebreaks(change.text),
      })),
    );
  }

  onSave(document: vscode.TextDocument): void {
    this.byUri.delete(document.uri.toString());
  }

  onClose(document: vscode.TextDocument): void {
    this.byUri.delete(document.uri.toString());
  }

  get(uri: vscode.Uri): ReadonlySet<number> {
    return this.byUri.get(uri.toString())?.asSet() ?? EMPTY;
  }
}
