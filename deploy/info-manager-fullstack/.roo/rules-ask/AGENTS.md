# Project Documentation Rules (Non-Obvious Only)

- **專案內容衝突**: 這個程式碼庫包含兩個完全不同的應用：一個位於 `src` 和 `api` 目錄中的資訊管理器，以及一個位於根目錄 (`app.js`, `index.html`) 的 3D 骰子模擬器。在回答有關專案功能的問題時，請務必先釐清使用者指的是哪一個應用。
- **前端 API 呼叫**: 前端應用 ([`info-manager-fullstack/src/App.vue`](info-manager-fullstack/src/App.vue:81)) 使用相對路徑 `/api` 進行 API 呼叫。這依賴於部署環境 (如 Vercel) 或本地開發伺服器 (Vite) 的代理/重寫規則，而不是直接的網路請求。