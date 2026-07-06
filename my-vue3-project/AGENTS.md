# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 非顯而易見的關鍵資訊

- **單一檔案架構**: 所有邏輯都在 [`src/App.vue`](src/App.vue) 中，不要建立新的 `.vue` 檔案
- **記憶體配置**: 開發/建置指令需要 8GB 記憶體 (`--max-old-space-size=8192`)
- **無 ESLint**: 已刻意禁用，程式碼風格需手動遵循現有模式
- **全域自動匯入**: Element Plus 元件和 Vue API 無需 import，由 `unplugin-auto-import` 處理
- **全域圖示**: 所有 Element Plus 圖示在 [`src/main.js`](src/main.js:8) 全域註冊，直接使用 `<User />` 等
- **API 代理**: `/api` 請求代理到 `http://localhost:3000`（見 [`vue.config.js`](vue.config.js:79)）
- **測試**: 無 `test` 腳本，使用 `npx playwright test` 手動執行

## 指令

```bash
npm run serve  # 開發伺服器 (localhost:8081)
npm run build  # 建置
