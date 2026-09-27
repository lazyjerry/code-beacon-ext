// 檔案層級的排除：語言／scheme 交給 core，glob 用 vscode.languages.match 對絕對路徑比對。
import * as vscode from 'vscode';

import type { CodeBeaconConfig } from './config';
import { isFileExcluded } from './core/exclude';

/** diff 檢視左側（git:）與 SCM 輸入框永遠不裝飾。 */
const ALWAYS_EXCLUDED_SCHEMES = ['git', 'vscode-scm'];

export function isDocumentExcluded(document: vscode.TextDocument, config: CodeBeaconConfig): boolean {
  const target = { languageId: document.languageId, scheme: document.uri.scheme };
  if (isFileExcluded(target, { languages: config.excludeLanguages, schemes: [...ALWAYS_EXCLUDED_SCHEMES, ...config.excludeSchemes] })) {
    return true;
  }
  return config.excludePatterns.some((pattern) => vscode.languages.match({ pattern }, document) > 0);
}
