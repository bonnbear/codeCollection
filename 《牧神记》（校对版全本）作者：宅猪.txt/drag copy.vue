我来展示如何在这个表格组件中使用多个插槽，包括表头、单元格内容、操作列等。以下是修改后的代码：

1. 首先是表格组件 (DraggableTable.vue):

```vue
<template>
  <div class="container">
    <slot name="title">
      <h2 class="table-title">可拖拽表格</h2>
    </slot>
    
    <div class="table-container">
      <!-- Loading 状态展示 -->
      <div v-if="loading" class="loading-container">
        <slot name="loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
          加载中...
        </slot>
      </div>
      
      <template v-else>
        <!-- 表格主体 -->
        <div class="table">
          <!-- 表头 -->
          <div class="table-header">
            <div class="table-cell cell-seq">
              <slot name="header-seq">序号</slot>
            </div>
            <div class="table-cell cell-name">
              <slot name="header-name">项目名称</slot>
            </div>
            <div class="table-cell cell-status">
              <slot name="header-status">显示状态</slot>
            </div>
            <div class="table-cell cell-action">
              <slot name="header-action">操作</slot>
            </div>
          </div>

          <!-- 固定的第一行 -->
          <div class="table-row first-row">
            <div class="table-cell cell-seq">1</div>
            <div class="table-cell cell-name">
              <slot name="first-row-name" :item="items[0]">
                <div class="flex items-center gap-2">
                  <span class="lock-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="#999"/>
                    </svg>
                  </span>
                  <span>{{ items[0]?.text }}</span>
                </div>
              </slot>
            </div>
            <div class="table-cell cell-status">
              <slot name="first-row-status" :item="items[0]">
                <el-switch
                  v-model="items[0].visible"
                  :active-text="items[0].visible ? '显示' : '隐藏'"
                  inline-prompt
                />
              </slot>
            </div>
            <div class="table-cell cell-action">
              <slot name="first-row-action" :item="items[0]">-</slot>
            </div>
          </div>

          <!-- 可拖拽表格区域 -->
          <div ref="listRef" class="table-body">
            <div v-for="(item, index) in draggableItems" 
                 :key="item.id" 
                 class="table-row"
                 :style="{ 
                   backgroundColor: item.color,
                   opacity: item.visible ? 1 : 0.5 
                 }">
              <div class="table-cell cell-seq">
                <slot name="row-seq" :index="index" :item="item">
                  {{ index + 2 }}
                </slot>
              </div>
              <div class="table-cell cell-name">
                <slot name="row-name" :item="item">
                  <div class="flex items-center gap-2">
                    <span class="drag-handle">
                      <svg viewBox="0 0 20 20" width="12" height="12">
                        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" fill="#999"></path>
                      </svg>
                    </span>
                    <span>{{ item.text }}</span>
                  </div>
                </slot>
              </div>
              <div class="table-cell cell-status">
                <slot name="row-status" :item="item">
                  <el-switch
                    v-model="item.visible"
                    :active-text="item.visible ? '显示' : '隐藏'"
                    inline-prompt
                  />
                </slot>
              </div>
              <div class="table-cell cell-action">
                <slot name="row-action" :item="item">
                  <button class="delete-btn" @click="deleteItem(item.id)">删除</button>
                </slot>
              </div>
            </div>
          </div>
        </div>

        <!-- 添加新项目的控制区 -->
        <slot name="controls">
          <div class="controls">
            <input v-model="newItemText" 
                   placeholder="输入新项目"
                   @keyup.enter="addItem"
                   class="input">
            <button class="add-btn" @click="addItem">添加</button>
          </div>
        </slot>

        <!-- 保存按钮区域 -->
        <slot name="footer">
          <div class="save-container">
            <el-button 
              type="primary" 
              :loading="saving"
              @click="saveChanges"
            >
              保存更改
            </el-button>
          </div>
        </slot>
      </template>
    </div>
  </div>
</template>
```

