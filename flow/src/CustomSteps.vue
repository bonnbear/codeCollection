<template>
  <div class="custom-steps">
    <div 
      v-for="(step, index) in steps" 
      :key="index"
      class="step-item"
      :class="[
        `step-${step.type}`,
        { 'is-last': index === steps.length - 1 }
      ]"
    >
      <!-- 步骤节点 -->
      <div class="step-head">
        <div 
          class="step-icon"
          :class="`icon-${step.type}`"
        >
          <span v-html="getIcon(step.type)"></span>
        </div>
        <!-- 连接线 -->
        <div 
          v-if="index !== steps.length - 1" 
          class="step-line"
          :class="`line-${step.type}`"
        ></div>
      </div>
      
      <!-- 步骤内容 -->
      <div class="step-main">
        <div class="step-title">{{ step.title }}</div>
        <div class="step-description" v-if="step.description">
          {{ step.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  steps: {
    type: Array,
    required: true,
    // 期望格式: [{ type: 'pending', title: '步骤1', description: '' }]
  }
})

// icon 映射配置
const iconMap = {
  pending: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>`,
  
  submitted: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>`,
  
  unsubmitted: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,
  
  processing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`,
  
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>`,
  
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>`,
  
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`
}

const getIcon = (type) => {
  return iconMap[type] || iconMap.pending
}
</script>

<style scoped>
.custom-steps {
  display: flex;
  width: 100%;
  padding: 20px 0;
}

.step-item {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-head {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  transition: all 0.3s;
}

.step-icon svg {
  width: 24px;
  height: 24px;
}

/* 待提交状态 */
.step-pending .step-icon {
  background: #f5f5f5;
  border: 2px solid #d9d9d9;
  color: #999;
}

.step-pending .step-line {
  background: #e0e0e0;
}

/* 未提交状态 */
.step-unsubmitted .step-icon {
  background: #fff7e6;
  border: 2px solid #ffc069;
  color: #fa8c16;
}

.step-unsubmitted .step-line {
  background: #ffe7ba;
}

/* 已提交状态 */
.step-submitted .step-icon {
  background: #f6ffed;
  border: 2px solid #95de64;
  color: #52c41a;
}

.step-submitted .step-line {
  background: #b7eb8f;
}

/* 处理中状态 */
.step-processing .step-icon {
  background: #e6f7ff;
  border: 2px solid #69c0ff;
  color: #1890ff;
  animation: pulse 1.5s infinite;
}

.step-processing .step-line {
  background: #91d5ff;
}

/* 成功状态 */
.step-success .step-icon {
  background: #52c41a;
  border: 2px solid #52c41a;
  color: #fff;
}

.step-success .step-line {
  background: #52c41a;
}

/* 错误状态 */
.step-error .step-icon {
  background: #fff2f0;
  border: 2px solid #ff7875;
  color: #ff4d4f;
}

.step-error .step-line {
  background: #ffccc7;
}

/* 警告状态 */
.step-warning .step-icon {
  background: #fffbe6;
  border: 2px solid #ffd666;
  color: #faad14;
}

.step-warning .step-line {
  background: #ffe58f;
}

/* 连接线 */
.step-line {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateY(-50%);
  height: 2px;
  width: calc(100% - 40px);
  margin-left: 20px;
  transition: all 0.3s;
}

.step-item.is-last .step-line {
  display: none;
}

/* 步骤内容 */
.step-main {
  margin-top: 12px;
  text-align: center;
  padding: 0 10px;
}

.step-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 4px;
}

.step-description {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
  margin-top: 4px;
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(24, 144, 255, 0);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .step-title {
    font-size: 12px;
  }
  
  .step-description {
    font-size: 11px;
  }
  
  .step-icon {
    width: 32px;
    height: 32px;
  }
  
  .step-icon svg {
    width: 18px;
    height: 18px;
  }
}
</style>