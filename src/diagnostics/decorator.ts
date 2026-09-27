// 診斷裝飾：把 languages.getDiagnostics 的結果畫成整行底色＋行尾訊息、問題範圍底色、gutter 圖示。
import * as vscode from 'vscode';

import type { CodeBeaconConfig } from '../config';
import { computeAlignment } from '../core/alignMessage';
import { safeCssColor, safeCssLength } from '../core/css';
import { compileRegexes, isDiagnosticExcluded } from '../core/exclude';
import { buildGutterSvg } from '../core/gutterSvg';
import { renderTemplate } from '../core/template';
import { SEVERITIES, severityMap } from '../core/types';
import type { Severity, SeverityMap } from '../core/types';
import { isDocumentExcluded } from '../documentFilter';

export interface LineDecorationInfo {
  line: number;
  severity: Severity;
  text: string;
}

interface SeverityTypes {
  line: vscode.TextEditorDecorationType;
  range: vscode.TextEditorDecorationType;
  gutter: vscode.TextEditorDecorationType;
}

const RANK: SeverityMap<number> = { error: 0, warning: 1, info: 2, hint: 3 };

export function toSeverity(severity: vscode.DiagnosticSeverity): Severity {
  switch (severity) {
    case vscode.DiagnosticSeverity.Error:
      return 'error';
    case vscode.DiagnosticSeverity.Warning:
      return 'warning';
    case vscode.DiagnosticSeverity.Information:
      return 'info';
    default:
      return 'hint';
  }
}

function codeOf(code: vscode.Diagnostic['code']): string {
  if (code === undefined) {
    return '';
  }
  return typeof code === 'object' ? String(code.value) : String(code);
}

export class DiagnosticsDecorator implements vscode.Disposable {
  private types: SeverityMap<SeverityTypes> | undefined;
  private messageRegexes: RegExp[] = [];
  private baseTextDecoration = 'none';
  private margin = '4ch';
  private config: CodeBeaconConfig;
  private readonly applied = new Map<string, LineDecorationInfo[]>();

  constructor(config: CodeBeaconConfig, private readonly log: vscode.LogOutputChannel) {
    this.config = config;
    this.rebuild(config);
  }

  /** 設定變更時整批重建裝飾型別，舊 CSS 不殘留。 */
  rebuild(config: CodeBeaconConfig): void {
    this.disposeTypes();
    this.config = config;
    this.messageRegexes = compileRegexes(config.excludeByMessage, (pattern, error) =>
      this.log.warn(`codeBeacon.excludeByMessage 略過無效的 regex ${pattern}: ${error}`),
    );
    if (config.enabled && config.diagnosticsEnabled) {
      this.types = this.createTypes();
    }
  }

  /** 依 levels／來源／訊息規則過濾；狀態列計數也用同一套。 */
  filter(diagnostics: readonly vscode.Diagnostic[]): vscode.Diagnostic[] {
    return diagnostics.filter((diagnostic) => {
      if (!this.config.diagnosticLevels.includes(toSeverity(diagnostic.severity))) {
        return false;
      }
      const identity = { message: diagnostic.message, source: diagnostic.source ?? '', code: codeOf(diagnostic.code) };
      return !isDiagnosticExcluded(identity, { messageRegexes: this.messageRegexes, sources: this.config.excludeBySource });
    });
  }

  /** 游標所在行的問題，嚴重的在前；搜尋與複製指令用。 */
  atLine(uri: vscode.Uri, line: number): vscode.Diagnostic[] {
    return this.filter(vscode.languages.getDiagnostics(uri))
      .filter((diagnostic) => diagnostic.range.start.line <= line && line <= diagnostic.range.end.line)
      .sort((a, b) => RANK[toSeverity(a.severity)] - RANK[toSeverity(b.severity)]);
  }

  update(editor: vscode.TextEditor): void {
    const key = editor.document.uri.toString();
    if (!this.types || isDocumentExcluded(editor.document, this.config)) {
      this.clear(editor);
      return;
    }
    const byLine = this.groupByLine(this.filter(vscode.languages.getDiagnostics(editor.document.uri)));
    const visible = this.linesToShow([...byLine.keys()], editor);
    const lineOptions = severityMap<vscode.DecorationOptions[]>(() => []);
    const rangeOptions = severityMap<vscode.Range[]>(() => []);
    const gutterOptions = severityMap<vscode.Range[]>(() => []);
    const infos: LineDecorationInfo[] = [];
    const limit = this.config.maxInlineMessages;

    for (const [line, diagnostics] of [...byLine.entries()].sort((a, b) => a[0] - b[0])) {
      const primary = diagnostics[0];
      const severity = toSeverity(primary.severity);
      gutterOptions[severity].push(new vscode.Range(line, 0, line, 0));
      if (this.config.problemRangeDecorationEnabled) {
        for (const diagnostic of diagnostics) {
          if (!diagnostic.range.isEmpty) {
            rangeOptions[toSeverity(diagnostic.severity)].push(diagnostic.range);
          }
        }
      }
      if (!visible.has(line) || (limit > 0 && infos.length >= limit)) {
        continue;
      }
      const text = renderTemplate(
        this.config.messageTemplate,
        {
          message: primary.message,
          count: diagnostics.length,
          severity: this.config.severityText[RANK[severity]],
          source: primary.source ?? '',
          code: codeOf(primary.code),
        },
        this.config.messageMaxChars,
      );
      const lineLength = editor.document.lineAt(line).text.length;
      const alignment = computeAlignment(lineLength, text.length, this.config.alignMessage, this.margin);
      lineOptions[severity].push({
        range: new vscode.Range(line, 0, line, lineLength),
        renderOptions: {
          after: {
            contentText: text,
            margin: alignment.margin,
            ...(alignment.padding ? { textDecoration: `${this.baseTextDecoration}; padding: ${alignment.padding}` } : {}),
          },
        },
      });
      infos.push({ line, severity, text });
    }

    for (const severity of SEVERITIES) {
      const types = this.types[severity];
      editor.setDecorations(types.line, lineOptions[severity]);
      editor.setDecorations(types.range, rangeOptions[severity]);
      editor.setDecorations(types.gutter, this.config.gutterIconsEnabled ? gutterOptions[severity] : []);
    }
    this.applied.set(key, infos);
  }

