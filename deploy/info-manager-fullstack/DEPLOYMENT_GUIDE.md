# 資訊管理器：Vue 3 + Node.js/Express 全端應用部署指南

本指南詳細說明如何建構一個使用 Vue 3 (Vite) 作為前端、Node.js/Express 作為後端 API，並使用 Vercel 進行一鍵部署的 Monorepo 專案。

## 專案概覽

*   **前端**：Vue 3 (Vite)
*   **後端**：Node.js (Express) Serverless Function
*   **資料持久化**：使用 `api/db.json` 檔案（**注意**：此方法適用於簡單演示，不適用於高流量或需要高可靠性的生產環境）。
*   **部署平台**：Vercel

## 專案結構

```
.
├── api/                  # 後端 Node.js/Express 程式碼
│   ├── index.js          # Serverless Function 主檔案 (CRUD 邏輯)
│   ├── db.json           # 資料庫檔案 (被 .gitignore 忽略)
│   └── package.json      # 後端依賴 (express, cors, nodemon)
├── src/                  # 前端 Vue 3 程式碼
│   ├── App.vue           # 應用程式主元件 (包含所有 UI/邏輯/樣式)
│   └── main.js           # Vue 應用程式入口
├── index.html            # 前端 HTML 頁面
├── package.json          # 根目錄依賴 (concurrently, axios)
├── vite.config.js        # Vite 配置 (包含本地開發代理)
├── vercel.json           # Vercel 部署配置
└── .gitignore            # Git 忽略檔案
```

## 步驟 1：環境準備

請確保您的系統已安裝以下工具：

*   [Node.js](https://nodejs.org/) (包含 npm)
*   [Git](https://git-scm.com/)

## 步驟 2：初始化專案與共用依賴

在專案根目錄執行以下指令：

1.  **初始化 `package.json` 並安裝 `concurrently`**：
    ```bash
    npm init -y
    npm install concurrently
    ```

2.  **配置根目錄 `package.json` 的 `dev` 腳本**：
    編輯 [`package.json`](package.json) 檔案，新增 `dev` 腳本以同時啟動前後端。
    ```json
    // package.json
    {
      "scripts": {
        "dev": "concurrently \"npm --prefix ./api run dev\" \"npm run dev\"",
        "test": "echo \"Error: no test specified\" && exit 1"
      },
      "dependencies": {
        "concurrently": "^9.2.1"
      }
    }
    ```

## 步驟 3：建立後端 API

1.  **建立 `api` 資料夾並初始化**：
    ```bash
    mkdir api
    cd api
    npm init -y
    ```

2.  **安裝後端依賴**：
    ```bash
    npm install express cors
    npm install --save-dev nodemon
    ```

3.  **配置 `api/package.json` 腳本**：
    新增 `start` 和 `dev` 腳本。
    ```bash
    npm pkg set scripts.start="node index.js" scripts.dev="nodemon index.js"
    ```

4.  **建立後端主檔案**：
    建立 [`api/index.js`](api/index.js) 檔案，包含 Express 伺服器和 CRUD 邏輯。

5.  **建立資料庫檔案**：
    建立 [`api/db.json`](api/db.json) 檔案。
    ```json
    // api/db.json
    {
      "entries": []
    }
    ```

## 步驟 4：建立前端應用 (Vue 3)

1.  **建立 Vue 專案結構**：
    ```bash
    # 確保您在專案根目錄
    mkdir -p src/assets
    ```
    手動建立以下檔案：
    *   [`index.html`](index.html)
    *   [`src/main.js`](src/main.js)
    *   [`src/assets/main.css`](src/assets/main.css)
    *   [`src/assets/base.css`](src/assets/base.css)

2.  **安裝前端依賴**：
    ```bash
    npm install axios
    ```

3.  **建立 `vite.config.js`**：
    建立 [`vite.config.js`](vite.config.js) 檔案，配置本地開發代理。

4.  **建立 `src/App.vue`**：
    建立 [`src/App.vue`](src/App.vue) 檔案，包含所有 Vue 應用程式的邏輯、模板和樣式。

## 步驟 5：Vercel 部署配置

1.  **建立 `.gitignore`**：
    建立 [`.gitignore`](.gitignore) 檔案，確保敏感檔案和建置產物不會被提交。
    ```
    # ... (其他忽略規則)
    /node_modules
    /api/node_modules
    /dist
    /api/db.json
    ```

2.  **建立 `vercel.json`**：
    建立 [`vercel.json`](vercel.json) 檔案，配置 Vercel 的建置和路由重寫規則。

    ```json
    // vercel.json
    {
      "version": 2,
      "builds": [
        {
          "src": "api/index.js",
          "use": "@vercel/node"
        },
        {
          "src": "package.json",
          "use": "@vercel/static-build",
          "config": { "distDir": "dist" }
        }
      ],
      "rewrites": [
        {
          "source": "/api/(.*)",
          "destination": "/api/index.js"
        },
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ]
    }
    ```

## 步驟 6：本地測試與部署

1.  **本地測試**：
    ```bash
    # 在專案根目錄執行
    npm run dev
    ```
    *（這將同時啟動後端伺服器 (3001) 和前端開發伺服器 (5173)。）*

2.  **部署到 Vercel**：
    *   初始化 Git 並將程式碼推送到 GitHub 儲存庫。
    *   登入 Vercel，匯入您的 GitHub 儲存庫。
    *   Vercel 將自動偵測 `vercel.json` 並部署您的全端應用程式。