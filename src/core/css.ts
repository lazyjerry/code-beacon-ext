// 設定值會被塞進裝飾的 CSS；只放行看起來像長度／顏色的字串，其餘退回預設，避免工作區設定注入其他屬性。
const LENGTH = /^(?:-?\d*\.?\d+(?:px|em|rem|ch|ex|%|pt|vw|vh)?\s*){1,4}$/;
const COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%]+\)|[a-z]+)$/i;

export function safeCssLength(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    return '';
  }
  return LENGTH.test(trimmed) ? trimmed : fallback;
}

export function safeCssColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  return COLOR.test(trimmed) ? trimmed : fallback;
}