  clear(editor: vscode.TextEditor): void {
    if (this.types) {
      for (const severity of SEVERITIES) {
        const types = this.types[severity];
        editor.setDecorations(types.line, []);
        editor.setDecorations(types.range, []);
        editor.setDecorations(types.gutter, []);
      }
    }
    this.applied.delete(editor.document.uri.toString());
  }

  getApplied(uri: vscode.Uri): LineDecorationInfo[] {
    return this.applied.get(uri.toString()) ?? [];
  }

  dispose(): void {
    this.disposeTypes();
  }

  private groupByLine(diagnostics: readonly vscode.Diagnostic[]): Map<number, vscode.Diagnostic[]> {
    const byLine = new Map<number, vscode.Diagnostic[]>();
    for (const diagnostic of diagnostics) {
      const line = diagnostic.range.start.line;
      const bucket = byLine.get(line);
      if (bucket) {
        bucket.push(diagnostic);
      } else {
        byLine.set(line, [diagnostic]);
      }
    }
    for (const bucket of byLine.values()) {
      bucket.sort((a, b) => RANK[toSeverity(a.severity)] - RANK[toSeverity(b.severity)]);
    }
    return byLine;
  }

  private linesToShow(lines: readonly number[], editor: vscode.TextEditor): Set<number> {
    const activeLines = new Set(editor.selections.map((selection) => selection.active.line));
    switch (this.config.followCursor) {
      case 'allLinesExceptActive':
        return new Set(lines.filter((line) => !activeLines.has(line)));
      case 'activeLine':
        return new Set(lines.filter((line) => activeLines.has(line)));
      case 'closestProblem': {
        const cursor = editor.selection.active.line;
        let closest: number | undefined;
        for (const line of lines) {
          if (closest === undefined || Math.abs(line - cursor) < Math.abs(closest - cursor)) {
            closest = line;
          }
        }
        return new Set(closest === undefined ? [] : [closest]);
      }
      default:
        return new Set(lines);
    }
  }

  private createTypes(): SeverityMap<SeverityTypes> {
    const config = this.config;
    this.margin = safeCssLength(config.margin, '4ch');
    const fontSize = safeCssLength(config.fontSize, '');
    const extraCss: string[] = [];
    if (fontSize) {
      extraCss.push(`font-size: ${fontSize}`);
    }
    if (config.messageBackgroundMode === 'message') {
      extraCss.push('border-radius: 0.2em', 'padding: 0 0.5ch');
    }
    this.baseTextDecoration = ['none', ...extraCss].join('; ');

    return severityMap((severity) => {
      const line = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor:
          config.messageBackgroundMode === 'line' ? new vscode.ThemeColor(`codeBeacon.${severity}Background`) : undefined,
        after: {
          color: new vscode.ThemeColor(`codeBeacon.${severity}Foreground`),
          backgroundColor:
            config.messageBackgroundMode === 'message'
              ? new vscode.ThemeColor(`codeBeacon.${severity}MessageBackground`)
              : undefined,
          margin: this.margin,
          fontStyle: config.fontStyleItalic ? 'italic' : 'normal',
          fontWeight: config.fontWeight,
          textDecoration: this.baseTextDecoration,
        },
      });
      const range = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor(`codeBeacon.${severity}RangeBackground`),
      });
      const svg = buildGutterSvg(
        config.gutterIconSet,
        severity,
        safeCssColor(config.gutterIconColors[severity], '#888888'),
        config.gutterEmoji[severity],
      );
      const gutter = vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.parse(`data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`),
        gutterIconSize: '100%',
      });
      return { line, range, gutter };
    });
  }

  private disposeTypes(): void {
    if (!this.types) {
      return;
    }
    for (const severity of SEVERITIES) {
      const types = this.types[severity];
      types.line.dispose();
      types.range.dispose();
      types.gutter.dispose();
    }
    this.types = undefined;
    this.applied.clear();
  }
}
