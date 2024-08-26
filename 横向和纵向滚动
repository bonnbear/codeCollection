<template>
  <div class="calendar-container" ref="calendarContainer">
    <div class="fixed-header" :style="fixedHeaderStyle">
      <div class="fixed-corner">事项类别</div>
      <div class="header-row">
        <div v-for="(month, index) in monthNames" :key="index" class="month-column">
          {{ month }}
        </div>
      </div>
    </div>
    <div class="fixed-left" :style="fixedLeftStyle">
      <div v-for="category in categories" :key="category.key" class="category-cell">
        {{ category.name }}
      </div>
    </div>
    <div class="scrollable-content" @scroll="handleScroll" ref="scrollableContent">
      <div class="content-wrapper">
        <div class="header-row placeholder-header">
          <div v-for="(month, index) in monthNames" :key="index" class="month-column">
            {{ month }}
          </div>
        </div>
        <div class="body-content">
          <div v-for="category in categories" :key="category.key" class="row">
            <div class="category-cell placeholder-category">{{ category.name }}</div>
            <div v-for="monthIndex in 12" :key="monthIndex - 1" class="month-column">
              <div v-for="item in processedData[category.key][monthIndex - 1]" :key="item.id" class="item-card">
                <el-popover placement="top-start" :width="250" trigger="hover">
                  <template #default>
                    <div v-if="category.key === 'employees'">
                      <div v-for="field in employeeFields" :key="field.key">
                        <strong>{{ field.label }}:</strong> {{ field.value(item) }}
                      </div>
                    </div>
                    <div v-else-if="category.key === 'projects'">
                      <div v-for="field in projectFields" :key="field.key">
                        <strong>{{ field.label }}:</strong> {{ field.value(item) }}
                      </div>
                    </div>
                    <div v-else-if="category.key === 'tasks'">
                      <div v-for="field in taskFields" :key="field.key">
                        <strong>{{ field.label }}:</strong> {{ field.value(item) }}
                      </div>
                    </div>
                  </template>
                  <template #reference>
                    <div class="item-title">{{ item.displayTitle }}</div>
                  </template>
                </el-popover>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { ElPopover } from 'element-plus'
import 'element-plus/dist/index.css'

