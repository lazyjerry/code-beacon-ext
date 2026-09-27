// 尾端空白：逐行比對 regex 找出範圍，再依「含空白行」「只清修改行」挑出要刪的。
export interface TrailingRange {
  line: number;
  start: number;
  end: number;
}

/** 使用者的 regex 錨在行尾；寫壞回 null，由呼叫端決定要不要停用功能。 */
export function compileTrailingRegex(source: string): RegExp | null {
  try {
    return new RegExp(`(?:${source})$`);
  } catch {
    return null;
  }
}

export function findTrailingRange(lineText: string, regex: RegExp): { start: number; end: number } | null {
  const match = regex.exec(lineText);
  if (!match || match[0].length === 0) {
    return null;
  }
  return { start: match.index, end: lineText.length };
}

export function scanTrailingSpaces(lineCount: number, lineAt: (line: number) => string, regex: RegExp): TrailingRange[] {
  const ranges: TrailingRange[] = [];
  for (let line = 0; line < lineCount; line += 1) {
    const found = findTrailingRange(lineAt(line), regex);
    if (found) {
      ranges.push({ line, start: found.start, end: found.end });
    }
  }
  return ranges;
}

export interface TrimSelection {
  includeEmptyLines: boolean;
  modifiedLinesOnly: boolean;
  modifiedLines: ReadonlySet<number>;
}

/** 整行都是空白的行 start 會是 0；includeEmptyLines 關閉時保留這些行。 */
export function selectTrimRanges(ranges: readonly TrailingRange[], selection: TrimSelection): TrailingRange[] {
  return ranges.filter(
    (range) =>
      (selection.includeEmptyLines || range.start > 0) &&
      (!selection.modifiedLinesOnly || selection.modifiedLines.has(range.line)),
  );
}
