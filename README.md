# Inline Beacon

在程式碼行尾直接顯示診斷訊息，並高亮與清除尾端空白；狀態列一眼看到錯誤、警告與尾端空白的數量。

原始碼與問題回報：<https://github.com/lazyjerry/code-beacon-ext>

## 功能

### 診斷行內訊息

- **行尾顯示問題**：錯誤、警告、資訊直接顯示在該行行尾（提示預設不顯示，可用 `codeBeacon.diagnosticLevels` 打開），不必 hover 或開「問題」面板。
- **訊息樣板**：預設 `$severity $message`，前面是嚴重度符號（✖ ▲ ● ◇，可改），後面是訊息；另有 `$count`（同一行問題數，超過一個才顯示）、`$source`、`$code` 可用。
- **底色**：整行、只有訊息、或不上色三選一；也可另外標出問題的實際範圍。
- **跟隨游標**：可只顯示游標所在行、除了游標行以外、或離游標最近的一則。
- **對齊欄位**：訊息可從固定欄位開始或結束，長行自動退回最小間距。
- **gutter 圖示**：行號旁顯示嚴重度圖示，方塊、圓形、字母、emoji 四種樣式，顏色與 emoji 可自訂。
- **存檔模式**：可改成只在存檔後顯示幾百毫秒，平常不干擾。
- **排除**：依來源（`eslint`、`eslint(no-unused-vars)`）或訊息 regex 隱藏不想看的問題。

### 尾端空白

- **即時高亮**：編輯時把行尾的空格與 tab 標成警告黃（顏色與 regex 可改）。
- **預設僅顯示不清除**：不會在存檔時偷偷改檔案。想要存檔自動清除，把 `codeBeacon.trailingSpacesHighlightOnly` 關掉。
- **只清修改過的行**：「清除尾端空白」預設只處理自開檔或上次存檔以來改過的行，不會把整份檔案的 diff 弄髒；要整份清除用「清除尾端空白（整份檔案）」。
- **整行空白的行**：預設一起清；`codeBeacon.trimIncludeEmptyLines` 關掉可保留。
- **游標所在行**：預設也高亮；打字時嫌閃可關掉。

### 狀態列

一個項目顯示 `$(error) 錯誤數 $(warning) 警告數 $(info) 資訊數 $(whitespace) 含尾端空白的行數`。有錯誤時套錯誤底色、只有警告時套警告底色，點擊開「問題」面板。診斷可選算目前編輯器或所有開啟的文件；尾端空白一律只算目前編輯器。

### 共用排除

`codeBeacon.excludePatterns`（glob）、`codeBeacon.excludeLanguages`（語言識別碼）、`codeBeacon.excludeSchemes`（document scheme）三條同時作用在診斷與尾端空白。預設跳過 `output`；加上 `untitled` 可跳過未存檔的新檔案。

### 中英雙語

設定頁的說明、指令名稱、訊息都隨 VS Code 的顯示語言切換（繁體中文、英文；其他語言顯示英文）。

## 指令

從命令面板（`Cmd+Shift+P`）輸入 `Inline Beacon` 找到：

| 指令 | 說明 |
|---|---|
| 切換功能 | Quick Pick 選擇要開關的項目：全部、診斷、尾端空白、錯誤、警告、資訊、提示。寫入使用者設定。 |
| 搜尋游標所在行的問題 | 用 `codeBeacon.searchForProblemQuery` 的網址搜尋該行最嚴重的問題訊息。 |
| 複製游標所在行的問題訊息 | 該行所有問題的訊息，一行一則，寫進剪貼簿。 |
| 清除尾端空白 | 遵守 `trimModifiedLinesOnly` 與 `trimIncludeEmptyLines`。 |
| 清除尾端空白（整份檔案） | 無視 `trimModifiedLinesOnly`，整份清除；仍遵守 `trimIncludeEmptyLines`。 |

### 快捷鍵

預設不綁任何快捷鍵，也不進右鍵選單。要綁的話在 Keyboard Shortcuts 搜尋 `codeBeacon`，或在 `keybindings.json` 加：

