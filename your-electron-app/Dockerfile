# 使用 Node.js 官方映像
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製應用程式檔案
COPY . .

# 建立資料目錄
RUN mkdir -p data/images

# 暴露埠號
EXPOSE 3000

# 設定環境變數
ENV NODE_ENV=production

# 啟動應用
CMD ["node", "server.js"]