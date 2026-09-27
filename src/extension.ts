// 進入點：讀設定、建立三個畫面元件（診斷裝飾、尾端空白裝飾、狀態列）、接 vscode 事件、註冊指令。判斷邏輯都在 core/。
import * as vscode from 'vscode';

import { affectsConfig, readConfig, SECTION } from './config';
import type { CodeBeaconConfig } from './config';
import type { StatusCounts } from './core/statusText';
import type { TrailingRange } from './core/trailing';
import { SEVERITIES } from './core/types';
import type { Severity } from './core/types';
import { KeyedDebouncer } from './debounce';
import { DiagnosticsDecorator, toSeverity } from './diagnostics/decorator';
import type { LineDecorationInfo } from './diagnostics/decorator';
import { StatusBar } from './statusBar';
import { TrailingDecorator } from './trailing/decorator';
import { ModifiedLinesTracker } from './trailing/tracker';
import { Trimmer } from './trailing/trimmer';
import type { TrimMode } from './trailing/trimmer';

/** 整合測試用：headless 下看不到裝飾，直接讀「目前套用了什麼」。 */
export interface CodeBeaconApi {
  /** 重讀設定並重繪所有可見編輯器；改完設定後呼叫，不必等事件。 */
  refresh(): void;
  getDiagnosticDecorations(uri: vscode.Uri): LineDecorationInfo[];
  getTrailingRanges(uri: vscode.Uri): TrailingRange[];
  trimTrailingSpaces(document: vscode.TextDocument, mode: TrimMode): Promise<number>;
  getStatusBarText(): string;
}

type ToggleItem = vscode.QuickPickItem &
  ({ key: 'enabled' | 'diagnosticsEnabled' | 'trailingSpacesEnabled'; value: boolean } | { severity: Severity; value: boolean });

/** VS Code 的 problems.visibility 關掉時，診斷裝飾一併隱藏。 */
function effectiveConfig(): CodeBeaconConfig {
  const config = readConfig();
  const problemsVisible = vscode.workspace.getConfiguration('problems').get<boolean>('visibility', true);
  return problemsVisible ? config : { ...config, diagnosticsEnabled: false };
}

