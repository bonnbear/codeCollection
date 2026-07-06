<script setup>
// 新增: 导入 watch
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';

// 定义组件的 props
const props = defineProps({
  // 步骤数据数组
  // 示例: [{ id: 1, title: '步骤1', status: 'submitted', type: 'check' }, ...]
  steps: {
    type: Array,
    default: () => []
  },
  // 当前激活的步骤索引
  currentStep: {
    type: Number,
    default: 0
  },
  // 新增: 指定要滚动到的步骤 ID
  scrollToStepId: {
    type: [String, Number],
    default: null
  },
  // 新增: 是否在 currentStep 变化时自动将其居中
  centerOnCurrentStep: {
    type: Boolean,
    default: false // 默认为 false
  }
});

// 内部图标映射
const iconMap = {
  // ... (图标映射不变)
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
  wait: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`,
};

// 滚动相关的响应式状态
const scrollContainer = ref(null);
const showLeftButton = ref(false);
const showRightButton = ref(false);

/**
 * 根据 type 获取图标的 SVG 字符串
 * @param {string} type - 步骤的类型
 */
const getIcon = (type) => {
  return iconMap[type] || '';
};

/**
 * 获取步骤项的 CSS 类
 * @param {object} step - 步骤对象
 * @param {number} index - 步骤索引
 */
const getStepClasses = (step, index) => {
  // ... (此函数不变)
  const classes = ['step-item'];
  
  if (index === props.currentStep) {
    classes.push('is-active');
  } else if (index < props.currentStep) {
    classes.push('is-completed');
  }

  if (step.status) {
    classes.push(`status-${step.status}`);
  }

  return classes.join(' ');
};

/**
 * 检查是否需要显示滚动按钮
 */
const checkScrollButtons = () => {
  if (!scrollContainer.value) return;
  
  const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value;
  
  showLeftButton.value = scrollLeft > 0;
  showRightButton.value = scrollLeft < scrollWidth - clientWidth - 1;
};

/**
 * 向左滚动
 */
const scrollLeft = () => {
  // ... (此函数不变)
  if (!scrollContainer.value) return;
  
  scrollContainer.value.scrollBy({
    left: -200,
    behavior: 'smooth'
  });
};

/**
 * 向右滚动
 */
const scrollRight = () => {
  // ... (此函数不变)
  if (!scrollContainer.value) return;
  
  scrollContainer.value.scrollBy({
    left: 200,
    behavior: 'smooth'
  });
};

// --- 新增功能 ---

/**
 * (内部) 滚动到指定索引的步骤，并使其居中
 * @param {number} index - 步骤的索引
 */
const _scrollToIndex = (index) => {
  if (index < 0 || !scrollContainer.value) return;

  const stepElements = scrollContainer.value.children;
  if (!stepElements || !stepElements[index]) {
    console.warn(`[Steps] 无法找到索引为 ${index} 的步骤元素。`);
    return;
  }
  
  const targetElement = stepElements[index];
  const container = scrollContainer.value;

  const targetLeft = targetElement.offsetLeft;
  const targetWidth = targetElement.clientWidth;
  const containerWidth = container.clientWidth;

  // 修正：为了视觉上更居中，我们从目标元素的宽度中减去连接线的宽度（160px）的���半，
  // 因为连接线在右侧，导致视觉重心偏左。
  // margin-right 是 40px, connector-line 是 160px. 我们取一个中间值来调整。
  // 一个比较好的视觉偏移量大约是 (min-width + margin-right) / 2 - min-width / 2 = 20px
  const visualOffset = 20; // 视觉偏移量

  const scrollTo = (targetLeft + targetWidth / 2) - (containerWidth / 2) - visualOffset;

  container.scrollTo({
    left: scrollTo,
    behavior: 'smooth'
  });
};

// 新增: 监听 scrollToStepId prop 的变化
watch(() => props.scrollToStepId, (newId) => {
  if (newId !== null && props.steps.length > 0 && scrollContainer.value) {
    const index = props.steps.findIndex(step => step.id === newId);
    if (index >= 0) {
      _scrollToIndex(index);
    } else {
      console.warn(`[Steps] scrollToStepId: 未在 steps 数组中找到 ID "${newId}"。`);
    }
  }
}, { flush: 'post' });

// 新增: 监听 currentStep prop 的变化 (如果 centerOnCurrentStep 为 true)
watch(() => props.currentStep, (newIndex) => {
  if (props.centerOnCurrentStep && newIndex >= 0 && scrollContainer.value) {
    _scrollToIndex(newIndex);
  }
}, { flush: 'post' });

// --- 修改后的 onMounted ---

// 组件挂载后设置监听
onMounted(() => {
  if (scrollContainer.value) {
    checkScrollButtons();
    scrollContainer.value.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    if (props.scrollToStepId !== null) {
      const index = props.steps.findIndex(step => step.id === props.scrollToStepId);
      if (index >= 0) {
        setTimeout(() => _scrollToIndex(index), 100);
      }
    } 
    else if (props.centerOnCurrentStep && props.currentStep >= 0) {
      setTimeout(() => _scrollToIndex(props.currentStep), 100);
    }
  }
});

// 组件卸载前清理监听
onUnmounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', checkScrollButtons);
  }
  window.removeEventListener('resize', checkScrollButtons);
});

</script>

<template>
  <div class="steps-wrapper">
    <button 
      v-if="showLeftButton"
      class="scroll-button scroll-button-left"
      @click="scrollLeft"
      aria-label="向左滚动"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </button>
    <div class="steps-container" ref="scrollContainer">
      <div
        v-for="(step, index) in steps"
        :key="step.id || index"
        :class="getStepClasses(step, index)"
      >
        <div class="step-node">
          <div 
            v-if="getIcon(step.type)" 
            class="step-icon" 
            v-html="getIcon(step.type)"
          ></div>
          <span v-else class="step-number">{{ index + 1 }}</span>
        </div>
        <div class="step-title">{{ step.title }}</div>
        <div class="connector-line"></div>
      </div>
    </div>
    <button 
      v-if="showRightButton"
      class="scroll-button scroll-button-right"
      @click="scrollRight"
      aria-label="向右滚动"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* CSS 样式部分完全不变 */
/* 外层包装器 */
.steps-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

/* 滚动按钮通用样式 */
.scroll-button {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #fff;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.scroll-button:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
  color: #409eff;
}

.scroll-button:active {
  transform: scale(0.95);
}

.scroll-button svg {
  width: 20px;
  height: 20px;
}

/* 左侧按钮 */
.scroll-button-left {
  margin-right: 10px;
}

/* 右侧按钮 */
.scroll-button-right {
  margin-left: 10px;
}

/* 整个步骤图容器 */
.steps-container {
  display: flex;
  width: 100%;
  padding: 20px 0;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* 隐藏滚动条 - Webkit浏览器 */
.steps-container::-webkit-scrollbar {
  display: none;
}

/* 每个步骤项 */
.step-item {
  flex: 0 0 auto; /* 不缩放，保持固定宽度 */
  min-width: 120px; /* 最小宽度 */
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: #c0c4cc; /* 默认颜色 (未激活) */
  margin-right: 40px; /* 步骤之间的间距 */
}

.step-item:last-child {
  margin-right: 0;
}

/* 步骤节点 (圆圈) */
.step-node {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #c0c4cc;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  z-index: 1; /* 覆盖在连接线之上 */
  transition: all 0.3s ease;
}

/* 步骤图标 */
.step-icon {
  width: 18px;
  height: 18px;
  color: inherit; /* 继承父级 .step-node 的颜色 */
}
/* v-html 注入的 svg 默认没有大小 */
.step-icon :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor; /* 使用 CSS 的 color 属性填充 */
}

/* 步骤标题 */
.step-title {
  margin-top: 8px;
  font-size: 14px;
  white-space: nowrap; /* 防止标题换行 */
}

/* 连接线 */
.connector-line {
  position: absolute;
  top: 15px; /* (32px / 2) - 1px (线高) */
  left: 50%;
  width: 160px; /* 固定连接线宽度 */
  height: 2px;
  background-color: #c0c4cc; /* 默认线条颜色 */
  z-index: 0;
  transition: background-color 0.3s ease;
}

/* 隐藏最后一个步骤项的连接线 */
.step-item:last-child .connector-line {
  display: none;
}

/* --- 状态样式 --- */

/* 已完成/已提交 状态 */
.step-item.is-completed,
.step-item.status-submitted {
  color: #409eff; /* 主题蓝 */
}
.step-item.is-completed .step-node,
.step-item.status-submitted .step-node {
  border-color: #409eff;
  color: #409eff;
}
.step-item.is-completed .connector-line,
.step-item.status-submitted .connector-line {
  background-color: #409eff;
}
/* 已完成状态下图标颜色 */
.step-item.is-completed .step-icon,
.step-item.status-submitted .step-icon {
  color: #409eff;
}

/* 激活状态 (当前步骤) */
.step-item.is-active {
  color: #303133; /* 激活的文字深色 */
  font-weight: 500;
}
.step-item.is-active .step-node {
  border-color: #409eff;
  background-color: #409eff;
  color: #fff; /* 激活的图标/数字为白色 */
}
.step-item.is-active .step-icon {
  color: #fff;
}


/* 待提交 (pending) 状态 - 示例 (黄色) */
.step-item.status-pending {
  color: #e6a23c;
}
.step-item.status-pending .step-node {
  border-color: #e6a23c;
  color: #e6a23c;
}
.step-item.status-pending .step-icon {
  color: #e6a23c;
}

/* 未提交 (uncommitted) 状态 - 示例 (红色) */
.step-item.status-uncommitted {
  color: #f56c6c;
}
.step-item.status-uncommitted .step-node {
  border-color: #f56c6c;
  color: #f56c6c;
}
.step-item.status-uncommitted .step-icon {
  color: #f56c6c;
}
</style>