<!-- src/App.vue (初始版本) -->
<script setup>
import { ref, computed } from 'vue';

// 1. 数据目前是硬编码在前端代码里的
const allItems = ref([
  'Apple', 'Banana', 'Orange', 'Pineapple', 'Grape',
  'Strawberry', 'Blueberry', 'Raspberry', 'Mango', 'Peach'
]);

const searchQuery = ref('');

// 2. 过滤逻辑完全在客户端进行
const filteredItems = computed(() => {
  if (!searchQuery.value) {
    return allItems.value;
  }
  return allItems.value.filter(item =>
    item.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
</script>

<template>
  <div class="container">
    <h1>本地实时搜索</h1>
    <p>数据硬编码在 Vue 组件中</p>

    <input
      type="text"
      v-model="searchQuery"
      placeholder="输入水果名称..."
      class="search-input"
    />

    <ul class="item-list">
      <li v-if="filteredItems.length === 0" class="no-results">
        没有找到匹配的水果
      </li>
      <li v-for="item in filteredItems" :key="item">
        {{ item }}
      </li>
    </ul>
  </div>
</template>

<style>
  /* 你可以保留或自定义一些基本样式 */
  .container { max-width: 600px; margin: 40px auto; padding: 20px; font-family: sans-serif; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  h1, p { text-align: center; }
  .search-input { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; margin-bottom: 20px; }
  .item-list { list-style-type: none; padding: 0; }
  .item-list li { padding: 12px; border-bottom: 1px solid #eee; }
  .no-results { color: #888; text-align: center; padding: 20px; }
</style>
