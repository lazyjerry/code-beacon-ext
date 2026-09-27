# Changelog

本檔案記錄 Inline Beacon 的版本變更，格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Changed

- 重新打包發布，功能與 0.1.0 相同。

## [0.1.0] - 2026-09-27

### Added

- **診斷行內訊息**：錯誤、警告、資訊（提示可另開）直接顯示在該行行尾，整行或只有訊息上底色；訊息樣板可用 `$severity`／`$message`／`$count`／`$source`／`$code`，可截斷、可限制每檔數量、可對齊到固定欄位、可依游標只顯示附近的問題。
- **問題範圍與 gutter 圖示**：可另外標出問題的實際範圍；行號旁可顯示四種樣式（方塊、圓形、字母、emoji）的嚴重度圖示，顏色與 emoji 可自訂。
- **尾端空白**：即時高亮（預設警告黃），預設僅顯示不清除；指令可清除修改過的行或整份檔案；關掉「僅顯示」後存檔時自動清除。regex、是否含整行空白、是否只清修改行都可設定。
- **狀態列**：一個項目同時顯示錯誤、警告、資訊與含尾端空白的行數，有錯誤時套錯誤底色，點擊開「問題」面板。
- **排除規則**：glob、語言、scheme 兩個功能共用；診斷另可依來源或訊息 regex 排除。
- **指令**：切換功能（Quick Pick）、搜尋游標所在行的問題、複製問題訊息、清除尾端空白、清除尾端空白（整份檔案）。預設不綁快捷鍵。
- **設定頁中英雙語**：說明隨 VS Code 顯示語言切換（英文、繁體中文）。
- 16 個 theme color 可透過 `workbench.colorCustomizations` 覆寫。
