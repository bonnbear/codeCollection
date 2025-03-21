<template>
  <div class="container">
    <h2 class="table-title">可拖拽表格</h2>
    <div class="table-container">
      <!-- Loading 状态展示 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="loading-icon"><Loading /></el-icon>
        加载中...
      </div>
      
      <template v-else>
        <!-- 表格主体 -->
        <div class="table">
          <!-- 表头 -->
          <div class="table-header">
            <div class="table-cell cell-seq">序号</div>
            <div class="table-cell cell-name">项目名称</div>
            <div class="table-cell cell-status">显示状态</div>
            <div class="table-cell cell-action">操作</div>
          </div>

          <!-- 固定项目（不可拖动）-->
          <template v-for="(item, index) in fixedItems" :key="item.id">
            <div class="table-row first-row">
              <div class="table-cell cell-seq">{{ index + 1 }}</div>
              <div class="table-cell cell-name">
                <div class="flex items-center gap-2">
                  <span class="lock-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="#999"/>
                    </svg>
                  </span>
                  <span>{{ item.text }}</span>
                </div>
              </div>
              <div class="table-cell cell-status">
                <el-switch
                  v-model="item.visible"
                  :active-text="item.visible ? '显示' : '隐藏'"
                  inline-prompt
                />
              </div>
              <div class="table-cell cell-action">-</div>
            </div>
          </template>

          <!-- 可拖拽表格区域 -->
          <div ref="listRef" class="table-body">
            <div v-for="(item, index) in draggableItems" 
                 :key="item.id" 
                 class="table-row"
                 :style="{ 
                   backgroundColor: item.color,
                   opacity: item.visible ? 1 : 0.5 
                 }">
              <div class="table-cell cell-seq">{{ index + fixedItems.length + 1 }}</div>
              <div class="table-cell cell-name">
                <div class="flex items-center gap-2">
                  <span class="drag-handle">
                    <svg viewBox="0 0 20 20" width="12" height="12">
                      <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" fill="#999"></path>
                    </svg>
                  </span>
                  <span>{{ item.text }}</span>
                </div>
              </div>
              <div class="table-cell cell-status">
                <el-switch
                  v-model="item.visible"
                  :active-text="item.visible ? '显示' : '隐藏'"
                  inline-prompt
                />
              </div>
              <div class="table-cell cell-action">
                <button class="delete-btn" @click="deleteItem(item.id)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 添加新项目的控制区 -->
        <div class="controls">
          <input v-model="newItemText" 
                 placeholder="输入新项目"
                 @keyup.enter="addItem"
                 class="input">
          <button class="add-btn" @click="addItem">添加</button>
        </div>

        <!-- 保存按钮区域 -->
        <div class="save-container">
          <el-button 
            type="primary" 
            :loading="saving"
            @click="saveChanges"
          >
            保存更改
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import Sortable from 'sortablejs'
import { ElSwitch, ElButton, ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'

// 定义响应式变量
const listRef = ref(null)
const newItemText = ref('')
const loading = ref(true)
const saving = ref(false)
const items = ref([])

// 计算属性：获取固定项目
const fixedItems = computed(() => {
  return items.value.filter(item => item.fixed)
})

// 计算属性：获取可拖拽项目
const draggableItems = computed(() => {
  return items.value.filter(item => !item.fixed)
})

// 模拟后端 API 接口
const mockApi = {
  // 获取列表数据
  getItems: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 1, text: '固定项目1', color: '#fff', visible: true, fixed: true },
          { id: 2, text: '固定项目2', color: '#fff', visible: true, fixed: true },
          { id: 3, text: '固定项目3', color: '#fff', visible: true, fixed: true },
          { id: 4, text: '项目4', color: '#fff', visible: true, fixed: false },
          { id: 5, text: '项目5', color: '#fff', visible: true, fixed: false },
          { id: 6, text: '项目6', color: '#fff', visible: true, fixed: false }
        ])
      }, 1000)
    })
  },
  
  saveItems: (data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('保存的数据:', data)
        resolve({ success: true })
      }, 1500)
    })
  },
  
  deleteItem: (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('删除项目ID:', id)
        resolve({ success: true })
      }, 500)
    })
  },
  
  addItem: (item) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newItem = { ...item, id: Date.now() }
        console.log('新增项目:', newItem)
        resolve(newItem)
      }, 500)
    })
  }
}

// 获取初始数据
const fetchItems = async () => {
  try {
    loading.value = true
    const data = await mockApi.getItems()
    items.value = data
  } catch (error) {
    ElMessage.error('加载数据失败')
    console.error('获取数据错误:', error)
  } finally {
    loading.value = false
  }
}

// 保存更改
const saveChanges = async () => {
  try {
    saving.value = true
    await mockApi.saveItems(items.value)
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
    console.error('保存错误:', error)
  } finally {
    saving.value = false
  }
}

