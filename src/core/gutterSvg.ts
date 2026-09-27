// gutter 圖示在執行期組成 SVG 字串，不打包圖檔；顏色與 emoji 來自設定，先跳脫再塞進 XML。
import type { Severity, SeverityMap } from './types';

export type GutterIconSet = 'default' | 'circle' | 'letter' | 'emoji';

export const GUTTER_ICON_SETS: readonly GutterIconSet[] = ['default', 'circle', 'letter', 'emoji'];

const LETTER: SeverityMap<string> = { error: 'E', warning: 'W', info: 'I', hint: 'H' };

export function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export function buildGutterSvg(iconSet: GutterIconSet, severity: Severity, color: string, emoji: string): string {
  const fill = escapeXml(color);
  let body: string;
  switch (iconSet) {
    case 'circle':
      body = `<circle cx="8" cy="8" r="5" fill="${fill}"/>`;
      break;
    case 'letter':
      body = `<text x="8" y="12" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="${fill}">${LETTER[severity]}</text>`;
      break;
    case 'emoji':
      body = `<text x="8" y="12" text-anchor="middle" font-size="11">${escapeXml(emoji)}</text>`;
      break;
    default:
      body = `<rect x="3" y="3" width="10" height="10" rx="2" fill="${fill}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">${body}</svg>`;
}