2. 父组件使用示例:

```vue
<template>
  <DraggableTable>
    <!-- 自定义标题 -->
    <template #title>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">自定义表格标题</h2>
        <el-button type="primary" @click="handleExport">导出数据</el-button>
      </div>
    </template>

    <!-- 自定义表头 -->
    <template #header-name>
      <div class="flex items-center gap-2">
        <icon-list-ordered class="w-4 h-4" />
        <span>项目列表</span>
      </div>
    </template>

    <!-- 自定义第一行名称列 -->
    <template #first-row-name="{ item }">
      <div class="flex items-center gap-2 text-primary-600">
        <icon-lock class="w-4 h-4" />
        <span class="font-medium">{{ item.text }}</span>
      </div>
    </template>

    <!-- 自定义普通行名称列 -->
    <template #row-name="{ item }">
      <div class="flex items-center gap-2">
        <span class="drag-handle">
          <icon-grip-vertical class="w-4 h-4" />
        </span>
        <span>{{ item.text }}</span>
        <el-tag v-if="item.isNew" size="small" type="success">新</el-tag>
      </div>
    </template>

    <!-- 自定义操作列 -->
    <template #row-action="{ item }">
      <div class="flex items-center gap-2">
        <el-button 
          size="small" 
          @click="handleEdit(item)"
        >
          编辑
        </el-button>
        <el-popconfirm
          title="确认删除该项目?"
          @confirm="handleDelete(item.id)"
        >
          <template #reference>
            <el-button 
              size="small"
              type="danger"
            >
              删除
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </template>

    <!-- 自定义底部控制区 -->
    <template #controls>
      <div class="p-4 border-t">
        <el-form inline>
          <el-form-item label="项目名称">
            <el-input v-model="newItem.name" placeholder="请输入" />
          </el-form-item>
          <el-form-item label="项目类型">
            <el-select v-model="newItem.type" placeholder="请选择">
              <el-option label="类型1" value="1" />
              <el-option label="类型2" value="2" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleAdd">添加项目</el-button>
          </el-form-item>
        </el-form>
      </div>
    </template>

    <!-- 自定义底部 -->
    <template #footer>
      <div class="flex justify-between items-center p-4 border-t">
        <div class="text-sm text-gray-500">
          共 {{ totalItems }} 个项目
        </div>
        <div class="flex gap-2">
          <el-button @click="handleReset">重置</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </div>
      </div>
    </template>
  </DraggableTable>
</template>

<script setup>
import { ref } from 'vue'
import { IconListOrdered, IconLock, IconGripVertical } from '@iconify/vue'

const newItem = ref({
  name: '',
  type: ''
})
const totalItems = ref(0)

const handleExport = () => {
  // 导出逻辑
}

const handleEdit = (item) => {
  // 编辑逻辑
}

const handleDelete = (id) => {
  // 删除逻辑
}

const handleAdd = () => {
  // 添加逻辑
}

const handleReset = () => {
  // 重置逻辑
}

const handleSave = () => {
  // 保存逻辑
}
</script>
```

这样修改后:

1. 提供了多个具名插槽:
   - title: 标题区域
   - loading: 加载状态
   - header-xxx: 各列表头
   - first-row-xxx: 第一行各列
   - row-xxx: 普通行各列
   - controls: 控制区域
   - footer: 底部区域

2. 每个插槽都提供了相关的数据:
   - item: 当前行数据
   - index: 当前行索引

3. 所有插槽都有默认内容，父组件可以选择性覆盖

4. 父组件可以:
   - 完全自定义每个区域的内容和样式
   - 使用更复杂的交互组件
   - 添加额外的功能按钮和控件
   - 根据业务需求调整布局

5. 保持了原有的功能，同时提供了更大的灵活性

这种设计让组件变得更加灵活和可复用，能够适应各种不同的业务场景。