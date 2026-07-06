# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 專案核心衝突 (Critical Project Conflict)
- 專案名稱為 "info-manager-fullstack"，但根目錄下的程式碼 (`app.js`, `index.html`) 是一個 Three.js 的 3D 骰子模擬器。而 `src` 和 `api` 目錄下的程式碼才是一個 Vue 的資訊管理應用。在進行任何修改前，請與使用者確認預期的功能。

## 環境變數 (Environment Variables)
- **`MONGODB_URI`**: 後端 API ([`info-manager-fullstack/api/index.js`](info-manager-fullstack/api/index.js:10)) 需要此變數以連線到資料庫。在本地開發中，若缺少此變數，API 仍會運行但資料庫操作會失敗。
- **`ENCRYPTION_KEY`**: API 使用此金鑰對敏感資料 (例如密碼) 進行對稱加密。若缺少此變數，API 將無法啟動。

## 命令 (Commands)
- **啟動全端應用程式**: `npm run start-all` (在專案根目錄執行，使用 concurrently 同時啟動前後端)
- **僅啟動後端開發模式**: `npm --prefix ./api run dev`
- **僅啟動前端開發模式**: `npm run start-frontend`

## 測試 (Testing)
- 專案目前沒有配置任何單元測試或整合測試。