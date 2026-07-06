<template>
  <li class="tree-node-item" :class="{ 'is-last': isLast, 'is-root': level === 0 }">
    <div
      class="node-content"
      @click="handleClick"
      :class="{
        'is-selected': isSelected,
        'is-folder': isFolder
      }"
    >
      <span class="node-indent" :style="{ width: indent + 'px' }"></span>

      <span v-if="isFolder" class="node-expand-icon" @click.stop="toggle">
        <svg class="expand-icon" :class="{ 'is-expanded': isOpen }" viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5z" fill="currentColor" />
        </svg>
      </span>

      <!-- 占位符：保证叶子节点与文件夹节点对齐 -->
      <span v-else class="node-expand-icon placeholder" aria-hidden="true"></span>

      <span class="node-content-wrapper">
        <span class="node-label">{{ node.name }}</span>
      </span>
    </div>

    <transition name="tree-node-expand">
      <ul class="tree-node-children" v-if="isFolder && isOpen">
        <TreeNode
          v-for="(child, index) in node.children"
          :key="child.id ?? child.name ?? index"
          :node="child"
          :selected-id="selectedId"
          :level="level + 1"
          :is-last="index === node.children.length - 1"
          @node-click="$emit('node-click', $event)"
          :path="[...path, node]"
        />
      </ul>
    </transition>
  </li>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  node: { type: Object, required: true },
  selectedId: { type: [String, Number, null], default: null },
  level: { type: Number, default: 0 },
  isLast: { type: Boolean, default: false },
  path: { type: Array, default: () => [] }
});

const emit = defineEmits(['node-click']);

const isOpen = ref(props.node.isOpen || false);
const isFolder = computed(() => props.node.children && props.node.children.length > 0);
const isSelected = computed(() => props.node.name === props.selectedId);
const indent = computed(() => props.level * 18);

const toggle = () => {
  if (isFolder.value) isOpen.value = !isOpen.value;
};

const handleClick = () => {
  const fullPath = [...props.path, props.node];
  emit('node-click', fullPath);
};
</script>

<style lang="scss" scoped>
/* ======================================= */
/* TreeNode 组件的全部样式 (完全封装)      */
/* ======================================= */

.tree-node-item {
  list-style: none;
  margin: 0;
  padding: 0;
  user-select: none;
  position: relative;
}

/* --- 连接线样式 --- */
.tree-node-item:not(.is-root) {
  &::before {
    content: '';
    position: absolute;
    left: calc(18px * (v-bind(level) - 1) + 12px);
    top: 0;
    width: 1px;
    height: 100%;
    background-color: #dcdfe6;

    /* [关键修复] 线在高亮之上 */
    z-index: 1;
    pointer-events: none;
  }
  &::after {
    content: '';
    position: absolute;
    left: calc(18px * (v-bind(level) - 1) + 13px);
    top: 16px;
    width: 11px;
    height: 1px;
    background-color: #dcdfe6;

    /* [关键修复] 线在高亮之上 */
    z-index: 1;
    pointer-events: none;
  }
}

.tree-node-item.is-last::before {
  height: 16px;
}

/* --- 节点内容样式 --- */
.node-content {
  display: flex;
  align-items: center;
  height: 32px;
  cursor: pointer;
  position: relative;

  /* 整行高亮效果 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    transition: background-color 0.15s;

    /* [关键修复] 高亮背景放到最底层 */
    z-index: 0;
  }

  &:hover::before {
    background-color: #f3f4f6;
  }

  &.is-selected::before {
    background-color: #e3f2fd;
  }

  &.is-selected:hover::before {
    background-color: #bbdefb;
  }

  /* 选中时的左边框 */
  &.is-selected::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: #1976d2;

    /* [增强] 保证左边框在内容层 */
    z-index: 2;
  }
}

.node-indent {
  flex-shrink: 0;
}

.node-expand-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;

  /* [关键修复] 内容层级高于线与高亮 */
  z-index: 2;

  .expand-icon {
    width: 16px;
    height: 16px;
    color: #6e7781;
    transition: transform 0.2s;

    &.is-expanded {
      transform: rotate(180deg);
    }
  }

  &:hover .expand-icon {
    color: #24292e;
  }

  &.placeholder {
    cursor: default;
  }
}

.node-content-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  position: relative;

  /* [关键修复] 内容层级高于线与高亮 */
  z-index: 2;

  padding-right: 12px;

  /* [间隔] 让文字离连接线/图标远一点 */
  padding-left: 6px;
}

.node-label {
  font-size: 14px;
  color: #24292e;
  line-height: 1.5;

  .is-selected & {
    color: #1976d2;
    font-weight: 500;
  }
}

.tree-node-children {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* --- 展开/收起动画 --- */
.tree-node-expand-enter-active,
.tree-node-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.tree-node-expand-enter-from,
.tree-node-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.tree-node-expand-enter-to,
.tree-node-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>