export function activate(context: vscode.ExtensionContext): CodeBeaconApi {
  const log = vscode.window.createOutputChannel('Beacooon', { log: true });
  let config = effectiveConfig();
  const tracker = new ModifiedLinesTracker();
  const diagnostics = new DiagnosticsDecorator(config, log);
  const trailing = new TrailingDecorator(config, log);
  const statusBar = new StatusBar(config);
  const trimmer = new Trimmer(tracker, () => config);
  const debouncer = new KeyedDebouncer();
  // onSave 模式：存檔後才顯示、時間到就清掉，其間其他觸發不能把裝飾畫回來。
  let onSaveVisibleUntil = 0;
  let onSaveTimer: NodeJS.Timeout | undefined;

  const editorsOf = (uri: vscode.Uri): vscode.TextEditor[] =>
    vscode.window.visibleTextEditors.filter((editor) => editor.document.uri.toString() === uri.toString());

  const updateDiagnostics = (editor: vscode.TextEditor): void => {
    if (config.onSave && Date.now() >= onSaveVisibleUntil) {
      diagnostics.clear(editor);
      return;
    }
    diagnostics.update(editor);
  };

  const collectCounts = (): StatusCounts => {
    const active = vscode.window.activeTextEditor;
    const counts: StatusCounts = { error: 0, warning: 0, info: 0, hint: 0, trailing: 0 };
    const groups =
      config.statusBarScope === 'all'
        ? vscode.languages.getDiagnostics().map(([, items]) => items)
        : active
          ? [vscode.languages.getDiagnostics(active.document.uri)]
          : [];
    for (const items of groups) {
      for (const diagnostic of diagnostics.filter(items)) {
        counts[toSeverity(diagnostic.severity)] += 1;
      }
    }
    if (active) {
      counts.trailing = trailing.count(active.document.uri);
    }
    return counts;
  };

  const refreshStatus = (): void => statusBar.update(collectCounts());
  const refreshEditor = (editor: vscode.TextEditor): void => {
    updateDiagnostics(editor);
    trailing.update(editor);
  };
  const refreshAll = (): void => {
    for (const editor of vscode.window.visibleTextEditors) {
      refreshEditor(editor);
    }
    refreshStatus();
  };
  const rebuild = (): void => {
    config = effectiveConfig();
    debouncer.cancelAll();
    diagnostics.rebuild(config);
    trailing.rebuild(config);
    statusBar.rebuild(config);
    refreshAll();
  };

  const scheduleDiagnostics = (uri: vscode.Uri): void =>
    debouncer.run(`diagnostics:${uri.toString()}`, config.delay, () => {
      for (const editor of editorsOf(uri)) {
        updateDiagnostics(editor);
      }
      refreshStatus();
    });
  const scheduleTrailing = (uri: vscode.Uri): void =>
    debouncer.run(`trailing:${uri.toString()}`, config.delay, () => {
      for (const editor of editorsOf(uri)) {
        trailing.update(editor);
      }
      refreshStatus();
    });

  const showOnSave = (document: vscode.TextDocument): void => {
    onSaveVisibleUntil = Date.now() + config.onSaveTimeout;
    for (const editor of editorsOf(document.uri)) {
      diagnostics.update(editor);
    }
    if (onSaveTimer) {
      clearTimeout(onSaveTimer);
    }
    onSaveTimer = setTimeout(() => {
      onSaveVisibleUntil = 0;
      for (const editor of editorsOf(document.uri)) {
        diagnostics.clear(editor);
      }
    }, config.onSaveTimeout);
  };

  const problemsAtCursor = (): { editor: vscode.TextEditor; problems: vscode.Diagnostic[] } | undefined => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showInformationMessage(vscode.l10n.t('No active editor'));
      return undefined;
    }
    const problems = diagnostics.atLine(editor.document.uri, editor.selection.active.line);
    if (problems.length === 0) {
      void vscode.window.showInformationMessage(vscode.l10n.t('No problem on the current line'));
      return undefined;
    }
    return { editor, problems };
  };

  const toggle = async (): Promise<void> => {
    const raw = readConfig();
    const severityLabel: Record<Severity, string> = {
      error: vscode.l10n.t('Errors'),
      warning: vscode.l10n.t('Warnings'),
      info: vscode.l10n.t('Info'),
      hint: vscode.l10n.t('Hints'),
    };
    const items: ToggleItem[] = [
      { label: vscode.l10n.t('Everything'), key: 'enabled', value: raw.enabled },
      { label: vscode.l10n.t('Diagnostics'), key: 'diagnosticsEnabled', value: raw.diagnosticsEnabled },
      { label: vscode.l10n.t('Trailing spaces'), key: 'trailingSpacesEnabled', value: raw.trailingSpacesEnabled },
      ...SEVERITIES.map((severity) => ({ label: severityLabel[severity], severity, value: raw.diagnosticLevels.includes(severity) })),
    ];
    for (const item of items) {
      item.description = item.value ? vscode.l10n.t('On') : vscode.l10n.t('Off');
    }
    const picked = await vscode.window.showQuickPick(items, { placeHolder: vscode.l10n.t('Choose what to toggle') });
    if (!picked) {
      return;
    }
    const section = vscode.workspace.getConfiguration(SECTION);
    if ('severity' in picked) {
      const levels = SEVERITIES.filter((severity) => (severity === picked.severity ? !picked.value : raw.diagnosticLevels.includes(severity)));
      await section.update('diagnosticLevels', levels, vscode.ConfigurationTarget.Global);
    } else {
      await section.update(picked.key, !picked.value, vscode.ConfigurationTarget.Global);
    }
  };

  const searchForProblem = async (): Promise<void> => {
    const found = problemsAtCursor();
    if (!found) {
      return;
    }
    const url = config.searchForProblemQuery.replace(/\$message/g, encodeURIComponent(found.problems[0].message));
    if (!/^https?:\/\//i.test(url)) {
      void vscode.window.showErrorMessage(vscode.l10n.t('The search URL must start with http:// or https://'));
      return;
    }
    await vscode.env.openExternal(vscode.Uri.parse(url));
  };

  const copyProblemMessage = async (): Promise<void> => {
    const found = problemsAtCursor();
    if (!found) {
      return;
    }
    await vscode.env.clipboard.writeText(found.problems.map((problem) => problem.message).join('\n'));
    void vscode.window.showInformationMessage(vscode.l10n.t('Copied the problem message'));
  };

  const trimActive = async (mode: TrimMode): Promise<number> => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showInformationMessage(vscode.l10n.t('No active editor'));
      return 0;
    }
    return trimmer.trim(editor.document, mode);
  };

  context.subscriptions.push(
    log,
    diagnostics,
    trailing,
    statusBar,
    debouncer,
    {
      dispose: () => {
        if (onSaveTimer) {
          clearTimeout(onSaveTimer);
        }
      },
    },
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (affectsConfig(event)) {
        rebuild();
      }
    }),
    vscode.languages.onDidChangeDiagnostics((event) => {
      if (config.onSave) {
        return;
      }
      for (const uri of event.uris) {
        scheduleDiagnostics(uri);
      }
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => refreshAll()),
    vscode.window.onDidChangeActiveTextEditor(() => refreshStatus()),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (config.followCursor !== 'allLines') {
        updateDiagnostics(event.textEditor);
      }
      if (!config.trailingSpacesHighlightCurrentLine) {
        trailing.update(event.textEditor);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      tracker.onChange(event);
      scheduleTrailing(event.document.uri);
    }),
    vscode.workspace.onWillSaveTextDocument((event) => trimmer.handleWillSave(event)),
    vscode.workspace.onDidSaveTextDocument((document) => {
      tracker.onSave(document);
      if (config.onSave) {
        showOnSave(document);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => tracker.onClose(document)),
    vscode.commands.registerCommand('codeBeacon.toggle', () => toggle()),
    vscode.commands.registerCommand('codeBeacon.searchForProblem', () => searchForProblem()),
    vscode.commands.registerCommand('codeBeacon.copyProblemMessage', () => copyProblemMessage()),
    vscode.commands.registerCommand('codeBeacon.trimTrailingSpaces', () => trimActive('respectSettings')),
    vscode.commands.registerCommand('codeBeacon.trimTrailingSpacesAll', () => trimActive('wholeFile')),
  );

  refreshAll();

  return {
    refresh: () => rebuild(),
    getDiagnosticDecorations: (uri) => diagnostics.getApplied(uri),
    getTrailingRanges: (uri) => trailing.getRanges(uri),
    trimTrailingSpaces: (document, mode) => trimmer.trim(document, mode),
    getStatusBarText: () => statusBar.text,
  };
}

export function deactivate(): void {}
