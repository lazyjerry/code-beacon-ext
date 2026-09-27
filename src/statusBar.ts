// 單一狀態列項目：各嚴重度計數加尾端空白行數，點擊開「問題」面板。
import * as vscode from 'vscode';

import type { CodeBeaconConfig } from './config';
import { buildStatusText, statusBackground } from './core/statusText';
import type { StatusCounts } from './core/statusText';

export class StatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem | undefined;
  private config: CodeBeaconConfig;
  private lastText = '';

  constructor(config: CodeBeaconConfig) {
    this.config = config;
    this.rebuild(config);
  }

  rebuild(config: CodeBeaconConfig): void {
    this.item?.dispose();
    this.item = undefined;
    this.lastText = '';
    this.config = config;
    if (!config.enabled || !config.statusBarEnabled) {
      return;
    }
    const alignment = config.statusBarAlignment === 'right' ? vscode.StatusBarAlignment.Right : vscode.StatusBarAlignment.Left;
    const item = vscode.window.createStatusBarItem('codeBeacon.status', alignment, config.statusBarPriority);
    item.name = 'Beacooon';
    item.command = 'workbench.actions.view.problems';
    item.show();
    this.item = item;
  }

  update(counts: StatusCounts): void {
    if (!this.item) {
      return;
    }
    const levels = this.config.diagnosticsEnabled ? this.config.diagnosticLevels : [];
    const text = buildStatusText(counts, { levels, showTrailing: this.config.trailingSpacesEnabled });
    this.lastText = text;
    this.item.text = text;
    this.item.tooltip = [
      vscode.l10n.t('Errors: {0}, warnings: {1}, info: {2}, hints: {3}', counts.error, counts.warning, counts.info, counts.hint),
      vscode.l10n.t('Lines with trailing spaces: {0}', counts.trailing),
      vscode.l10n.t('Click to open the Problems view'),
    ].join('\n');
    const background = statusBackground(counts, levels);
    this.item.backgroundColor = background ? new vscode.ThemeColor(`statusBarItem.${background}Background`) : undefined;
  }

  get text(): string {
    return this.lastText;
  }

  dispose(): void {
    this.item?.dispose();
    this.item = undefined;
  }
}
