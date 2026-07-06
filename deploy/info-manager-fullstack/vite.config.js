import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 新增 server 配置
  server: {
    proxy: {
      // 將所有 /api 開頭的請求代理到後端伺服器
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})