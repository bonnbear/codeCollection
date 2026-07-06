<template>
  <div id="app-container">
    <h1>Steps 組件自動滾動功能示範</h1>

    <div class="demo-section">
      <h2>展示 <code>scrollToStepId</code> Prop</h2>
      <p>頁面加載 2 秒後，將自動滾動到 "步驟 15"。您也可以點擊按鈕手動觸發。</p>
      <div class="controls">
        <button @click="jumpToId('step-3')">滾動到步驟 3</button>
        <button @click="jumpToId('step-18')">滾動到步驟 18</button>
      </div>
    </div>

    <div class="demo-section">
      <h2>展示 <code>centerOnCurrentStep</code> Prop</h2>
      <p>點擊下方按鈕，將指定步驟設為 "當前步驟"，組件會自動將其居中。</p>
      <div class="controls">
        <button @click="demoCurrentStep = 2">激活步驟 3</button>
        <button @click="demoCurrentStep = 8">激活步驟 9</button>
        <button @click="demoCurrentStep = 19">激活步驟 20</button>
      </div>
    </div>

    <!-- Steps 組件實例 -->
    <div class="steps-component-container">
      <Steps
        :steps="demoSteps"
        :currentStep="demoCurrentStep"
        :scroll-to-step-id="targetStepId"
        :center-on-current-step="true"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'; // 導入 nextTick
import Steps from './Steps.vue'; // 導入 Steps 組件

// --- 狀態管理 ---
const demoSteps = ref([]);
const demoCurrentStep = ref(4); // 初始當前步驟為 5
const targetStepId = ref(null); // 用於觸發 scrollToStepId

// --- 數據生成 ---
// 生成一個包含 20 個步驟的演示數據
const generateDemoSteps = () => {
  const steps = [];
  const types = ['check', 'user', 'edit', 'wait'];
  for (let i = 0; i < 20; i++) {
    steps.push({
      id: `step-${i}`,
      title: `步驟 ${i + 1}`,
      type: types[i % types.length],
    });
  }
  return steps;
};

// --- 控制邏輯 ---
// 設置要跳轉到的目標 ID
const jumpToId = (id) => {
  targetStepId.value = id;
  // 在下一個 tick 中重置它，這樣下次點擊同一個按鈕仍然會觸發 watch
  nextTick(() => {
    targetStepId.value = null;
  });
};

// --- 生命週期鉤子 ---
onMounted(() => {
  demoSteps.value = generateDemoSteps();

  // 模擬頁面加載後自動滾動
  setTimeout(() => {
    jumpToId('step-14'); // 滾動到步驟 15 (索引為 14)
  }, 2000);
});
</script>

<style scoped>
#app-container {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  max-width: 1000px;
  margin: 40px auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.demo-section {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
  border: 1px solid #e0e0e0;
}

h2 {
  font-size: 1.4em;
  color: #409eff;
  margin-top: 0;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

h2 code {
  font-family: 'Courier New', Courier, monospace;
  background-color: #eef5ff;
  color: #409eff;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

p {
  color: #555;
  line-height: 1.6;
}

.controls {
  display: flex;
  gap: 15px;
  margin-top: 15px;
}

button {
  background-color: #409eff;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: background-color 0.3s, transform 0.2s;
}

button:hover {
  background-color: #66b1ff;
}

button:active {
  background-color: #3a8ee6;
  transform: scale(0.98);
}

.steps-component-container {
  margin-top: 30px;
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  background-color: #fff;
}
</style>