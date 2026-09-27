// 行內訊息樣板：$message／$count／$severity／$source／$code 的替換、換行壓平、截斷。
export interface TemplateInput {
  message: string;
  /** 同一行的問題數；只有超過一個才顯示。 */
  count: number;
  severity: string;
  source: string;
  code: string;
}

const LINEBREAK_SYMBOL = '⏎';

/** 行內裝飾畫不出換行，多行訊息壓成一行、換行處以符號標記。 */
export function collapseLinebreaks(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, ` ${LINEBREAK_SYMBOL} `);
}

export function truncate(text: string, maxChars: number): string {
  if (maxChars <= 0 || text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}…`;
}

export function renderTemplate(template: string, input: TemplateInput, maxChars: number): string {
  const rendered = template.replace(/\$(message|count|severity|source|code)/g, (_match, name: string) => {
    switch (name) {
      case 'message':
        return collapseLinebreaks(input.message);
      case 'count':
        return input.count > 1 ? String(input.count) : '';
      case 'severity':
        return input.severity;
      case 'source':
        return input.source;
      default:
        return input.code;
    }
  });
  return truncate(rendered.replace(/\s{2,}/g, ' ').trim(), maxChars);
}
