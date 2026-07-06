# Project Coding Rules (Non-Obvious Only)

- **編輯單一檔案**: 所有應用程式邏輯都位於 `src/App.vue`。對任何功能的修改都必須在此檔案中進行。
- **使用渲染函數建立元件**: 子元件是在 `src/App.vue` 內部使用 `defineComponent` 和 `h` (渲染函數) 動態建立的，而不是在單獨的 `.vue` 檔案中。新元件應遵循此模式。
- **無需匯入**: `Element Plus` 元件和 `vue` / `vue-router` 的核心 API 是全域可用的，在元件中不需要手動 `import`。
- **直接使用圖示**: 所有 Element Plus 圖示都在 `src/main.js` 中全域註冊，可以直接在模板中作為元件使用 (例如 `<User />`)。
- **無 Linter**: ESLint 已被禁用。程式碼風格必須手動遵循現有程式碼的模式。
- **本地狀態管理**: 應用程式狀態直接在 `src/App.vue` 中使用 `ref` 和 `computed` 管理，沒有使用 Pinia 或 Vuex。