```json
[
  { "key": "cmd+alt+w", "command": "codeBeacon.trimTrailingSpaces", "when": "editorTextFocus" },
  { "key": "cmd+alt+shift+w", "command": "codeBeacon.trimTrailingSpacesAll", "when": "editorTextFocus" },
  { "key": "cmd+alt+b", "command": "codeBeacon.toggle" }
]
```

## 設定

全部 41 條，前綴 `codeBeacon.`。

### 共用

| 設定 | 用途 | 型別 | 預設 |
|---|---|---|---|
| `enabled` | 總開關 | boolean | `true` |
| `diagnosticsEnabled` | 診斷行內訊息與底色 | boolean | `true` |
| `trailingSpacesEnabled` | 尾端空白即時高亮（關掉仍可用指令清除） | boolean | `true` |
| `excludePatterns` | 以絕對路徑比對的 glob，符合的檔案兩個功能都不處理 | string[] | `[]` |
| `excludeLanguages` | 這些語言識別碼不處理（區分大小寫） | string[] | `[]` |
| `excludeSchemes` | 這些 document scheme 不處理；`git`、`vscode-scm` 一律跳過 | string[] | `["output"]` |
| `delay` | 變更後等幾毫秒才重繪（debounce），兩個功能共用 | integer | `500` |
| `statusBarEnabled` | 顯示狀態列項目 | boolean | `true` |
| `statusBarAlignment` | 狀態列項目靠左或靠右 | `left` \| `right` | `"left"` |
| `statusBarPriority` | 狀態列排序權重，越大越靠左 | integer | `-9000` |
| `statusBarScope` | 診斷計數範圍：所有文件或目前編輯器 | `all` \| `activeEditor` | `"activeEditor"` |

### 診斷

| 設定 | 用途 | 型別 | 預設 |
|---|---|---|---|
| `diagnosticLevels` | 要顯示與計數的嚴重度 | (`error` \| `warning` \| `info` \| `hint`)[] | `["error","warning","info"]` |
| `followCursor` | 相對游標要顯示哪些問題 | `allLines` \| `allLinesExceptActive` \| `activeLine` \| `closestProblem` | `"allLines"` |
| `messageTemplate` | 行內訊息樣板：`$message`、`$count`、`$severity`、`$source`、`$code`；留空只留底色 | string | `"$severity $message"` |
| `messageMaxChars` | 訊息超過此字數截斷，0 不限 | integer | `500` |
| `maxInlineMessages` | 每份文件最多幾條行內訊息，0 不限 | integer | `1000` |
| `messageBackgroundMode` | 底色畫在整行、只有訊息、或不畫 | `line` \| `message` \| `none` | `"line"` |
| `severityText` | `$severity` 展開的符號，順序錯誤、警告、資訊、提示 | string[4] | `["✖","▲","●","◇"]` |
| `margin` | 程式碼與訊息之間的 CSS 間距 | string | `"4ch"` |
| `fontSize` | 訊息的 CSS 字級，空字串跟隨編輯器 | string | `""` |
| `fontWeight` | 訊息字重 | `100`…`900` \| `normal` \| `bold` | `"normal"` |
| `fontStyleItalic` | 訊息用斜體 | boolean | `false` |
| `problemRangeDecorationEnabled` | 另外標出問題的實際範圍 | boolean | `false` |
| `excludeByMessage` | 訊息符合任一 regex 的問題不顯示 | string[] | `[]` |
| `excludeBySource` | 要隱藏的來源：`eslint` 或 `eslint(規則)` | string[] | `[]` |
| `searchForProblemQuery` | 搜尋指令的網址，`$message` 換成編碼後的訊息；只開 http/https；只能設在使用者層級 | string | `"https://duckduckgo.com/?q=$message"` |
| `alignMessage` | 對齊欄位：`start`、`end`、`minimumMargin`、`padding` [左, 右]、`useFixedPosition` | object | `{start:0, end:0, minimumMargin:4, padding:[0,0], useFixedPosition:true}` |
| `gutterIconsEnabled` | 行號旁顯示嚴重度圖示（不受 `followCursor` 影響） | boolean | `false` |
| `gutterIconSet` | 圖示樣式 | `default` \| `circle` \| `letter` \| `emoji` | `"default"` |
| `gutterEmoji` | 樣式為 emoji 時各嚴重度的符號 | object | `{error:"🔴", warning:"🟠", info:"🔵", hint:"🟢"}` |
| `gutterIconColors` | 方塊、圓形、字母樣式的顏色 | object | `{error:"#e45454", warning:"#ff942f", info:"#00b7e4", hint:"#2faf64"}` |
| `onSave` | 只在存檔時更新診斷裝飾 | boolean | `false` |
| `onSaveTimeout` | 存檔模式下裝飾顯示幾毫秒 | integer | `500` |

