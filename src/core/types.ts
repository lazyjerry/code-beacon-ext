// 四種嚴重度的共用型別；core/ 內的純函式與外層 vscode 接線都以此為準。
export type Severity = 'error' | 'warning' | 'info' | 'hint';

export const SEVERITIES: readonly Severity[] = ['error', 'warning', 'info', 'hint'];

export type SeverityMap<T> = Record<Severity, T>;

export function severityMap<T>(make: (severity: Severity) => T): SeverityMap<T> {
  return { error: make('error'), warning: make('warning'), info: make('info'), hint: make('hint') };
}