export default {
  name: 'IntegratedCalendarGrid',
  components: { ElPopover },
  setup() {
    const dataObj = ref({
      employees: [
        { id: 1, name: 'John Doe', position: 'Manager', salary: 80000, date: '2023-06-15' },
        { id: 2, name: 'Jane Smith', position: 'Developer', salary: 75000, date: '2023-07-01' },
        { id: 3, name: 'Mike Johnson', position: 'Designer', salary: 60000, date: '2023-08-10' }
      ],
      projects: [
        { id: 1, name: 'Project A', status: 'In Progress', budget: 100000, date: '2023-06-20' },
        { id: 2, name: 'Project B', status: 'Completed', budget: 150000, date: '2023-07-15' },
        { id: 3, name: 'Project C', status: 'Planning', budget: 200000, date: '2023-08-05' }
      ],
      tasks: [
        { id: 1, title: 'Task 1', assignee: 'John Doe', dueDate: '2023-06-30' },
        { id: 2, title: 'Task 2', assignee: 'Jane Smith', dueDate: '2023-07-15' },
        { id: 3, title: 'Task 3', assignee: 'Mike Johnson', dueDate: '2023-08-01' },
        { id: 4, title: 'Task 4', assignee: 'John Doe', dueDate: '2023-07-10' }
      ]
    })

    const monthNames = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ]

    const categories = [
      { key: 'employees', name: '员工' },
      { key: 'projects', name: '项目' },
      { key: 'tasks', name: '任务' }
    ]

    const employeeFields = [
      { key: 'name', label: '姓名', value: item => item.name },
      { key: 'position', label: '职位', value: item => item.position },
      { key: 'salary', label: '薪资', value: item => `$${item.salary}` },
      { key: 'date', label: '入职日期', value: item => item.date }
    ]

    const projectFields = [
      { key: 'name', label: '项目名称', value: item => item.name },
      { key: 'status', label: '状态', value: item => item.status },
      { key: 'budget', label: '预算', value: item => `$${item.budget}` },
      { key: 'date', label: '开始日期', value: item => item.date }
    ]

    const taskFields = [
      { key: 'title', label: '任务', value: item => item.title },
      { key: 'assignee', label: '负责人', value: item => item.assignee },
      { key: 'dueDate', label: '截止日期', value: item => item.dueDate }
    ]

    const processedData = ref({})

    const processData = () => {
      const result = {}
      categories.forEach(category => {
        result[category.key] = Array(12).fill().map(() => [])
      })

      Object.entries(dataObj.value).forEach(([key, items]) => {
        items.forEach(item => {
          const date = new Date(key === 'tasks' ? item.dueDate : item.date)
          const monthIndex = date.getMonth()
          const displayTitle = item.name || item.title || `ID: ${item.id}`
          result[key][monthIndex].push({ ...item, displayTitle })
        })
      })

      processedData.value = result
    }

    watch(dataObj, processData, { immediate: true, deep: true })

    const calendarContainer = ref(null)
    const scrollableContent = ref(null)
    const scrollTop = ref(0)
    const scrollLeft = ref(0)
    const headerHeight = ref(0)
    const leftWidth = ref(0)

    const fixedHeaderStyle = computed(() => ({
      transform: `translateX(-${scrollLeft.value}px)`,
      height: `${headerHeight.value}px`
    }))

    const fixedLeftStyle = computed(() => ({
      transform: `translateY(-${scrollTop.value}px)`,
      width: `${leftWidth.value}px`,
      top: `${headerHeight.value}px`
    }))

    const handleScroll = () => {
      if (scrollableContent.value) {
        const { scrollLeft: newScrollLeft, scrollTop: newScrollTop } = scrollableContent.value
        scrollLeft.value = newScrollLeft
        scrollTop.value = newScrollTop
      }
    }

    const updateDimensions = () => {
      if (calendarContainer.value) {
        const headerElement = calendarContainer.value.querySelector('.placeholder-header')
        const categoryElement = calendarContainer.value.querySelector('.placeholder-category')
        if (headerElement) {
          headerHeight.value = headerElement.offsetHeight
        }
        if (categoryElement) {
          leftWidth.value = categoryElement.offsetWidth
        }
      }
    }

    onMounted(() => {
      nextTick(() => {
        updateDimensions()
        window.addEventListener('resize', updateDimensions)
      })
    })

    return {
      monthNames,
      categories,
      employeeFields,
      projectFields,
      taskFields,
      processedData,
      calendarContainer,
      scrollableContent,
      fixedHeaderStyle,
      fixedLeftStyle,
      handleScroll
    }
  }
}
</script>

<style scoped>
.calendar-container {
  position: relative;
  width: 100%;
  height: 600px;
  font-family: Arial, sans-serif;
  border: 1px solid #ddd;
  overflow: hidden;
}

.fixed-header, .fixed-left {
  position: absolute;
  background-color: #ffffff;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.fixed-header {
  top: 0;
  left: 0;
  display: flex;
}

.fixed-left {
  left: 0;
}

.fixed-corner {
  width: 120px;
  height: 40px;
  background-color: #f5f7fa;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
}

.scrollable-content {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.content-wrapper {
  display: inline-block;
  min-width: max-content;
}

.header-row, .row {
  display: flex;
}

.header-row {
  background-color: #f5f7fa;
  font-weight: bold;
}

.category-cell, .month-column {
  flex-shrink: 0;
  border-right: 1px solid #eaeaea;
  border-bottom: 1px solid #eaeaea;
}

.category-cell {
  width: 120px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  background-color: #f5f7fa;
}

.month-column {
  width: 200px;
  padding: 10px;
  text-align: center;
}

.header-row .month-column {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-header, .placeholder-category {
  visibility: hidden;
}

.item-card {
  margin: 5px 0;
  padding: 5px;
  background-color: #e6f7ff;
  border-radius: 4px;
  font-size: 12px;
}

.item-title {
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scrollable-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollable-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
