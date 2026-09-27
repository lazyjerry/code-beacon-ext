// 行內訊息對齊：依該行長度算出 margin，讓訊息從固定欄位開始或結束。
export interface AlignMessageOptions {
  /** 訊息開始的欄位；0 = 緊接程式碼。 */
  start: number;
  /** 訊息結束的欄位；start 為 0 時才生效。 */
  end: number;
  /** 程式碼超過欄位時保留的最小間距（字元數）。 */
  minimumMargin: number;
  /** 訊息左右內距（字元數）。 */
  padding: [number, number];
  /** false 時忽略 start／end，只套用 padding。 */
  useFixedPosition: boolean;
}

export const DEFAULT_ALIGN_MESSAGE: AlignMessageOptions = {
  start: 0,
  end: 0,
  minimumMargin: 4,
  padding: [0, 0],
  useFixedPosition: true,
};

export interface Alignment {
  margin: string;
  /** 空字串表示不需要額外內距。 */
  padding: string;
}

export function computeAlignment(
  lineLength: number,
  messageLength: number,
  options: AlignMessageOptions,
  defaultMargin: string,
): Alignment {
  const [left, right] = options.padding;
  const padding = left > 0 || right > 0 ? `0 ${right}ch 0 ${left}ch` : '';
  if (!options.useFixedPosition || (options.start <= 0 && options.end <= 0)) {
    return { margin: defaultMargin, padding };
  }
  const columns =
    options.start > 0 ? options.start - lineLength : options.end - lineLength - messageLength - left - right;
  return { margin: `0 0 0 ${Math.max(columns, options.minimumMargin)}ch`, padding };
}
