# 專案結構與功能說明文檔

## 1. 專案概述
本專案是一個基於 **Vue 3** 和 **Element Plus** 的單頁應用程式 (SPA)。
目前的實作重點是一個互動式的**「檔案瀏覽器」**介面，展示了遞迴組件的使用、樣式封裝以及響應式佈局設計。

## 2. 專案結構
主要檔案結構如下：

```text
my-vue3-project/
├── public/              # 靜態資源 (favicon, index.html)
├── src/
│   ├── assets/          # 專案資源 (圖片等)
│   ├── helpers/         # 輔助函式庫 (DOM, Utils 等)
│   ├── App.vue          # 應用程式主入口與佈局容器
│   ├── main.js          # 應用程式進入點，全域套件設定 (Element Plus, Icons)
│   └── TreeNode.vue     # [核心組件] 獨立封裝的樹狀節點組件
├── package.json         # 專案依賴與腳本設定
├── vue.config.js        # Vue CLI 設定
└── README.md            # 基礎說明
```

## 3. 核心功能與組件說明

### 3.1 檔案瀏覽器 (File Browser)
這是目前應用程式的核心功能，由 `App.vue` 和 `TreeNode.vue` 共同實現。

#### `src/App.vue` (主佈局)
*   **職責**: 負責應用程式的整體佈局架構。
*   **主要區塊**:
    *   **側邊欄 (Sidebar)**: 顯示檔案樹狀結構，支援展開/收起動畫。
    *   **主內容區 (Main Content)**: 顯示當前選中節點的詳細資訊與路徑。
*   **狀態管理**:
    *   `treeData`: 定義檔案系統的層級結構數據。
    *   `isSidebarOpen`: 控制側邊欄的顯示狀態。
    *   `selectedNodeId`: 記錄當前被選中的檔案/資料夾。
*   **樣式**: 處理 `.card-container` 等外部容器的佈局與響應式行為。

#### `src/TreeNode.vue` (樹狀節點)
*   **職責**: 渲染單個檔案或資料夾節點，並遞迴渲染子節點。
*   **設計特性**:
    *   **完全封裝 (Encapsulated)**: 所有節點相關的樣式（如連接線、縮排、圖示顏色、懸停效果）都寫在組件內部的 `<style scoped>` 中，不依賴外部 CSS。
    *   **遞迴渲染 (Recursive)**: 組件內部調用自身來顯示無限層級的子目錄。
    *   **視覺細節**:
        *   自動計算縮排寬度。
        *   繪製層級連接線 (Guide lines)。
        *   資料夾展開/收起的過渡動畫。
*   **Props 介面**:
    *   `node`: 節點資料物件。
    *   `level`: 當前層級深度 (用於計算縮排)。
    *   `isLast`: 是否為該層級最後一個節點 (影響連接線繪製)。

## 4. 開發與構建指南

### 依賴安裝
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run serve
```
*   **注意**: 開發伺服器配置了 8GB 記憶體限制 (`--max-old-space-size=8192`) 以支援大型專案構建。
*   預設位址: `http://localhost:8081`

### 生產環境構建
```bash
npm run build
```

## 5. 最近更新紀錄
*   **架構重構**: 將原本內嵌於 `App.vue` 的 `TreeNode` 邏輯提取為獨立的 `src/TreeNode.vue` 檔案。
*   **樣式優化**: 
    *   移除了 `App.vue` 中使用 `:deep()` 的樣式穿透寫法。
    *   在 `TreeNode.vue` 中實現了完整的樣式隔離。
    *   增加了節點文字與圖示之間的間距，提升閱讀體驗。