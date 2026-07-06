# 線上資訊管理器 (Web 版本)

這是一個基於 Express 和 Socket.IO 的線上資訊管理系統,支援多使用者即時同步。

## 功能特色

- ✅ **線上存取**: 透過瀏覽器即可使用,無需安裝桌面應用
- ✅ **即時同步**: 使用 WebSocket 技術,多個使用者的變更會即時同步
- ✅ **資料加密**: 支援主密碼保護,資料加密儲存
- ✅ **圖片上傳**: 支援為每筆資料附加圖片
- ✅ **搜尋功能**: 快速搜尋名稱或帳號
- ✅ **響應式設計**: 支援桌面和行動裝置

## 安裝步驟

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 啟動伺服器

開發模式 (自動重啟):
```bash
npm run dev
```

生產模式:
```bash
npm start
```

### 3. 開啟瀏覽器

伺服器啟動後,在瀏覽器中開啟:
```
http://localhost:3000
```

## 使用說明

### 首次使用

1. 開啟應用程式後,如果沒有設定主密碼,可以直接開始使用
2. 建議點擊右上角的「設定」按鈕,設定主密碼以保護您的資料

### 新增資料

1. 在左側面板填寫名稱、帳號、密碼
2. 點擊「儲存資料」按鈕
3. 資料會自動同步到伺服器

### 編輯資料

1. 在右側列表中點擊「編輯」按鈕
2. 修改表單中的內容
3. 點擊「儲存資料」更新

### 上傳圖片

1. 選擇或建立一個項目
2. 點擊「選擇圖片」按鈕
3. 選擇要上傳的圖片檔案

### 即時同步

- 當其他使用者修改資料時,您的畫面會自動更新
- 右上角的連線狀態指示器會顯示連線狀態
- 綠色表示已連線,紅色表示斷線

## 技術架構

### 後端
- **Express**: Web 伺服器框架
- **Socket.IO**: WebSocket 即時通訊
- **express-session**: Session 管理
- **加密模組**: 資料加密保護

### 前端
- **原生 JavaScript**: 無需框架,輕量快速
- **Socket.IO Client**: 即時通訊客戶端
- **響應式 CSS**: 適應各種螢幕尺寸

## 資料儲存

所有資料儲存在伺服器的 `data` 目錄中:
- `data/data.json`: 主要資料檔案 (可能已加密)
- `data/meta.json`: 元資料 (包含密碼雜湊)
- `data/images/`: 圖片檔案目錄

## 安全性建議

1. **設定主密碼**: 強烈建議設定主密碼以加密資料
2. **使用 HTTPS**: 在生產環境中使用 HTTPS 協定
3. **定期備份**: 定期備份 `data` 目錄
4. **防火牆設定**: 限制伺服器存取權限

## 部署到生產環境

### 使用 PM2 (推薦)

```bash
# 安裝 PM2
npm install -g pm2

# 啟動應用
pm2 start server.js --name "info-manager"

# 設定開機自動啟動
pm2 startup
pm2 save
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 環境變數

可以透過環境變數設定:

```bash
# 設定埠號
PORT=3000 npm start

# 設定 Session 密鑰
SESSION_SECRET=your-secret-key npm start
```

## 從桌面版遷移

如果您之前使用 Electron 桌面版:

1. 將桌面版的 `password` 目錄複製到伺服器的 `data` 目錄
2. 重新命名檔案:
   - `password/data.json` → `data/data.json`
   - `password/meta.json` → `data/meta.json`
   - `password/images/` → `data/images/`
3. 重新啟動伺服器

## 常見問題

### Q: 如何變更伺服器埠號?
A: 使用環境變數 `PORT=8080 npm start`

### Q: 忘記主密碼怎麼辦?
A: 刪除 `data/meta.json` 檔案,但資料將無法解密

### Q: 如何備份資料?
A: 複製整個 `data` 目錄即可

### Q: 支援多少使用者同時使用?
A: 理論上無限制,但建議不超過 100 個同時連線

## 授權

ISC License

## 技術支援

如有問題,請查看原始 Electron 版本的文件或聯繫開發者。