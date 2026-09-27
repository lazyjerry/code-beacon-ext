// 追蹤「自開啟／上次存檔後改過哪些行」，靠編輯事件平移行號，不比對磁碟版本、不需要 diff 套件。
export interface LineChange {
  /** 被取代範圍的起訖行（含），以變更前的文件為準。 */
  startLine: number;
  endLine: number;
  /** 新文字裡的換行數。 */
  addedLines: number;
}

export class ModifiedLines {
  private lines = new Set<number>();

  get size(): number {
    return this.lines.size;
  }

  has(line: number): boolean {
    return this.lines.has(line);
  }

  values(): number[] {
    return [...this.lines].sort((a, b) => a - b);
  }

  asSet(): ReadonlySet<number> {
    return this.lines;
  }

  clear(): void {
    this.lines.clear();
  }

  apply(change: LineChange): void {
    const removed = change.endLine - change.startLine;
    const delta = change.addedLines - removed;
    const next = new Set<number>();
    for (const line of this.lines) {
      if (line < change.startLine) {
        next.add(line);
      } else if (line > change.endLine) {
        next.add(line + delta);
      }
    }
    for (let line = change.startLine; line <= change.startLine + change.addedLines; line += 1) {
      next.add(line);
    }
    this.lines = next;
  }

  /** 同一事件的多個變更範圍都以變更前的文件為準；從後往前套用，前面的行號才不會被影響。 */
  applyAll(changes: readonly LineChange[]): void {
    for (const change of [...changes].sort((a, b) => b.startLine - a.startLine)) {
      this.apply(change);
    }
  }
}

export function countLinebreaks(text: string): number {
  return (text.match(/\r\n|\r|\n/g) ?? []).length;
}
