<template>
  <div id="app">
    <h1 style="text-align: center">Vue 网格布局测试</h1>
    
    <!-- 布局信息显示 -->
    <div class="layoutJSON">
      当前布局: <code>[x, y, w, h]</code>:
      <div class="columns">
        <div class="layoutItem" v-for="item in layout" :key="item.i">
          <b>{{ item.i }}</b>: [{{ item.x }}, {{ item.y }}, {{ item.w }}, {{ item.h }}]
          <span v-if="item.isResized" class="resized-tag">已调整大小</span>
        </div>
      </div>
    </div>

    <!-- 测试按钮和事件日志 -->
    <div class="test-controls">
      <button @click="programmaticResize('0')">程序化调整Item 0的大小</button>
    </div>

    <div class="event-log">
      <h3>事件日志:</h3>
      <pre ref="eventLog"></pre>
    </div>

    <!-- 网格布局 -->
    <grid-layout
      ref="gridlayout"
      :layout="layout"
      :col-num="colNum"
      :row-height="rowHeight"
      :is-draggable="draggable"
      :is-resizable="resizable"
      :margin="[parseInt(marginX), parseInt(marginY)]"
      :use-css-transforms="true"
    >
      <grid-item
        v-for="item in layout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        @resize="resize"
        @resized="resized"
        @moved="moved"
      >
        <div class="grid-item-content">
          {{ item.i }}
          <div>Size: {{item.w}} x {{item.h}}</div>
          <div v-if="item.isResized" class="resized-indicator">✓ Resized</div>
        </div>
      </grid-item>
    </grid-layout>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

// 布局配置
const colNum = ref(12)
const rowHeight = ref(30)
const marginX = ref(10)
const marginY = ref(10)
const draggable = ref(true)
const resizable = ref(true)

// 初始布局
const layout = ref([
  { x: 0, y: 0, w: 2, h: 2, i: "0", isResized: false },
  { x: 2, y: 0, w: 2, h: 2, i: "1", isResized: false },
  { x: 4, y: 0, w: 2, h: 2, i: "2", isResized: false }
])

const gridlayout = ref(null)
const eventLog = ref(null)

// 日志函数
const logEvent = (message) => {
  if (eventLog.value) {
    const timestamp = new Date().toLocaleTimeString()
    eventLog.value.innerHTML = `[${timestamp}] ${message}\n` + eventLog.value.innerHTML
  }
}

// 程序化调整大小
const programmaticResize = (itemId) => {
  logEvent(`尝试程序化调整 Item ${itemId} 的大小`)
  const index = layout.value.findIndex(item => item.i === itemId)
  if (index !== -1) {
    const oldW = layout.value[index].w
    const oldH = layout.value[index].h
    
    layout.value[index].w += 1
    layout.value[index].h += 1
    
    logEvent(`程序化调整完成: Item ${itemId} 大小从 ${oldW}x${oldH} 变为 ${layout.value[index].w}x${layout.value[index].h}`)
    
    nextTick(() => {
      if (gridlayout.value) {
        gridlayout.value.layoutUpdate()
      }
    })
  }
}

// resize事件处理器
const resize = (i, newH, newW, newHPx, newWPx) => {
  logEvent(`Resize事件触发: Item ${i}, 调整中的尺寸 ${newW}x${newH}`)
}

// resized事件处理器 - 在这里添加 isResized 属性
const resized = (i, newH, newW, newHPx, newWPx) => {
  logEvent(`Resized事件触发: Item ${i}, 调整后的最终尺寸 ${newW}x${newH}`)
  
  // 找到对应的 item 并添加 isResized 标记
  const index = layout.value.findIndex(item => item.i === i)
  if (index !== -1) {
    layout.value[index] = {
      ...layout.value[index],
      isResized: true  // 添加 isResized 属性
    }
    logEvent(`已标记 Item ${i} 为已调整大小状态`)
  }
}

// moved事件处理器
const moved = (i, newX, newY) => {
  logEvent(`Moved事件触发: Item ${i} 移动到 [${newX}, ${newY}]`)
}

</script>

<style scoped>
.layoutJSON {
  background: #ddd;
  border: 1px solid black;
  margin-top: 10px;
  padding: 10px;
}

.columns {
  -moz-columns: 120px;
  -webkit-columns: 120px;
  columns: 120px;
}

.test-controls {
  margin: 10px 0;
}

.test-controls button {
  margin-right: 10px;
  padding: 5px 10px;
}

.event-log {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border: 1px solid #ddd;
}

.event-log pre {
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.grid-item-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #eee;
}

.resized-tag {
  margin-left: 8px;
  padding: 2px 6px;
  background: #4CAF50;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.resized-indicator {
  margin-top: 4px;
  color: #4CAF50;
  font-weight: bold;
}
</style>
