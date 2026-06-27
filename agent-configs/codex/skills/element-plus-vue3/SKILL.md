---
name: element-plus-vue3
description: Use when working with Element Plus in Vue 3 projects, including installation, component usage, forms, tables, dialogs, theming, i18n, global config, TypeScript, and troubleshooting.
---

# Element Plus for Vue 3

Use this skill when the user asks about Element Plus, `element-plus`, or Vue 3 UI work that should use Element Plus components.

## Workflow

1. Inspect the existing Vue project first.
   - Check `package.json` for Vue, Vite, Element Plus, unplugin auto imports, TypeScript, and CSS preprocessors.
   - Check the app entry such as `src/main.ts`, `src/main.js`, `src/App.vue`, and local component conventions.
   - Follow existing import style and component patterns unless there is a clear reason to change.

2. Choose an import strategy.
   - For small apps or prototypes, full import is acceptable:

```js
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

createApp(App).use(ElementPlus).mount('#app')
```

   - For production apps, prefer on-demand imports or the repo's existing auto-import setup.
   - If using `unplugin-vue-components` and `unplugin-auto-import`, configure `ElementPlusResolver`.

3. Build with Vue 3 Composition API.
   - Prefer `<script setup>` for new single-file components when the repo already uses it.
   - Keep refs, reactive state, computed values, and submit handlers explicit.
   - Use TypeScript types when the project is TypeScript-based.

4. Use the right Element Plus API surface.
   - Forms: `el-form`, `el-form-item`, `rules`, `FormInstance`, `validate`, `resetFields`.
   - Tables: `el-table`, `el-table-column`, `row-key`, pagination, selection, sorting, loading states.
   - Feedback: `ElMessage`, `ElNotification`, `ElMessageBox`, `el-dialog`, `el-drawer`.
   - Navigation: `el-menu`, `el-tabs`, breadcrumbs, dropdowns.
   - Inputs: `el-input`, `el-select`, `el-date-picker`, `el-switch`, `el-checkbox`, `el-radio`, `el-upload`.

5. Styling and theming.
   - Import Element Plus base CSS exactly once.
   - Prefer CSS variables and SCSS variable overrides over brittle deep selectors.
   - Use `ConfigProvider` for locale, size, z-index, namespace, and global config.
   - Avoid fighting Element Plus layout primitives; compose them cleanly with app-level CSS.

6. Verify.
   - Run the repo's typecheck, lint, build, or test scripts when available.
   - For UI changes, run the dev server and inspect the page in the browser when feasible.
   - Check console errors, missing CSS, hydration/client errors, and responsive layout.

## Common Commands

Install Element Plus:

```sh
npm install element-plus
```

Install on-demand import tooling:

```sh
npm install -D unplugin-vue-components unplugin-auto-import
```

## Vite Auto Import Example

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
})
```

## References

- Official Chinese docs: https://element-plus.org/zh-CN/
- Official English docs: https://element-plus.org/en-US/
- Component overview: https://element-plus.org/en-US/component/overview
- GitHub: https://github.com/element-plus/element-plus
