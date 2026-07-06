import { createApp } from 'vue'
import App from './App.vue'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueGridLayout from 'vue-grid-layout'

const app = createApp(App)

// vue-grid-layout@3.0.0-beta1 default export provides an install(app)
// that globally registers:
// - <grid-layout>
// - <grid-item>
app.use(VueGridLayout)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
