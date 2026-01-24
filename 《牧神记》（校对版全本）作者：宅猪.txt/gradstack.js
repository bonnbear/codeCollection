<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

// ============ 常量 ============
const LS_KEY = 'gridstack-layout'

// ============ 響應式數據 ============
const gridRef = ref(null)
const gsItems = ref([])
const addCount = ref(1) // 新增：要添加的卡片數量

// ============ GridStack 實例 ============
let grid = null

// 使用獨立的遞增計數器生成 ID
let gsCounter = Date.now()

function generateId() {
  return String(gsCounter++)
}

// ============ 默認佈局 ============
const defaultLayout = [
  { id: '1', x: 0, y: 0, w: 2, h: 2, title: '卡片 1', content: '內容 1' },
  { id: '2', x: 2, y: 0, w: 2, h: 2, title: '卡片 2', content: '內容 2' },
  { id: '3', x: 4, y: 0, w: 2, h: 2, title: '卡片 3', content: '內容 3' },
]

// ============ 工具函數 ============

function safeParseArray(raw) {
  try {
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function destroyGridstackWidgetsOnly() {
  if (grid) {
    grid.removeAll(false)
  }
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

function syncFromGridstack() {
  if (!grid) return

  const nodes = grid.getGridItems()
  nodes.forEach((el) => {
    const node = el.gridstackNode
    if (!node) return

    const item = gsItems.value.find((it) => it.id === node.id)
    if (item) {
      item.x = node.x
      item.y = node.y
      item.w = node.w
      item.h = node.h
    }
  })
}

async function reloadLayoutWithData(data) {
  destroyGridstackWidgetsOnly()

  gsItems.value = []
  await nextTick()

  gsItems.value = data.map((it) => ({
    id: String(it.id),
    x: it.x,
    y: it.y,
    w: it.w,
    h: it.h,
    title: it.title ?? `卡片 ${it.id}`,
    content: it.content ?? '',
  }))

  updateCounterFromItems()
  await nextTick()
  batchMakeWidgets()
}

function updateCounterFromItems() {
  const nums = gsItems.value
    .map((it) => parseInt(it.id, 10))
    .filter((n) => !isNaN(n))

  if (nums.length > 0) {
    const maxId = Math.max(...nums)
    if (gsCounter <= maxId) {
      gsCounter = maxId + 1
    }
  }
}

// ============ 操作函數 ============

// 修改：支持添加多個卡片
async function addItems(count = 1) {
  const validCount = Math.max(1, Math.min(count, 20)) // 限制 1-20 個
  const newItems = []

  // 創建所有新卡片數據
  for (let i = 0; i < validCount; i++) {
    const id = generateId()
    newItems.push({
      id,
      w: 2,
      h: 2,
      title: `卡片 ${id}`,
      content: '',
    })
  }

  // 批量添加到響應式數組
  gsItems.value.push(...newItems)
  await nextTick()

  // 批量註冊 GridStack widgets
  if (grid && gridRef.value) {
    grid.batchUpdate()

    newItems.forEach((newItem) => {
      const el = gridRef.value.querySelector(`[gs-id="${newItem.id}"]`)
      if (el) {
        grid.makeWidget(el)

        const node = el.gridstackNode
        if (node) {
          newItem.x = node.x
          newItem.y = node.y
          newItem.w = node.w
          newItem.h = node.h
        }
      }
    })

    grid.batchUpdate(false)
  }
}

// 添加單個卡片（保留原有功能）
async function addItem() {
  await addItems(1)
}

// 添加多個卡片
async function addMultipleItems() {
  await addItems(addCount.value)
}

function removeItem(id) {
  const idx = gsItems.value.findIndex((it) => it.id === id)
  if (idx === -1) return

  const el = gridRef.value?.querySelector(`[gs-id="${id}"]`)

  if (el && grid) {
    grid.removeWidget(el, false)
  }

  gsItems.value.splice(idx, 1)

  nextTick(() => {
    syncFromGridstack()
  })
}

// 新增：清空所有卡片
async function clearAllItems() {
  if (gsItems.value.length === 0) return

  if (!confirm(`確定要刪除所有 ${gsItems.value.length} 張卡片嗎？`)) return

  if (grid) {
    grid.removeAll(false)
  }

  gsItems.value = []
}

function saveLayout() {
  syncFromGridstack()

  const data = gsItems.value.map((it) => ({
    id: it.id,
    x: it.x,
    y: it.y,
    w: it.w,
    h: it.h,
    title: it.title,
    content: it.content,
  }))

  localStorage.setItem(LS_KEY, JSON.stringify(data))
  alert('已保存 GridStack 佈局')
}

async function loadLayout() {
  const raw = localStorage.getItem(LS_KEY)
  const data = safeParseArray(raw)

  if (!data.length) {
    alert('找不到已保存的 GridStack 佈局')
    return
  }

  await reloadLayoutWithData(data)
  alert('已載入 GridStack 佈局')
}

async function resetToDefault() {
  await reloadLayoutWithData(defaultLayout)
  alert('已重置為默認佈局')
}

// ============ 生命週期 ============

onMounted(async () => {
  gsItems.value = defaultLayout.map((it) => ({ ...it }))
  updateCounterFromItems()

  await nextTick()

  grid = GridStack.init(
    {
      column: 12,
      cellHeight: 60,
      margin: 8,
          marginTop: 8,

      float: false,
      disableOneColumnMode: true,
    },
    gridRef.value
  )

  batchMakeWidgets()

  grid.on('change', (event, items) => {
    if (!items) return

    items.forEach((node) => {
      const item = gsItems.value.find((it) => it.id === node.id)
      if (item) {
        item.x = node.x
        item.y = node.y
        item.w = node.w
        item.h = node.h
      }
    })
  })
})

onBeforeUnmount(() => {
  if (grid) {
    grid.off('change')
    grid.destroy(false)
    grid = null
  }
})
</script>

<template>
  <div class="gridstack-demo">
    <div class="toolbar">
      <!-- 單個添加 -->
      <button class="btn btn-primary" @click="addItem">
        <span class="icon">+</span> 添加卡片
      </button>

      <!-- 批量添加 -->
      <div class="batch-add">
        <input
          v-model.number="addCount"
          type="number"
          min="1"
          max="20"
          class="count-input"
          placeholder="數量"
        />
        <button class="btn btn-primary-alt" @click="addMultipleItems">
          <span class="icon">++</span> 批量添加
        </button>
      </div>

      <!-- 快速添加按鈕 -->
      <div class="quick-add">
        <button class="btn btn-quick" @click="addItems(3)">+3</button>
        <button class="btn btn-quick" @click="addItems(5)">+5</button>
        <button class="btn btn-quick" @click="addItems(10)">+10</button>
      </div>

      <div class="divider"></div>

      <button class="btn btn-success" @click="saveLayout">
        <span class="icon">💾</span> 保存佈局
      </button>
      <button class="btn btn-info" @click="loadLayout">
        <span class="icon">📂</span> 載入佈局
      </button>
      <button class="btn btn-warning" @click="resetToDefault">
        <span class="icon">🔄</span> 重置默認
      </button>
      <button class="btn btn-danger" @click="clearAllItems">
        <span class="icon">🗑️</span> 清空全部
      </button>
    </div>

    <!-- 統計信息 -->
    <div class="stats">
      當前卡片數量: <strong>{{ gsItems.length }}</strong>
    </div>

    <div ref="gridRef" class="grid-stack">
      <div
        v-for="item in gsItems"
        :key="item.id"
        class="grid-stack-item"
        :gs-id="item.id"
        :gs-x="item.x"
        :gs-y="item.y"
        :gs-w="item.w"
        :gs-h="item.h"
      >
        <div class="grid-stack-item-content">
          <div class="card-header">
            <span class="card-title">{{ item.title }}</span>
            <button
              class="close-btn"
              @click.stop="removeItem(item.id)"
              title="刪除卡片"
            >
              ×
            </button>
          </div>
          <div class="card-body">
            <p v-if="item.content">{{ item.content }}</p>
            <p v-else class="placeholder">拖曳調整位置和大小</p>
          </div>
          <div class="card-footer">
            <small>
              ID: {{ item.id }} |
              位置: ({{ item.x ?? '-' }}, {{ item.y ?? '-' }}) |
              大小: {{ item.w }}×{{ item.h }}
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gridstack-demo {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.batch-add {
  display: flex;
  align-items: center;
  gap: 6px;
}

.count-input {
  width: 60px;
  padding: 10px 8px;
  border: 2px solid #667eea;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  outline: none;
}

.count-input:focus {
  border-color: #764ba2;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.quick-add {
  display: flex;
  gap: 4px;
}

.btn-quick {
  padding: 10px 14px;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #333;
  font-weight: 600;
}

.divider {
  width: 1px;
  height: 36px;
  background: #ddd;
  margin: 0 5px;
}

.stats {
  margin-bottom: 15px;
  padding: 10px 15px;
  background: #f0f4f8;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
}

.stats strong {
  color: #667eea;
  font-size: 18px;
}

.btn {
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary-alt {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-info {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.btn-warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
  color: white;
}

.icon {
  font-size: 16px;
}

.grid-stack {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  min-height: 500px;
  border-radius: 12px;
  padding: 10px;
}

.grid-stack-item-content {
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 100, 100, 0.9);
}

.card-body {
  flex: 1;
  padding: 15px;
  color: #333;
  overflow: auto;
}

.card-body p {
  margin: 0;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.card-footer {
  padding: 8px 15px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
  color: #888;
  font-size: 11px;
}
.grid-stack {
  /* 網格背景 */
  background-color: #f5f7fa;
  background-image: 
    /* 垂直線 */
    linear-gradient(to right, rgba(102, 126, 234, 0.15) 1px, transparent 1px),
    /* 水平線 */
    linear-gradient(to bottom, rgba(102, 126, 234, 0.15) 1px, transparent 1px);
  
  /* 
   * 計算方式：
   * 水平：100% / 12 = 8.333...% (每欄寬度百分比)
   * 垂直：cellHeight + margin = 60 + 16 = 76px
   */
  background-size: calc(100% / 12) 60px;
  
  /* 偏移以對齊實際網格位置 */
  background-position: -1px -1px;
  
  min-height: 500px;
  border-radius: 12px;
  padding: 10px;
}
</style>
