<template>
  <div class="page">
    <header class="toolbar">
      <div class="toolbar__left">
        <div class="seg">
          <button
            class="seg__btn"
            :class="{ 'is-active': engine === 'vue-grid-layout' }"
            @click="engine = 'vue-grid-layout'"
          >
            vue-grid-layout
          </button>
          <button
            class="seg__btn"
            :class="{ 'is-active': engine === 'gridstack' }"
            @click="engine = 'gridstack'"
          >
            gridstack.js
          </button>
        </div>

        <button class="btn" :class="{ 'is-active': isEditMode }" @click="toggleEditMode">
          {{ isEditMode ? '編輯模式（可拖曳/縮放）' : '瀏覽模式（不可拖曳/縮放）' }}
        </button>

        <div class="divider" />

        <button class="btn" :disabled="!isEditMode" @click="addItemPreset('sm')">新增 3×3</button>
        <button class="btn" :disabled="!isEditMode" @click="addItemPreset('md')">新增 4×4</button>
        <button class="btn" :disabled="!isEditMode" @click="addItemPreset('lg')">新增 6×4</button>
      </div>

      <div class="toolbar__right">
        <button class="btn" @click="saveLayout">保存（localStorage）</button>
        <button class="btn" @click="loadLayout">載入（localStorage）</button>
        <button class="btn btn--danger" @click="resetToDefault">重置預設</button>
      </div>
    </header>

    <section class="hint">
      <div class="hint__title">說明</div>
      <ul>
        <li>
          兩個版本都做到：新增/刪除 item、保存/載入、瀏覽/編輯切換、卡片內容、v-for 渲染。
        </li>
        <li>
          「保存/載入到後端」此 demo 以 localStorage 模擬；你可以把 save/load 函數內的序列化資料改成 axios/fetch 對接真正 API。
        </li>
        <li>
          新增卡片會提供 w/h，並交給各自引擎做 auto placement（不手算 x/y）。
        </li>
      </ul>
    </section>

    <!-- A) vue-grid-layout -->
    <section v-if="engine === 'vue-grid-layout'" class="stage">
      <div class="stage__title">A. vue-grid-layout（Vue 原生元件）</div>

      <GridLayout
        v-model:layout="vglLayout"
        :col-num="12"
        :row-height="28"
        :is-draggable="isEditMode"
        :is-resizable="isEditMode"
        :vertical-compact="true"
        :use-css-transforms="true"
        :margin="[10, 10]"
      >
        <GridItem
          v-for="item in vglLayout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
        >
          <Card
            :title="item.title"
            :content="item.content"
            :show-delete="isEditMode"
            @delete="removeItem(item.i)"
          />
        </GridItem>
      </GridLayout>
    </section>

    <!-- B) gridstack -->
    <section v-else class="stage">
      <div class="stage__title">B. gridstack.js（通用 library + Vue 手動整合）</div>

      <div class="grid-stack" ref="gridRef">
        <div
          v-for="item in gsItems"
          :key="item.id"
          class="grid-stack-item"
          :gs-id="item.id"
          :gs-w="item.w"
          :gs-h="item.h"
          :gs-x="item.x"
          :gs-y="item.y"
        >
          <div class="grid-stack-item-content">
            <Card
              :title="item.title"
              :content="item.content"
              :show-delete="isEditMode"
              @delete="removeItem(item.id)"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Note: 專案已安裝 vue-grid-layout 與 gridstack。
// vue-grid-layout 目前在 dependencies 是 ^3.0.0-beta1（Vue 3 版）。

import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

/**
 * 這個 Repo 有「單一檔案架構」限制：所有 UI/邏輯都放在 src/App.vue
 * 因此我用 defineComponent 在同檔宣告 Card。
 */
const Card = defineComponent({
  name: 'DemoCard',
  props: {
    title: { type: String, required: true },
    content: { type: String, required: true },
    showDelete: { type: Boolean, default: false },
  },
  emits: ['delete'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'card' }, [
        h('div', { class: 'card__header' }, [
          h('div', { class: 'card__title' }, props.title),
          props.showDelete
            ? h(
                'button',
                {
                  class: 'card__delete',
                  title: '刪除',
                  onClick: (e) => {
                    e.stopPropagation()
                    emit('delete')
                  },
                },
                '✕'
              )
            : null,
        ]),
        h('div', { class: 'card__content' }, props.content),
      ])
  },
})

/**
 * Demo 狀態
 */
const engine = ref('vue-grid-layout') // 'vue-grid-layout' | 'gridstack'
const isEditMode = ref(false)

