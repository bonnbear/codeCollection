# Project Architecture Rules (Non-Obvious Only)

- **單一檔案架構**: 整個應用程式邏輯集中在 [`src/App.vue`](src/App.vue)，這是刻意的設計決策
- **內部元件模式**: 子元件使用 `defineComponent` + `h()` 渲染函數在 App.vue 內部定義，不建立獨立 `.vue` 檔案
- **無狀態管理庫**: 使用 Vue 3 的 `ref`/`computed` 進行本地狀態管理，沒有 Pinia/Vuex
- **helpers 目錄**: [`src/helpers/`](src/helpers/) 包含 vue-grid-layout 相關的工具函數，用於佈局計算
- **MCP 伺服器整合**: [`config.json`](config.json) 配置了多個 MCP 伺服器（filesystem、browser、memory 等）
