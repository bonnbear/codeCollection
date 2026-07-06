# Project Debug Rules (Non-Obvious Only)

- **開發伺服器埠號**: 應用程式運行在 `http://localhost:8081`，不是預設的 8080
- **記憶體問題**: 如遇記憶體不足錯誤，確認指令使用了 `--max-old-space-size=8192`
- **無 ESLint 錯誤**: 專案已禁用 ESLint，不會有 linting 錯誤輸出
- **API 請求失敗**: 確認後端伺服器運行在 `localhost:3000`，代理配置在 [`vue.config.js`](vue.config.js:79)
- **Playwright 測試**: 使用 `npx playwright test` 執行，瀏覽器路徑配置在 [`config.json`](config.json:12)
- **建置記憶體報告**: 建置完成後會輸出詳細的記憶體使用報告（見 [`vue.config.js`](vue.config.js:112)）