const LS_KEYS = {
  vgl: 'demo-layout-vue-grid-layout',
  gs: 'demo-layout-gridstack',
}

const presets = {
  sm: { w: 3, h: 3 },
  md: { w: 4, h: 4 },
  lg: { w: 6, h: 4 },
}

/**
 * A) vue-grid-layout data
 * layout item 格式：{ x, y, w, h, i, title, content }
 */
const vglLayout = ref(defaultVglLayout())
let vglCounter = nextCounterFromVgl(vglLayout.value)

/**
 * B) gridstack data
 * item 格式：{ id, x, y, w, h, title, content }
 */
const gsItems = ref(defaultGsItems())
let gsCounter = nextCounterFromGs(gsItems.value)

/**
 * GridStack instance
 */
const gridRef = ref(null)
let grid = null

/**
 * UI actions
 */
function toggleEditMode() {
  isEditMode.value = !isEditMode.value
  // gridstack: 即時切換 enable/disable
  if (grid) {
    grid.enableMove(isEditMode.value)
    grid.enableResize(isEditMode.value)
  }
}

function addItemPreset(sizeKey) {
  const { w, h } = presets[sizeKey] || presets.md
  addItem(w, h)
}

function addItem(w, h) {
  if (!isEditMode.value) return

  if (engine.value === 'vue-grid-layout') {
    const id = String(vglCounter++)
    // 交給 vgl 自己透過 compact/collision 找位置：
    // 以 y=0 放在最上方，必要時會往下推。
    vglLayout.value.push({
      x: 0,
      y: 0,
      w,
      h,
      i: id,
      title: `卡片 ${id}`,
      content: `這是 vue-grid-layout 產生的卡片（id=${id}）。\n你可以在編輯模式拖曳/縮放，並保存/載入。`,
    })
    return
  }

  // gridstack：交給引擎 autoPosition
  const id = String(gsCounter++)
  const newItem = {
    id,
    x: undefined,
    y: undefined,
    w,
    h,
    title: `卡片 ${id}`,
    content: `這是 gridstack 產生的卡片（id=${id}）。\n你可以在編輯模式拖曳/縮放，並保存/載入。`,
  }

  gsItems.value.push(newItem)

  // 關鍵：Vue render 完成後，再 makeWidget，並用 autoPosition。
  nextTick(() => {
    if (!grid || !gridRef.value) return
    const el = gridRef.value.querySelector(`[gs-id="${id}"]`)
    if (!el) return

    // 讓 GridStack 接管這個 DOM（不要用 addWidget 去新增 DOM，避免跟 Vue 打架）
    grid.makeWidget(el)
    grid.update(el, { w, h, autoPosition: true })

    const node = el.gridstackNode
    if (node) {
      newItem.x = node.x
      newItem.y = node.y
      newItem.w = node.w
      newItem.h = node.h
    }
  })
}

function removeItem(id) {
  if (engine.value === 'vue-grid-layout') {
    const idx = vglLayout.value.findIndex((x) => x.i === id)
    if (idx >= 0) vglLayout.value.splice(idx, 1)
    return
  }

  const idx = gsItems.value.findIndex((x) => x.id === id)
  if (idx < 0) return

  if (grid && gridRef.value) {
    const el = gridRef.value.querySelector(`[gs-id="${id}"]`)
    if (el) grid.removeWidget(el, false)
  }

  gsItems.value.splice(idx, 1)
}

function saveLayout() {
  if (engine.value === 'vue-grid-layout') {
    const payload = vglLayout.value.map((it) => pickLayoutItem(it))
    localStorage.setItem(LS_KEYS.vgl, JSON.stringify(payload))
    alert('已保存 vue-grid-layout 佈局到 localStorage')
    return
  }

  // gridstack：從 DOM node 取最新 x/y/w/h，確保保存的是最新狀態
  const payload = gsItems.value.map((it) => {
    const node = getGridstackNodeById(it.id)
    return {
      id: it.id,
      x: node?.x ?? it.x,
      y: node?.y ?? it.y,
      w: node?.w ?? it.w,
      h: node?.h ?? it.h,
      title: it.title,
      content: it.content,
    }
  })

  localStorage.setItem(LS_KEYS.gs, JSON.stringify(payload))
  alert('已保存 gridstack 佈局到 localStorage')
}