// 添加新项目
const addItem = async () => {
  if (!newItemText.value.trim()) return
  
  try {
    const newItem = {
      text: newItemText.value,
      color: '#fff',
      visible: true,
      fixed: false
    }
    
    const savedItem = await mockApi.addItem(newItem)
    items.value.push(savedItem)
    newItemText.value = ''
    ElMessage.success('添加成功')
  } catch (error) {
    ElMessage.error('添加失败')
    console.error('添加错误:', error)
  }
}

// 删除项目
const deleteItem = async (id) => {
  try {
    const item = items.value.find(item => item.id === id)
    if (!item || item.fixed) {
      ElMessage.warning('固定项目不能删除')
      return
    }
    
    await mockApi.deleteItem(id)
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  } catch (error) {
    ElMessage.error('删除失败')
    console.error('删除错误:', error)
  }
}

// 初始化拖拽功能
const initializeSortable = () => {
  new Sortable(listRef.value, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'ghost',
    
    onStart: (evt) => {
      const item = draggableItems.value[evt.oldIndex]
      item.color = '#f0f0f0'
    },
    
    onEnd: (evt) => {
      const oldIndex = evt.oldIndex
      const newIndex = evt.newIndex
      
      const draggableItemsCopy = [...draggableItems.value]
      const itemMove = draggableItemsCopy.splice(oldIndex, 1)[0]
      draggableItemsCopy.splice(newIndex, 0, itemMove)
      itemMove.color = '#fff'
      
      // 更新原始数组
      items.value = [
        ...fixedItems.value,
        ...draggableItemsCopy
      ]
    }
  })
}

// 组件挂载时初始化
onMounted(async () => {
  await fetchItems()
  initializeSortable()
})
</script>
<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.table-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #303133;
}

.table-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 200px;
  color: #909399;
}

.loading-icon {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 表格基础样式 */
.table {
  width: 100%;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

/* 行样式 */
.table-header,
.table-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #ebeef5;
  min-height: 48px;
}

/* 表头样式 */
.table-header {
  background-color: #f5f7fa;
  font-weight: 500;
  color: #606266;
}

.table-header .table-cell {
  justify-content: center;
}

/* 单元格基础样式 */
.table-cell {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-right: 1px solid #ebeef5;
}

.table-cell:last-child {
  border-right: none;
}

/* 各列宽度定义 */
.cell-seq {
  width: 80px;
  justify-content: center;
  flex-shrink: 0;
}

.cell-name {
  flex: 1;
  min-width: 200px;
}

.cell-status {
  width: 120px;
  justify-content: center;
  flex-shrink: 0;
}

.cell-action {
  width: 100px;
  justify-content: center;
  flex-shrink: 0;
}

/* 首行样式 */
.first-row {
  background-color: #fafafa;
}

/* 拖动手柄样式 */
.drag-handle {
  display: inline-flex;
  align-items: center;
  padding: 4px;
  margin-right: 8px;
  cursor: move;
}

.drag-handle:hover {
  background-color: #f0f0f0;
  border-radius: 4px;
}

/* 锁定图标样式 */
.lock-icon {
  display: inline-flex;
  align-items: center;
  padding: 4px;
  margin-right: 8px;
}

/* 删除按钮样式 */
.delete-btn {
  padding: 4px 12px;
  border: 1px solid #ff4444;
  border-radius: 4px;
  color: #ff4444;
  font-size: 12px;
  background: none;
  cursor: pointer;
  transition: all 0.3s;
}

.delete-btn:hover {
  background-color: #ff4444;
  color: white;
}

/* 控制区域样式 */
.controls {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid #ebeef5;
}

.input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.input:focus {
  border-color: #409eff;
  outline: none;
}

.add-btn {
  padding: 8px 16px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-btn:hover {
  background-color: #66b1ff;
}

/* 保存按钮容器样式 */
.save-container {
  display: flex;
  justify-content: center;
  padding: 16px;
  border-top: 1px solid #ebeef5;
}

/* 拖动时的幽灵样式 */
.ghost {
  opacity: 0.5;
  background: #c8ebfb !important;
}

/* Switch 组件样式调整 */
:deep(.el-switch) {
  margin: 0 auto;
}

/* 表格主体区域 */
.table-body {
  border-bottom: 1px solid #ebeef5;
}

/* 最后一行不需要底部边框 */
.table-row:last-child {
  border-bottom: none;
}

/* 响应式适配 */
@media (max-width: 640px) {
  .container {
    padding: 10px;
  }

  .cell-status {
    display: none;
  }
  
  .cell-action {
    width: 80px;
  }
  
  .cell-seq {
    width: 60px;
  }
  
  .table-cell {
    padding: 8px;
    font-size: 14px;
  }
  
  .controls {
    flex-direction: column;
  }
  
  .add-btn {
    width: 100%;
  }
}
</style>
