// 排除規則的純判斷：語言／scheme 對檔案，來源／訊息 regex 對單一診斷。glob 交給外層的 vscode.languages.match。
export interface FileExcludeRules {
  languages: readonly string[];
  schemes: readonly string[];
}

export function isFileExcluded(target: { languageId: string; scheme: string }, rules: FileExcludeRules): boolean {
  return rules.languages.includes(target.languageId) || rules.schemes.includes(target.scheme);
}

export interface DiagnosticIdentity {
  message: string;
  source: string;
  code: string;
}

export interface DiagnosticExcludeRules {
  messageRegexes: readonly RegExp[];
  sources: readonly string[];
}

/** 來源規則寫 `eslint` 只比對 source；寫 `eslint(no-unused-vars)` 則 source 與 code 都要相同。 */
export function isDiagnosticExcluded(diagnostic: DiagnosticIdentity, rules: DiagnosticExcludeRules): boolean {
  for (const rule of rules.sources) {
    const withCode = /^(.*)\((.*)\)$/.exec(rule);
    const hit = withCode
      ? withCode[1] === diagnostic.source && withCode[2] === diagnostic.code
      : rule === diagnostic.source;
    if (hit) {
      return true;
    }
  }
  return rules.messageRegexes.some((regex) => regex.test(diagnostic.message));
}

/** 使用者寫壞的 regex 不能讓整個功能停擺：跳過並回報，其餘照常。 */
export function compileRegexes(patterns: readonly string[], onInvalid: (pattern: string, error: string) => void): RegExp[] {
  const compiled: RegExp[] = [];
  for (const pattern of patterns) {
    try {
      compiled.push(new RegExp(pattern));
    } catch (error) {
      onInvalid(pattern, error instanceof Error ? error.message : String(error));
    }
  }
  return compiled;
}