async function loadLayout() {
  if (engine.value === 'vue-grid-layout') {
    const raw = localStorage.getItem(LS_KEYS.vgl)
    const data = safeParseArray(raw)
    if (!data.length) {
      alert('找不到已保存的 vue-grid-layout 佈局')
      return
    }

    // 直接替換 layout
    vglLayout.value = data.map((it) => ({
      ...it,
      i: String(it.i),
    }))
    vglCounter = nextCounterFromVgl(vglLayout.value)
    alert('已載入 vue-grid-layout 佈局')
    return
  }

  const raw = localStorage.getItem(LS_KEYS.gs)
  const data = safeParseArray(raw)
  if (!data.length) {
    alert('找不到已保存的 gridstack 佈局')
    return
  }

  // 先把 gridstack 清空
  destroyGridstackWidgetsOnly()

  gsItems.value = data.map((it) => ({
    id: String(it.id),
    x: it.x,
    y: it.y,
    w: it.w,
    h: it.h,
    title: it.title ?? `卡片 ${it.id}`,
    content: it.content ?? '',
  }))
  gsCounter = nextCounterFromGs(gsItems.value)

  await nextTick()

  // 重新讓 GridStack 接管 DOM
  ensureGridstackMounted()
  batchMakeWidgets()

  alert('已載入 gridstack 佈局')
}

function resetToDefault() {
  if (engine.value === 'vue-grid-layout') {
    vglLayout.value = defaultVglLayout()
    vglCounter = nextCounterFromVgl(vglLayout.value)
    return
  }

  destroyGridstackWidgetsOnly()
  gsItems.value = defaultGsItems()
  gsCounter = nextCounterFromGs(gsItems.value)

  nextTick(() => {
    ensureGridstackMounted()
    batchMakeWidgets()
  })
}

/**
 * gridstack lifecycle
 */
onMounted(() => {
  // 只在 gridstack mode 需要 init；但使用者可能在第一次載入就切換
  if (engine.value === 'gridstack') {
    nextTick(() => {
      ensureGridstackMounted()
      batchMakeWidgets()
    })
  }
})

onBeforeUnmount(() => {
  if (grid) {
    grid.destroy(false)
    grid = null
  }
})

watch(
  () => engine.value,
  async (next) => {
    if (next !== 'gridstack') return

    // 切換到 gridstack 時：確保 grid init & widgets 接管
    await nextTick()
    ensureGridstackMounted()
    batchMakeWidgets()

    // 套用目前的 edit mode
    if (grid) {
      grid.enableMove(isEditMode.value)
      grid.enableResize(isEditMode.value)
    }
  }
)

function ensureGridstackMounted() {
  if (grid || !gridRef.value) return

  grid = GridStack.init(
    {
      column: 12,
      cellHeight: 40,
      margin: 10,
      float: false,
      disableDrag: !isEditMode.value,
      disableResize: !isEditMode.value,
      animate: true,
    },
    gridRef.value
  )

  grid.on('change', (_event, changedItems) => {
    // 使用 change 事件同步資料
    changedItems.forEach((n) => {
      const id = String(n.id)
      const it = gsItems.value.find((x) => x.id === id)
      if (!it) return
      it.x = n.x
      it.y = n.y
      it.w = n.w
      it.h = n.h
    })
  })
}

function batchMakeWidgets() {
  if (!grid || !gridRef.value) return
  grid.batchUpdate()

  gsItems.value.forEach((it) => {
    const el = gridRef.value.querySelector(`[gs-id="${it.id}"]`)
    if (!el) return

    // makeWidget 會讀取 gs-x/gs-y/gs-w/gs-h attrs
    grid.makeWidget(el)
  })

  grid.batchUpdate(false)
}

function destroyGridstackWidgetsOnly() {
  // 用於載入/重置前，清掉目前 widgets，但保留 grid instance
  if (grid) {
    grid.removeAll(false)
  }
}

function getGridstackNodeById(id) {
  if (!gridRef.value) return null
  const el = gridRef.value.querySelector(`[gs-id="${id}"]`)
  return el?.gridstackNode ?? null
}

/**
 * helpers
 */
