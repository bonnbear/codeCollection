# 資訊管理器加密功能實作指南

本文件說明如何在後端 API 中實作 AES 加密，以保護資料庫中儲存的敏感資訊（密碼欄位）。

## 1. 實作策略

採用伺服器端自動化加密/解密方案：
- **加密演算法**：AES (Advanced Encryption Standard)
- **加密範圍**：僅針對資料庫中的 `password` 欄位。
- **金鑰管理**：使用環境變數 `ENCRYPTION_KEY` 進行安全管理。
- **流程**：後端在接收資料時加密，在讀取資料時解密，對前端完全透明。

## 2. 程式碼變更摘要

所有變更都集中在後端 API 檔案：[`info-manager-fullstack/api/index.js`](info-manager-fullstack/api/index.js:0)。

### 2.1. 安裝加密套件

已在 `info-manager-fullstack/api/` 目錄下執行以下命令安裝 `crypto-js`：

```bash
npm install crypto-js
```

### 2.2. 加密/解密輔助函式

在 `index.js` 中引入 `crypto-js` 並定義了 `encrypt` 和 `decrypt` 函式，同時從環境變數讀取 `ENCRYPTION_KEY`。

### 2.3. API 路由修改

- **`POST /api/entries` (新增)**：在資料存入 MongoDB 之前，對 `req.body.password` 進行加密。
- **`PUT /api/entries/:id` (更新)**：在資料更新 MongoDB 之前，對 `req.body.password` 進行加密。
- **`GET /api/entries` (讀取)**：從 MongoDB 讀取資料後，對每個 entry 的 `password` 欄位進行解密，再回傳給前端。

## 3. 環境變數設定 (關鍵步驟)

為了讓加密功能正常運作，您必須設定 `ENCRYPTION_KEY` 環境變數。

### 3.1. 產生安全金鑰

請產生一個**長度為 32 個字元**的隨機安全字串作為您的 AES-256 加密金鑰。

### 3.2. 本地開發環境設定

1.  在 `info-manager-fullstack/api/` 目錄下建立一個名為 `.env` 的檔案。
2.  在 `.env` 檔案中加入以下內容（請替換為您產生的實際金鑰）：

    ```
    ENCRYPTION_KEY='您的32位元隨機安全金鑰'
    ```

    **注意：** 確保 `.env` 已被加入到 `.gitignore` 中，以防止金鑰意外上傳。

### 3.3. Vercel 生產環境設定

1.  登入您的 Vercel 帳戶，進入您的專案儀表板。
2.  導航至 **Settings -> Environment Variables** 頁面。
3.  新增一個環境變數：
    - **KEY (名稱)**：`ENCRYPTION_KEY`
    - **VALUE (值)**：貼上您產生的 32 位元隨機安全金鑰。
    - **ENVIRONMENT (環境)**：建議選擇 **Production**。

## 4. 測試

完成上述設定後，請重新啟動您的後端伺服器，並透過前端介面進行以下測試：

1.  **新增資料**：新增一筆資料，檢查 MongoDB 中 `password` 欄位是否為加密後的亂碼字串。
2.  **讀取資料**：重新整理頁面，檢查前端介面顯示的密碼是否為正確的純文字。
3.  **更新資料**：編輯一筆資料並儲存，檢查更新後的密碼在 MongoDB 中是否仍然是加密狀態。