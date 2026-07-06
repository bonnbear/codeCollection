# 實時在線編輯器

這是一個使用 Next.js、Socket.io 和 TypeScript 構建的簡單實時在線編輯器。該應用允許多個用戶同時編輯一個文本區域，並實時查看彼此的更改。

## 功能

*   **實時內容同步**：用戶在一個客戶端上所做的更改會立即廣播到所有其他連接的客戶端。
*   **簡單的用戶界面**：一個乾淨、簡潔的界面，只包含一個用於文本輸入的文本區域。
*   **可擴展的後端**：使用 Next.js API 路由和 Socket.io 構建，易於擴展以支持更複雜的功能。

## 技術棧

*   **前端**：
    *   [Next.js](https://nextjs.org/) (React 框架)
    *   [React](https://reactjs.org/)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Tailwind CSS](https://tailwindcss.com/)
    *   [Socket.io Client](https://socket.io/docs/v4/client-api/)
*   **後端**：
    *   [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
    *   [Socket.io](https://socket.io/)
    *   [Express](https://expressjs.com/) (由 Next.js 在底層使用)
*   **部署**：
    *   [Vercel](https://vercel.com/)

## 項目構建流程

### 1. 初始化項目

我們使用 `create-next-app` 來初始化一個新的 Next.js 項目，並包含 TypeScript 和 Tailwind CSS。

```bash
npx create-next-app@latest real-time-editor --typescript --eslint --tailwind --src-dir --app --import-alias "@/*"
```

### 2. 安裝依賴

接下來，我們安裝了 `socket.io` 和 `socket.io-client` 用於實時通信。

```bash
npm install socket.io socket.io-client express```

### 3. 創建前端

我們修改了 `src/app/page.tsx` 文件來創建一個簡單的前端界面。該界面包含一個文本區域，並使用 `useEffect` hook 來初始化與後端的 Socket.io 連接。

### 4. 創建後端

我們在 `src/pages/api/socket.ts` 創建了一個 Next.js API 路由。這個路由負責：
*   初始化一個 Socket.io 服務器。
*   監聽新的客戶端連接。
*   處理來自客戶端的 `contentChange` 事件，並將更新的內容廣播給所有其他客戶端。

### 5. 連接前後端

前端通過向 `/api/socket` 發出 `fetch` 請求來觸發後端服務器的初始化。一旦服務器運行，前端就會使用 `socket.io-client` 建立一個持久的 WebSocket 連接。

## 本地開發

1.  克隆此倉庫。
2.  安裝依賴：
    ```bash
    npm install
    ```
3.  啟動開發服務器：
    ```bash
    npm run dev
    ```
4.  在瀏覽器中打開 `http://localhost:3000`。

## 部署到 Vercel

1.  將您的代碼推送到一個 Git 提供商（例如 GitHub）。
2.  在 Vercel 上導入您的項目。
3.  Vercel 將自動檢測到這是一個 Next.js 項目並進行部署。我們還添加了一個 `vercel.json` 文件以提供明確的部署配置。