function safeParseArray(raw) {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function pickLayoutItem(it) {
  return {
    i: String(it.i),
    x: Number(it.x ?? 0),
    y: Number(it.y ?? 0),
    w: Number(it.w ?? 1),
    h: Number(it.h ?? 1),
    title: String(it.title ?? `卡片 ${it.i}`),
    content: String(it.content ?? ''),
  }
}

function nextCounterFromVgl(layout) {
  const nums = layout
    .map((x) => parseInt(String(x.i), 10))
    .filter((n) => Number.isFinite(n))
  return (nums.length ? Math.max(...nums) : 0) + 1
}

function nextCounterFromGs(items) {
  const nums = items
    .map((x) => parseInt(String(x.id), 10))
    .filter((n) => Number.isFinite(n))
  return (nums.length ? Math.max(...nums) : 0) + 1
}

function defaultVglLayout() {
  return [
    { x: 0, y: 0, w: 4, h: 4, i: '1', title: '卡片 1', content: '內容 A（vue-grid-layout）' },
    { x: 4, y: 0, w: 4, h: 4, i: '2', title: '卡片 2', content: '內容 B（vue-grid-layout）' },
    { x: 8, y: 0, w: 4, h: 6, i: '3', title: '卡片 3', content: '內容 C（vue-grid-layout）' },
  ]
}

function defaultGsItems() {
  return [
    { id: '1', x: 0, y: 0, w: 4, h: 3, title: '卡片 1', content: '內容 A（gridstack）' },
    { id: '2', x: 4, y: 0, w: 4, h: 3, title: '卡片 2', content: '內容 B（gridstack）' },
    { id: '3', x: 8, y: 0, w: 4, h: 4, title: '卡片 3', content: '內容 C（gridstack）' },
  ]
}
</script>

<style>
:root {
  --c-bg: #0b1220;
  --c-panel: #0f1a2e;
  --c-card: #ffffff;
  --c-text: #eaf0ff;
  --c-text-dim: rgba(234, 240, 255, 0.7);
  --c-border: rgba(255, 255, 255, 0.12);
  --c-primary: #4caf50;
  --c-danger: #ff4d4f;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  background: radial-gradient(900px 500px at 20% 0%, rgba(76, 175, 80, 0.22), transparent 55%),
    radial-gradient(900px 500px at 70% 20%, rgba(66, 133, 244, 0.22), transparent 55%),
    var(--c-bg);
  color: var(--c-text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
    "Apple Color Emoji", "Segoe UI Emoji";
}
</style>

<style scoped>
.page {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: rgba(15, 26, 46, 0.8);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.toolbar__left,
.toolbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.divider {
  width: 1px;
  height: 28px;
  background: var(--c-border);
}

.seg {
  display: inline-flex;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  overflow: hidden;
}

.seg__btn {
  border: none;
  background: transparent;
  color: var(--c-text-dim);
  padding: 8px 12px;
  cursor: pointer;
}

.seg__btn.is-active {
  background: rgba(234, 240, 255, 0.12);
  color: var(--c-text);
}

.btn {
  border: 1px solid var(--c-border);
  background: rgba(234, 240, 255, 0.06);
  color: var(--c-text);
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: rgba(234, 240, 255, 0.12);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.is-active {
  border-color: rgba(76, 175, 80, 0.6);
  box-shadow: 0 0 0 1px rgba(76, 175, 80, 0.25) inset;
}

.btn--danger {
  border-color: rgba(255, 77, 79, 0.45);
}

.hint {
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(15, 26, 46, 0.7);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}

.hint__title {
  font-weight: 700;
  margin-bottom: 6px;
}

.hint ul {
  margin: 0;
  padding-left: 18px;
  color: var(--c-text-dim);
  line-height: 1.55;
}

.stage {
  margin-top: 16px;
  padding: 14px;
  background: rgba(15, 26, 46, 0.55);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}

.stage__title {
  font-weight: 700;
  margin-bottom: 10px;
}

/* vue-grid-layout tweaks */
:deep(.vue-grid-layout) {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
}

:deep(.vue-grid-item) {
  touch-action: none;
}

/* gridstack tweaks */
.grid-stack {
  min-height: 560px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
}

.grid-stack-item-content {
  height: 100%;
}

/* card */
.card {
  height: 100%;
  background: var(--c-card);
  border-radius: 12px;
  overflow: hidden;
  color: #1c2333;
  border: 1px solid rgba(15, 26, 46, 0.12);
  display: flex;
  flex-direction: column;
}

.card__header {
  padding: 10px 12px;
  background: #f4f6fb;
  border-bottom: 1px solid rgba(15, 26, 46, 0.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.card__title {
  font-weight: 700;
  font-size: 14px;
}

.card__delete {
  border: none;
  background: rgba(255, 77, 79, 0.9);
  color: #fff;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  cursor: pointer;
}

.card__delete:hover {
  background: rgba(255, 77, 79, 1);
}

.card__content {
  padding: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  flex: 1;
  overflow: auto;
}
</style>
