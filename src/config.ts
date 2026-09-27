// 讀設定：一次讀成 typed 物件，型別不對的值退回預設，外層不再各自 getConfiguration。
import * as vscode from 'vscode';

import { DEFAULT_ALIGN_MESSAGE } from './core/alignMessage';
import type { AlignMessageOptions } from './core/alignMessage';
import { GUTTER_ICON_SETS } from './core/gutterSvg';
import type { GutterIconSet } from './core/gutterSvg';
import { SEVERITIES, severityMap } from './core/types';
import type { Severity, SeverityMap } from './core/types';

export const SECTION = 'codeBeacon';

export type FollowCursor = 'allLines' | 'allLinesExceptActive' | 'activeLine' | 'closestProblem';
export type MessageBackgroundMode = 'line' | 'message' | 'none';
export type StatusBarScope = 'all' | 'activeEditor';
export type StatusBarSide = 'left' | 'right';

const FOLLOW_CURSOR: readonly FollowCursor[] = ['allLines', 'allLinesExceptActive', 'activeLine', 'closestProblem'];
const BACKGROUND_MODES: readonly MessageBackgroundMode[] = ['line', 'message', 'none'];
const STATUS_SCOPES: readonly StatusBarScope[] = ['all', 'activeEditor'];
const STATUS_SIDES: readonly StatusBarSide[] = ['left', 'right'];
const FONT_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'normal', 'bold'] as const;

const DEFAULT_SEVERITY_TEXT: [string, string, string, string] = ['✖', '▲', '●', '◇'];
const DEFAULT_GUTTER_EMOJI: SeverityMap<string> = { error: '🔴', warning: '🟠', info: '🔵', hint: '🟢' };
const DEFAULT_GUTTER_COLORS: SeverityMap<string> = { error: '#e45454', warning: '#ff942f', info: '#00b7e4', hint: '#2faf64' };

