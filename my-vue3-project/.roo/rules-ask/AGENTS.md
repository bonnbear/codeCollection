# Project Documentation Rules (Non-Obvious Only)

- **主要程式碼位置**: 所有應用程式邏輯在 [`src/App.vue`](src/App.vue)，這是唯一需要查看的核心檔案
- **helpers 目錄用途**: [`src/helpers/`](src/helpers/) 是 vue-grid-layout 的工具函數，非專案自訂邏輯
- **TreeNode.vue 存在但未使用**: [`src/TreeNode.vue`](src/TreeNode.vue) 存在於專案中，但主要邏輯仍在 App.vue
- **HTML 檔案為原型**: `src/` 中的 `.html` 檔案是獨立原型/範例，不是應用程式的一部分
- **PROJECT_DOCS.md**: 專案文件位於 [`PROJECT_DOCS.md`](PROJECT_DOCS.md)，包含更詳細的專案說明
