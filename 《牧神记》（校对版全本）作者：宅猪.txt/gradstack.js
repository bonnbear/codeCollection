<template>
  <div class="page">
    <header class="toolbar">
      <div class="toolbar__left">
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
        <li>支援：新增/刪除 item、保存/載入、瀏覽/編輯切換、卡片內容、v-for 渲染。</li>
        <li>「保存/載入到後端」此 demo 以 localStorage 模擬；你可以把 save/load 函數內的序列化資料改成 axios/fetch 對接真正 API。</li>
        <li>新增卡片會提供 w/h，並交給引擎做 auto placement（不手算 x/y）。</li>
      </ul>
    </section>

    <section class="stage">
      <div class="stage__title">gridstack.js</div>

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
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

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

const isEditMode = ref(false)
const LS_KEY = 'demo-layout-gridstack'

const presets = {
  sm: { w: 3, h: 3 },
  md: { w: 4, h: 4 },
  lg: { w: 6, h: 4 },
}

const gsItems = ref(defaultGsItems())
let gsCounter = nextCounterFromGs(gsItems.value)

const gridRef = ref(null)
let grid = null

function toggleEditMode() {
  isEditMode.value = !isEditMode.value
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

  nextTick(() => {
    if (!grid || !gridRef.value) return
    const el = gridRef.value.querySelector(`[gs-id="${id}"]`)
    if (!el) return

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
  const idx = gsItems.value.findIndex((x) => x.id === id)
  if (idx < 0) return

  if (grid && gridRef.value) {
    const el = gridRef.value.querySelector(`[gs-id="${id}"]`)
    if (el) grid.removeWidget(el, false)
  }

  gsItems.value.splice(idx, 1)
}

function saveLayout() {
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

  localStorage.setItem(LS_KEY, JSON.stringify(payload))
  alert('已保存 gridstack 佈局到 localStorage')
}

async function loadLayout() {
  const raw = localStorage.getItem(LS_KEY)
  const data = safeParseArray(raw)
  if (!data.length) {
    alert('找不到已保存的 gridstack 佈局')
    return
  }

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

  ensureGridstackMounted()
  batchMakeWidgets()

  alert('已載入 gridstack 佈局')
}

function resetToDefault() {
  destroyGridstackWidgetsOnly()
  gsItems.value = defaultGsItems()
  gsCounter = nextCounterFromGs(gsItems.value)

  nextTick(() => {
    ensureGridstackMounted()
    batchMakeWidgets()
  })
}

onMounted(() => {
  nextTick(() => {
    ensureGridstackMounted()
    batchMakeWidgets()
  })
})

onBeforeUnmount(() => {
  if (grid) {
    grid.destroy(false)
    grid = null
  }
})

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
    grid.makeWidget(el)
  })

  grid.batchUpdate(false)
}

function destroyGridstackWidgetsOnly() {
  if (grid) {
    grid.removeAll(false)
  }
}

function getGridstackNodeById(id) {
  if (!gridRef.value) return null
  const el = gridRef.value.querySelector(`[gs-id="${id}"]`)
  return el?.gridstackNode ?? null
}

function safeParseArray(raw) {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function nextCounterFromGs(items) {
  const nums = items
    .map((x) => parseInt(String(x.id), 10))
    .filter((n) => Number.isFinite(n))
  return (nums.length ? Math.max(...nums) : 0) + 1
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
  --c-bg: #ffffff;
  --c-panel: #f8f9fa;
  --c-card: #ffffff;
  --c-text: #1c2333;
  --c-text-dim: rgba(28, 35, 51, 0.7);
  --c-border: rgba(0, 0, 0, 0.12);
  --c-primary: #4caf50;
  --c-danger: #ff4d4f;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  background: var(--c-bg);
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
  background: var(--c-panel);
  border: 1px solid var(--c-border);
  border-radius: 12px;
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

.btn {
  border: 1px solid var(--c-border);
  background: #ffffff;
  color: var(--c-text);
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.is-active {
  border-color: rgba(76, 175, 80, 0.6);
  background: rgba(76, 175, 80, 0.1);
  box-shadow: 0 0 0 1px rgba(76, 175, 80, 0.25) inset;
}

.btn--danger {
  border-color: rgba(255, 77, 79, 0.45);
  color: var(--c-danger);
}

.hint {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--c-panel);
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
  background: var(--c-panel);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}

.stage__title {
  font-weight: 700;
  margin-bottom: 10px;
}

.grid-stack {
  min-height: 560px;
  background: #f0f2f5;
  border-radius: 12px;
}

.grid-stack-item-content {
  height: 100%;
}

.card {
  height: 100%;
  background: var(--c-card);
  border-radius: 12px;
  overflow: hidden;
  color: #1c2333;
  border: 1px solid var(--c-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.card__header {
  padding: 10px 12px;
  background: #f4f6fb;
  border-bottom: 1px solid var(--c-border);
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