export interface CodeBeaconConfig {
  enabled: boolean;
  diagnosticsEnabled: boolean;
  trailingSpacesEnabled: boolean;
  excludePatterns: string[];
  excludeLanguages: string[];
  excludeSchemes: string[];
  delay: number;
  statusBarEnabled: boolean;
  statusBarAlignment: StatusBarSide;
  statusBarPriority: number;
  statusBarScope: StatusBarScope;
  diagnosticLevels: Severity[];
  followCursor: FollowCursor;
  messageTemplate: string;
  messageMaxChars: number;
  maxInlineMessages: number;
  messageBackgroundMode: MessageBackgroundMode;
  severityText: [string, string, string, string];
  margin: string;
  fontSize: string;
  fontWeight: string;
  fontStyleItalic: boolean;
  problemRangeDecorationEnabled: boolean;
  excludeByMessage: string[];
  excludeBySource: string[];
  searchForProblemQuery: string;
  alignMessage: AlignMessageOptions;
  gutterIconsEnabled: boolean;
  gutterIconSet: GutterIconSet;
  gutterEmoji: SeverityMap<string>;
  gutterIconColors: SeverityMap<string>;
  onSave: boolean;
  onSaveTimeout: number;
  trailingSpacesRegexp: string;
  trailingSpacesHighlightCurrentLine: boolean;
  trimIncludeEmptyLines: boolean;
  trimModifiedLinesOnly: boolean;
  trailingSpacesHighlightOnly: boolean;
  trimStatusBarMessage: boolean;
  trailingSpacesBackgroundColor: string;
  trailingSpacesBorderColor: string;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function severityRecord(value: unknown, fallback: SeverityMap<string>): SeverityMap<string> {
  const object = value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return severityMap((severity) => (typeof object[severity] === 'string' ? (object[severity] as string) : fallback[severity]));
}

function integerAtLeast(value: unknown, minimum: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(minimum, Math.floor(value)) : fallback;
}

function alignMessage(value: unknown): AlignMessageOptions {
  const object = value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const padding = Array.isArray(object.padding) ? object.padding : [];
  return {
    start: integerAtLeast(object.start, 0, DEFAULT_ALIGN_MESSAGE.start),
    end: integerAtLeast(object.end, 0, DEFAULT_ALIGN_MESSAGE.end),
    minimumMargin: integerAtLeast(object.minimumMargin, 0, DEFAULT_ALIGN_MESSAGE.minimumMargin),
    padding: [integerAtLeast(padding[0], 0, 0), integerAtLeast(padding[1], 0, 0)],
    useFixedPosition: typeof object.useFixedPosition === 'boolean' ? object.useFixedPosition : DEFAULT_ALIGN_MESSAGE.useFixedPosition,
  };
}

function severityText(value: unknown): [string, string, string, string] {
  const items = strings(value);
  return [
    items[0] ?? DEFAULT_SEVERITY_TEXT[0],
    items[1] ?? DEFAULT_SEVERITY_TEXT[1],
    items[2] ?? DEFAULT_SEVERITY_TEXT[2],
    items[3] ?? DEFAULT_SEVERITY_TEXT[3],
  ];
}

export function readConfig(): CodeBeaconConfig {
  const section = vscode.workspace.getConfiguration(SECTION);
  const raw = (key: string): unknown => section.get(key);
  const bool = (key: string, fallback: boolean): boolean => {
    const value = raw(key);
    return typeof value === 'boolean' ? value : fallback;
  };
  const text = (key: string, fallback: string): string => {
    const value = raw(key);
    return typeof value === 'string' ? value : fallback;
  };

  return {
    enabled: bool('enabled', true),
    diagnosticsEnabled: bool('diagnosticsEnabled', true),
    trailingSpacesEnabled: bool('trailingSpacesEnabled', true),
    excludePatterns: strings(raw('excludePatterns')),
    excludeLanguages: strings(raw('excludeLanguages')),
    excludeSchemes: strings(raw('excludeSchemes')),
    delay: integerAtLeast(raw('delay'), 0, 500),
    statusBarEnabled: bool('statusBarEnabled', true),
    statusBarAlignment: oneOf(raw('statusBarAlignment'), STATUS_SIDES, 'left'),
    statusBarPriority: integerAtLeast(raw('statusBarPriority'), Number.MIN_SAFE_INTEGER, -9000),
    statusBarScope: oneOf(raw('statusBarScope'), STATUS_SCOPES, 'activeEditor'),
    diagnosticLevels: SEVERITIES.filter((severity) => strings(raw('diagnosticLevels')).includes(severity)),
    followCursor: oneOf(raw('followCursor'), FOLLOW_CURSOR, 'allLines'),
    messageTemplate: text('messageTemplate', '$severity $message'),
    messageMaxChars: integerAtLeast(raw('messageMaxChars'), 0, 500),
    maxInlineMessages: integerAtLeast(raw('maxInlineMessages'), 0, 1000),
    messageBackgroundMode: oneOf(raw('messageBackgroundMode'), BACKGROUND_MODES, 'line'),
    severityText: severityText(raw('severityText')),
    margin: text('margin', '4ch'),
    fontSize: text('fontSize', ''),
    fontWeight: oneOf(raw('fontWeight'), FONT_WEIGHTS, 'normal'),
    fontStyleItalic: bool('fontStyleItalic', false),
    problemRangeDecorationEnabled: bool('problemRangeDecorationEnabled', false),
    excludeByMessage: strings(raw('excludeByMessage')),
    excludeBySource: strings(raw('excludeBySource')),
    searchForProblemQuery: text('searchForProblemQuery', 'https://duckduckgo.com/?q=$message'),
    alignMessage: alignMessage(raw('alignMessage')),
    gutterIconsEnabled: bool('gutterIconsEnabled', false),
    gutterIconSet: oneOf(raw('gutterIconSet'), GUTTER_ICON_SETS, 'default'),
    gutterEmoji: severityRecord(raw('gutterEmoji'), DEFAULT_GUTTER_EMOJI),
    gutterIconColors: severityRecord(raw('gutterIconColors'), DEFAULT_GUTTER_COLORS),
    onSave: bool('onSave', false),
    onSaveTimeout: integerAtLeast(raw('onSaveTimeout'), 50, 500),
    trailingSpacesRegexp: text('trailingSpacesRegexp', '[ \\t]+'),
    trailingSpacesHighlightCurrentLine: bool('trailingSpacesHighlightCurrentLine', true),
    trimIncludeEmptyLines: bool('trimIncludeEmptyLines', true),
    trimModifiedLinesOnly: bool('trimModifiedLinesOnly', true),
    trailingSpacesHighlightOnly: bool('trailingSpacesHighlightOnly', true),
    trimStatusBarMessage: bool('trimStatusBarMessage', true),
    trailingSpacesBackgroundColor: text('trailingSpacesBackgroundColor', '#cca7004d'),
    trailingSpacesBorderColor: text('trailingSpacesBorderColor', '#cca70026'),
  };
}

/** 本延伸模組的設定，以及 VS Code 的 problems.visibility（關掉時診斷裝飾一併隱藏）。 */
export function affectsConfig(event: vscode.ConfigurationChangeEvent): boolean {
  return event.affectsConfiguration(SECTION) || event.affectsConfiguration('problems.visibility');
}
