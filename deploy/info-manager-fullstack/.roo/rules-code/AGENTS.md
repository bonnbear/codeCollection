# Project Coding Rules (Non-Obvious Only)

- **API 資料格式轉換**: 在後端 API ([`info-manager-fullstack/api/index.js`](info-manager-fullstack/api/index.js:149)) 中，MongoDB 的 `_id` 欄位在傳送給前端時必須轉換為 `id`。反之，在接收到 POST/PUT 請求時，傳入的 `id` 欄位會被刪除，以確保 MongoDB 能正確處理 `_id`。
- **密碼加密**: 所有密碼在存入資料庫前都必須使用 [`encrypt()`](info-manager-fullstack/api/index.js:53) 函式進行加密，並在傳送給前端前使用 [`decrypt()`](info-manager-fullstack/api/index.js:62) 函式解密。
- **圖片儲存**: 圖片以 Base64 字串的形式直接儲存在資料庫的 `image` 欄位中。前端應用 ([`info-manager-fullstack/src/App.vue`](info-manager-fullstack/src/App.vue:193)) 負責將上傳的圖片檔案轉換為 Base64。