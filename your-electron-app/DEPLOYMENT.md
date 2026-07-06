# 部署指南 - 將應用部署到公網

本指南提供多種方式將資訊管理器部署到公網,讓任何人都能透過網路存取。

## 目錄
- [方案一: Vercel (最簡單,免費)](#方案一-vercel)
- [方案二: Railway (簡單,免費額度)](#方案二-railway)
- [方案三: Render (免費,支援 Docker)](#方案三-render)
- [方案四: 自有伺服器 (VPS)](#方案四-自有伺服器-vps)
- [方案五: Docker 部署](#方案五-docker-部署)

---

## 方案一: Vercel

**優點**: 完全免費、部署最簡單、自動 HTTPS、全球 CDN
**缺點**: 無狀態,不適合需要持久化資料的應用(需配合資料庫)

### 步驟

1. **安裝 Vercel CLI**
```bash
npm install -g vercel
```

2. **登入 Vercel**
```bash
vercel login
```

3. **部署**
```bash
vercel
```

4. **生產部署**
```bash
vercel --prod
```

### 注意事項
- Vercel 是無伺服器環境,檔案系統是唯讀的
- 需要使用外部資料庫(如 MongoDB Atlas)來儲存資料
- WebSocket 支援有限,建議使用 Vercel 的 Edge Functions

---

## 方案二: Railway

**優點**: 免費額度、支援持久化儲存、簡單易用
**缺點**: 免費額度有限(每月 $5 額度)

### 步驟

1. **前往 Railway**
   - 訪問 https://railway.app
   - 使用 GitHub 帳號登入

2. **建立新專案**
   - 點擊 "New Project"
   - 選擇 "Deploy from GitHub repo"
   - 選擇您的專案倉庫

3. **設定環境變數**
   ```
   PORT=3000
   NODE_ENV=production
   ```

4. **部署**
   - Railway 會自動偵測 Node.js 專案並部署
   - 部署完成後會獲得一個公開 URL

### 持久化儲存
Railway 支援 Volume,可以掛載持久化儲存:
- 在專案設定中新增 Volume
- 掛載路徑: `/app/data`

---

## 方案三: Render

**優點**: 免費方案、支援 Docker、自動 HTTPS
**缺點**: 免費方案會在閒置時休眠

### 步驟

1. **前往 Render**
   - 訪問 https://render.com
   - 註冊並登入

2. **建立 Web Service**
   - 點擊 "New +" → "Web Service"
   - 連接 GitHub 倉庫

3. **設定**
   ```
   Name: info-manager
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **環境變數**
   ```
   NODE_ENV=production
   ```

5. **部署**
   - 點擊 "Create Web Service"
   - Render 會自動部署並提供 HTTPS URL

### 持久化儲存
Render 免費方案不支援持久化儲存,需要升級到付費方案或使用外部資料庫。

---

## 方案四: 自有伺服器 (VPS)

**優點**: 完全控制、無限制、可持久化
**缺點**: 需要自行管理伺服器、需要付費

### 推薦 VPS 提供商
- **阿里雲** (中國大陸速度快)
- **騰訊雲** (中國大陸速度快)
- **DigitalOcean** (國際,簡單易用)
- **Vultr** (國際,價格便宜)
- **Linode** (國際,穩定可靠)

### 部署步驟

1. **購買並連線到 VPS**
```bash
ssh root@your-server-ip
```

2. **安裝 Node.js**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

3. **安裝 Git**
```bash
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

4. **克隆專案**
```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

5. **安裝依賴**
```bash
npm install
```

6. **使用 PM2 管理程序**
```bash
# 安裝 PM2
npm install -g pm2

# 啟動應用
pm2 start server.js --name info-manager

# 設定開機自動啟動
pm2 startup
pm2 save
```

7. **設定防火牆**
```bash
# 開放 3000 埠
sudo ufw allow 3000
sudo ufw enable
```

8. **設定 Nginx 反向代理 (可選,建議)**
```bash
# 安裝 Nginx
sudo apt-get install nginx

# 建立設定檔
sudo nano /etc/nginx/sites-available/info-manager
```

Nginx 設定內容:
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

啟用設定:
```bash
sudo ln -s /etc/nginx/sites-available/info-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

9. **設定 HTTPS (使用 Let's Encrypt)**
```bash
# 安裝 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 獲取 SSL 憑證
sudo certbot --nginx -d your-domain.com
```

---

## 方案五: Docker 部署

**優點**: 環境一致、易於遷移、隔離性好
**缺點**: 需要了解 Docker 基礎

### 本地測試

```bash
# 建立映像
docker build -t info-manager .

# 執行容器
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name info-manager info-manager
```

### 使用 Docker Compose

```bash
# 啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止
docker-compose down
```

### 部署到雲端

**Docker Hub + VPS**

1. **推送到 Docker Hub**
```bash
docker login
docker tag info-manager your-username/info-manager
docker push your-username/info-manager
```

2. **在 VPS 上拉取並執行**
```bash
docker pull your-username/info-manager
docker run -d -p 3000:3000 -v /path/to/data:/app/data --restart unless-stopped your-username/info-manager
```

---

## 域名設定

### 購買域名
- **阿里雲** (萬網)
- **騰訊雲**
- **GoDaddy**
- **Namecheap**
- **Cloudflare**

### DNS 設定
在域名提供商的控制台中,新增 A 記錄:
```
類型: A
名稱: @ (或 www)
值: 你的伺服器 IP
TTL: 自動或 3600
```

---

## 安全性建議

### 1. 設定主密碼
在應用程式中設定強主密碼來加密資料

### 2. 使用 HTTPS
- Vercel/Railway/Render 自動提供
- VPS 使用 Let's Encrypt (免費)

### 3. 設定防火牆
```bash
# 只開放必要的埠
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 4. 定期備份
```bash
# 備份資料目錄
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 自動備份腳本
0 2 * * * tar -czf /backup/data-$(date +\%Y\%m\%d).tar.gz /app/data/
```

### 5. 更新依賴
```bash
npm audit
npm update
```

---

## 監控與維護

### PM2 監控
```bash
pm2 monit              # 即時監控
pm2 logs               # 查看日誌
pm2 restart all        # 重啟所有程序
```

### 設定日誌輪替
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 常見問題

### Q: 如何選擇部署方案?
A: 
- **個人使用**: Render 或 Railway (免費)
- **小團隊**: Railway 或 VPS (低成本)
- **企業使用**: VPS 或雲端服務 (完全控制)

### Q: 資料會遺失嗎?
A: 
- Vercel: 會遺失,需要外部資料庫
- Railway/Render: 付費方案有持久化儲存
- VPS/Docker: 不會遺失

### Q: 如何處理大量使用者?
A: 
- 使用負載平衡器
- 升級伺服器規格
- 使用 Redis 做 Session 儲存
- 使用 CDN 加速靜態資源

### Q: 如何備份資料?
A: 定期備份 `data` 目錄,可以使用 cron 自動化

---

## 推薦部署流程

### 快速開始 (5分鐘)
1. 使用 Railway 或 Render
2. 連接 GitHub 倉庫
3. 自動部署
4. 獲得公開 URL

### 生產環境 (30分鐘)
1. 購買 VPS (阿里雲/DigitalOcean)
2. 安裝 Node.js 和 PM2
3. 設定 Nginx 反向代理
4. 設定 Let's Encrypt SSL
5. 設定自動備份

---

## 技術支援

如有部署問題,請查看:
- [README-WEB.md](README-WEB.md) - 基本使用說明
- [GitHub Issues](https://github.com/your-repo/issues) - 問題回報
- 各平台官方文件

祝您部署順利! 🚀