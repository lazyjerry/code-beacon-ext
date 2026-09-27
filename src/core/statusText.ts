// 狀態列文字：用 codicon 顯示各嚴重度計數，加上含尾端空白的行數。
import { SEVERITIES } from './types';
import type { Severity, SeverityMap } from './types';

export interface StatusCounts extends SeverityMap<number> {
  trailing: number;
}

export interface StatusTextOptions {
  levels: readonly Severity[];
  showTrailing: boolean;
}

const ICON: SeverityMap<string> = {
  error: '$(error)',
  warning: '$(warning)',
  info: '$(info)',
  hint: '$(lightbulb)',
};

export function buildStatusText(counts: StatusCounts, options: StatusTextOptions): string {
  const parts = SEVERITIES.filter((severity) => options.levels.includes(severity)).map(
    (severity) => `${ICON[severity]} ${counts[severity]}`,
  );
  if (options.showTrailing) {
    parts.push(`$(whitespace) ${counts.trailing}`);
  }
  return parts.join(' ');
}

/** 有錯誤用錯誤底色、只有警告用警告底色、其餘不上底色。 */
export function statusBackground(counts: StatusCounts, levels: readonly Severity[]): 'error' | 'warning' | undefined {
  if (levels.includes('error') && counts.error > 0) {
    return 'error';
  }
  if (levels.includes('warning') && counts.warning > 0) {
    return 'warning';
  }
  return undefined;
}
