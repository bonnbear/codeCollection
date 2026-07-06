# Project Architecture Rules (Non-Obvious Only)

- **API 部署模式**: 後端 API ([`info-manager-fullstack/api/index.js`](info-manager-fullstack/api/index.js:284)) 專為 Vercel Serverless Function 部署而設計。它透過 `module.exports = app` 匯出 Express 應用，並且在生產環境中不監聽特定端口。所有路由都應設計為無狀態的。
- **API 請求限制**: API 伺服器已將 JSON 請求體大小限制增加到 `10mb` ([`info-manager-fullstack/api/index.js`](info-manager-fullstack/api/index.js:81))，以支援以 Base64 編碼的圖片上傳。
- **單體式前端**: 前端是一個單一的 Vue 元件 ([`info-manager-fullstack/src/App.vue`](info-manager-fullstack/src/App.vue))，負責處理所有 UI 邏輯、狀態管理和 API 呼叫。沒有使用 Vuex 或 Pinia 等狀態管理庫。