### 尾端空白

| 設定 | 用途 | 型別 | 預設 |
|---|---|---|---|
| `trailingSpacesRegexp` | 判定行尾空白的 regex | string | `"[ \\t]+"` |
| `trailingSpacesHighlightCurrentLine` | 游標所在行也高亮 | boolean | `true` |
| `trimIncludeEmptyLines` | 清除時整行空白的行也清 | boolean | `true` |
| `trimModifiedLinesOnly` | 只清自開檔或上次存檔以來改過的行 | boolean | `true` |
| `trailingSpacesHighlightOnly` | 僅顯示不清除；關掉後存檔自動清除 | boolean | `true` |
| `trimStatusBarMessage` | 清除後在狀態列短暫顯示結果 | boolean | `true` |
| `trailingSpacesBackgroundColor` | 高亮底色（CSS 色值） | string | `"#cca7004d"` |
| `trailingSpacesBorderColor` | 高亮邊框色（CSS 色值） | string | `"#cca70026"` |

### 顏色

診斷的顏色是 theme color，在 `workbench.colorCustomizations` 覆寫。四種嚴重度（`error`、`warning`、`info`、`hint`）各有四個：

| id | 用途 | 預設（深色／淺色） |
|---|---|---|
| `codeBeacon.<嚴重度>Background` | 整行底色 | error `#e454541b`／`#e4545420`、warning `#ff942f1b`／`#ff942f20`、info `#00b7e420`、hint `#17a2a220` |
| `codeBeacon.<嚴重度>MessageBackground` | 只有訊息模式的底色 | error `#e4545419`、warning `#ff942f19`、info `#00b7e419`、hint `#17a2a219` |
| `codeBeacon.<嚴重度>RangeBackground` | 問題實際範圍的底色 | 同上 |
| `codeBeacon.<嚴重度>Foreground` | 訊息文字與符號的顏色 | error `#ff6464`／`#e45454`、warning `#fa973a`／`#ff942f`、info `#00b7e4`、hint `#2faf64` |

例：

```json
"workbench.colorCustomizations": {
  "codeBeacon.errorForeground": "#ff8080",
  "codeBeacon.warningBackground": "#ff942f10"
}
```

尾端空白的顏色是一般設定（`trailingSpacesBackgroundColor`、`trailingSpacesBorderColor`），不是 theme color。

## 限制與已知差異

- **存檔自動清除與內建 `files.trimTrailingWhitespace` 的差別**：內建的會清整份檔案的所有行；本延伸模組的（`trailingSpacesHighlightOnly: false`）遵守 `trimModifiedLinesOnly`、`trimIncludeEmptyLines` 與自訂 regex。兩者同時開會各清各的，建議只留一個。
- **「修改過的行」以編輯事件計算**，開檔或存檔後歸零。用外部工具改了檔案再回到 VS Code，那些變更不算修改過的行。
- **狀態列的尾端空白計數只算目前編輯器**，即使 `statusBarScope` 是 `all`。
- **受限模式（Restricted Mode）**：`searchForProblemQuery`、`trailingSpacesRegexp`、`excludeByMessage` 不接受工作區設定，改用使用者設定的值。
- **diff 檢視左側**（`git:` scheme）與 SCM 輸入框不裝飾。
- `problems.visibility` 關掉時，診斷行內訊息一併隱藏。

## 開發

見 `CONTRIBUTING.md`。
