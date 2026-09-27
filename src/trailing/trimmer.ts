// 清除尾端空白：指令與存檔前的自動清除共用同一套範圍計算。
import * as vscode from 'vscode';

import type { CodeBeaconConfig } from '../config';
import { compileTrailingRegex, scanTrailingSpaces, selectTrimRanges } from '../core/trailing';
import { isDocumentExcluded } from '../documentFilter';
import type { ModifiedLinesTracker } from './tracker';

/** respectSettings 遵守 trimModifiedLinesOnly；wholeFile 無視它、整份清除。兩者都遵守 trimIncludeEmptyLines。 */
export type TrimMode = 'respectSettings' | 'wholeFile';

export class Trimmer {
  constructor(
    private readonly tracker: ModifiedLinesTracker,
    private readonly getConfig: () => CodeBeaconConfig,
  ) {}

  computeEdits(document: vscode.TextDocument, mode: TrimMode): { edits: vscode.TextEdit[]; lines: number } {
    const config = this.getConfig();
    const regex = compileTrailingRegex(config.trailingSpacesRegexp);
    if (!regex) {
      return { edits: [], lines: 0 };
    }
    const ranges = scanTrailingSpaces(document.lineCount, (line) => document.lineAt(line).text, regex);
    const selected = selectTrimRanges(ranges, {
      includeEmptyLines: config.trimIncludeEmptyLines,
      modifiedLinesOnly: mode === 'respectSettings' && config.trimModifiedLinesOnly,
      modifiedLines: this.tracker.get(document.uri),
    });
    return {
      edits: selected.map((range) => vscode.TextEdit.delete(new vscode.Range(range.line, range.start, range.line, range.end))),
      lines: selected.length,
    };
  }

  async trim(document: vscode.TextDocument, mode: TrimMode): Promise<number> {
    const config = this.getConfig();
    if (isDocumentExcluded(document, config)) {
      return 0;
    }
    const { edits, lines } = this.computeEdits(document, mode);
    if (lines > 0) {
      const edit = new vscode.WorkspaceEdit();
      edit.set(document.uri, edits);
      await vscode.workspace.applyEdit(edit);
    }
    if (config.trimStatusBarMessage) {
      const message = lines > 0 ? vscode.l10n.t('Removed trailing spaces on {0} line(s)', lines) : vscode.l10n.t('No trailing spaces to remove');
      vscode.window.setStatusBarMessage(message, 3000);
    }
    return lines;
  }

  /** 存檔前自動清除只在 trailingSpacesHighlightOnly 關閉時發生；指令不經過這裡。 */
  handleWillSave(event: vscode.TextDocumentWillSaveEvent): void {
    const config = this.getConfig();
    if (!config.enabled || config.trailingSpacesHighlightOnly || isDocumentExcluded(event.document, config)) {
      return;
    }
    event.waitUntil(Promise.resolve(this.computeEdits(event.document, 'respectSettings').edits));
  }
}
