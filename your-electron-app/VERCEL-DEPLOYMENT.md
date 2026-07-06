# Vercel 部署說明

## ⚠️ 重要提醒

Vercel 是**無伺服器(Serverless)**環境,有以下限制:

1. **檔案系統唯讀** - 無法寫入本地檔案
2. **無狀態** - 每次請求可能在不同的伺服器上執行
3. **記憶體不持久** - 重啟後資料會遺失

## 📊 資料儲存方案

### 方案 A: 記憶體儲存 (已實作,僅供測試)

**特點:**
- ✅ 無需額外設定
- ✅ 部署最簡單
- ❌ 重啟後資料遺失
- ❌ 不適合生產環境

**使用場景:** 僅供測試和展示

### 方案 B: MongoDB Atlas (推薦)

**特點:**
- ✅ 完全免費 (512MB)
- ✅ 資料持久化
- ✅ 全球分散式
- ✅ 適合生產環境

**設定步驟:**

1. **註冊 MongoDB Atlas**
   - 訪問 https://www.mongodb.com/cloud/atlas
   - 註冊免費帳號
   - 建立免費叢集 (M0 Sandbox)

2. **取得連線字串**
   - 點擊 "Connect" → "Connect your application"
   - 複製連線字串,例如:
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/myDatabase
     ```

3. **在 Vercel 設定環境變數**
   - 進入 Vercel 專案設定
   - Settings → Environment Variables
   - 新增變數:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/info-manager
     ```

4. **更新程式碼使用 MongoDB**
   - 安裝 MongoDB 驅動: `npm install mongodb`
   - 修改 `server-vercel.js` 使用 MongoDB

### 方案 C: Vercel KV (Redis)

**特點:**
- ✅ Vercel 官方支援
- ✅ 設定簡單
- ❌ 需要付費方案

**設定步驟:**

1. 在 Vercel 專案中啟用 KV
2. 自動獲得環境變數
3. 使用 `@vercel/kv` 套件

## 🚀 部署步驟

### 1. 安裝 Vercel CLI

```bash
npm install -g vercel
```

### 2. 登入 Vercel

```bash
vercel login
```

### 3. 部署到 Vercel

```bash
# 測試部署
vercel

# 生產部署
vercel --prod
```

### 4. 設定環境變數 (如果使用 MongoDB)

```bash
vercel env add MONGODB_URI
# 輸入您的 MongoDB 連線字串
```

## 📝 當前實作說明

目前的 [`server-vercel.js`](server-vercel.js:1) 使用**記憶體儲存**:

```javascript
let dataStore = {
    data: [],
    meta: {}
};
```

**限制:**
- 資料儲存在記憶體中
- Vercel 重啟後會清空
- 不同的 Serverless 實例不共享資料

**適用場景:**
- 快速測試和展示
- 不需要持久化的應用
- 原型開發

## 🔄 升級到 MongoDB (推薦)

如果您需要資料持久化,建議使用 MongoDB Atlas。我可以為您建立整合 MongoDB 的版本。

### MongoDB 版本優點:

1. ✅ 資料永久保存
2. ✅ 支援多使用者
3. ✅ 完全免費 (512MB)
4. ✅ 自動備份
5. ✅ 全球 CDN

### 需要 MongoDB 版本嗎?

如果需要,我可以為您建立:
- `server-mongodb.js` - 整合 MongoDB 的伺服器
- MongoDB 資料模型
- 完整的 CRUD 操作
- 圖片儲存方案 (Base64 或 GridFS)

## 🎯 建議

### 測試/展示用途
使用當前的記憶體版本即可:
```bash
vercel --prod
```

### 生產環境
建議使用以下方案之一:
1. **Railway** - 支援檔案儲存,更適合此應用
2. **Render** - 免費且支援持久化
3. **VPS** - 完全控制
4. **Vercel + MongoDB** - 需要額外設定

## ❓ 常見問題

### Q: 為什麼資料會遺失?
A: Vercel 是無伺服器環境,每次部署或重啟都會清空記憶體。

### Q: 如何保存資料?
A: 使用外部資料庫如 MongoDB Atlas、PostgreSQL 或 Redis。

### Q: 圖片怎麼儲存?
A: 
- 方案 1: 轉換為 Base64 儲存在資料庫
- 方案 2: 使用 Cloudinary、AWS S3 等圖片服務
- 方案 3: 使用 Vercel Blob Storage (付費)

### Q: Vercel 適合這個應用嗎?
A: 
- ✅ 適合: 如果整合 MongoDB 或其他資料庫
- ❌ 不適合: 如果需要本地檔案儲存
- 💡 建議: 使用 Railway 或 Render 更簡單

## 🔗 相關資源

- [Vercel 文件](https://vercel.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)
- [完整部署指南](DEPLOYMENT.md)

## 💡 總結

**Vercel 部署適合:**
- 快速展示和測試
- 願意整合雲端資料庫
- 需要全球 CDN 加速

**不適合 Vercel 的情況:**
- 需要簡單的檔案儲存
- 不想設定資料庫
- 預算有限

**替代方案:**
- **Railway** - 最推薦,支援檔案儲存
- **Render** - 免費且簡單
- **VPS** - 完全控制

需要我為您建立 MongoDB 整合版本嗎?