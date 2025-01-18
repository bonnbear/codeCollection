<template>
  <div class="tab-container" ref="container">
    <div class="tab-wrapper">
      <!-- 左侧标签页区域 -->
      <div class="tabs-section">
        <!-- 左右滚动按钮 -->
        <div 
          v-show="showLeftArrow" 
          class="nav-prev" 
          @click="scroll('left')"
        >
          <span class="arrow-left">◄</span>
        </div>

        <!-- 标签容器 -->
        <div 
          class="nav-scroll" 
          ref="navScroll"
          @wheel.prevent="handleWheel"
        >
          <div 
            class="nav-wrap" 
            ref="navWrap"
          >
            <div class="tabs">
              <div
                v-for="(tab, index) in tabs"
                :key="index"
                class="tab-item"
                :class="{ active: activeTab === index }"
                @click="handleTabClick(index)"
              >
                {{ tab.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- 右箭头 -->
        <div 
          v-show="showRightArrow" 
          class="nav-next" 
          @click="scroll('right')"
        >
          <span class="arrow-right">►</span>
        </div>
      </div>

      <!-- 右侧标题区域 -->
      <div class="header-title">
        页面标题
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="tab-content">
      <div 
        v-for="(tab, index) in tabs" 
        :key="index"
        v-show="activeTab === index"
      >
        {{ tab.content }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

// 模拟数据
const tabs = ref([
  { name: 'Tab 1', content: 'Content 1' },
  { name: 'Tab 2', content: 'Content 2' },
  { name: 'Tab 3', content: 'Content 3' },
  { name: 'Tab 4', content: 'Content 4' },
  { name: 'Tab 5', content: 'Content 5' },
  { name: 'Tab 6', content: 'Content 6' },
  { name: 'Tab 7', content: 'Content 7' },
  { name: 'Tab 8', content: 'Content 8' },
  { name: 'Tab 9', content: 'Content 9' },
  { name: 'Tab 10', content: 'Content 10' },
])

const activeTab = ref(0)
const navScroll = ref(null)
const navWrap = ref(null)
const container = ref(null)
const showLeftArrow = ref(false)
const showRightArrow = ref(false)

// 创建 ResizeObserver 实例
let resizeObserver = null

// 检查是否需要显示箭头
const checkArrows = () => {
  if (!navScroll.value || !navWrap.value) return

  const { scrollWidth, clientWidth, scrollLeft } = navScroll.value
  
  // 只有当滚动区域宽度大于可视区域宽度时才显示箭头
  const needArrows = scrollWidth > clientWidth
  
  showLeftArrow.value = needArrows && scrollLeft > 0
  showRightArrow.value = needArrows && scrollLeft < scrollWidth - clientWidth
}

// 处理滚动
const scroll = (direction) => {
  if (!navScroll.value) return

  const SCROLL_STEP = 200
  const currentScrollLeft = navScroll.value.scrollLeft
  const newScrollLeft = direction === 'left' 
    ? currentScrollLeft - SCROLL_STEP 
    : currentScrollLeft + SCROLL_STEP

  navScroll.value.scrollTo({
    left: newScrollLeft,
    behavior: 'smooth'
  })
}

// 处理鼠标滚轮
const handleWheel = (e) => {
  if (!navScroll.value) return
  
  navScroll.value.scrollLeft += e.deltaY
  checkArrows()
}

// 处理标签点击
const handleTabClick = (index) => {
  activeTab.value = index
}

// 监听滚动事件
const handleScroll = () => {
  checkArrows()
}

// 处理窗口大小变化
const handleResize = () => {
  checkArrows()
}

// 监听tabs变化
watch(tabs, () => {
  nextTick(() => {
    checkArrows()
  })
})

// 监听activeTab变化，确保当前活动tab可见
watch(activeTab, (newIndex) => {
  nextTick(() => {
    if (!navScroll.value) return
    
    const tabElements = navScroll.value.getElementsByClassName('tab-item')
    if (tabElements[newIndex]) {
      const tabElement = tabElements[newIndex]
      const { offsetLeft, offsetWidth } = tabElement
      const { scrollLeft, clientWidth } = navScroll.value

      if (offsetLeft < scrollLeft) {
        navScroll.value.scrollTo({
          left: offsetLeft,
          behavior: 'smooth'
        })
      } else if (offsetLeft + offsetWidth > scrollLeft + clientWidth) {
        navScroll.value.scrollTo({
          left: offsetLeft + offsetWidth - clientWidth,
          behavior: 'smooth'
        })
      }
    }
    checkArrows()
  })
})

onMounted(() => {
  nextTick(() => {
    checkArrows()
    if (navScroll.value) {
      navScroll.value.addEventListener('scroll', handleScroll)
    }
    
    window.addEventListener('resize', handleResize)
    
    if (container.value) {
      resizeObserver = new ResizeObserver(() => {
        checkArrows()
      })
      resizeObserver.observe(container.value)
    }
  })
})

onBeforeUnmount(() => {
  if (navScroll.value) {
    navScroll.value.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('resize', handleResize)
  
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style scoped>
.tab-container {
  width: 100%;
  border: 1px solid #e4e7ed;
}

.tab-wrapper {
  display: flex;
  align-items: center;
  min-height: 40px;
  border-bottom: 1px solid #e4e7ed;
}

/* 调整标签区域样式 */
.tabs-section {
  position: relative;
  flex: 1; /* 占据剩余空间 */
  min-width: 0; /* 防止flex子项溢出 */
  display: flex;
  align-items: center;
  border-right: 1px solid #e4e7ed; /* 添加右边框 */
}

/* 调整标题区域样式 */
.header-title {
  flex: 0 0 200px; /* 固定宽度不伸缩 */
  padding: 0 15px;
  font-weight: bold;
  white-space: nowrap;
  height: 40px;
  line-height: 40px;
  text-align: right; /* 靠右对齐 */
}

.nav-scroll {
  flex: 1;
  overflow-x: hidden;
  white-space: nowrap;
  position: relative;
  margin: 0 20px;
  height: 40px;
}

.nav-wrap {
  display: inline-block;
  height: 100%;
}

.tabs {
  display: flex;
  flex-wrap: nowrap;
  height: 100%;
}

.tab-item {
  padding: 0 20px;
  height: 40px;
  line-height: 40px;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
}

.tab-item:hover {
  color: #409eff;
}

.tab-item.active {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}

.nav-prev,
.nav-next {
  flex: 0 0 20px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  cursor: pointer;
  background-color: #fff;
  color: #909399;
  z-index: 10;
}

.nav-prev:hover,
.nav-next:hover {
  color: #409eff;
}

.tab-content {
  padding: 15px;
}

.arrow-left,
.arrow-right {
  font-size: 12px;
}

/* 响应式布局 */
@media screen and (max-width: 768px) {
  .header-title {
    flex: 0 0 120px; /* 小屏幕下减小标题宽度 */
  }
  
  .tab-item {
    padding: 0 15px;
  }
}

@media screen and (max-width: 480px) {
  .header-title {
    flex: 0 0 100px; /* 更小屏幕下进一步减小标题宽度 */
  }
  
  .tab-item {
    padding: 0 10px;
  }
}
</style>