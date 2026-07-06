# 樹狀組件資料流重構方案 (Data Flow Refactoring)

本文檔詳細說明了將 `TreeNode` 組件從「雙向綁定 (v-model)」重構為符合 Vue 「單向數據流 (One-Way Data Flow)」原則的技術方案。

## 1. 現狀分析 (Current State)

目前 `TreeNode.vue` 利用 JavaScript 物件傳址 (Pass by Reference) 的特性，直接修改父層傳入的 `node` 物件。

### 程式碼模式
```html
<!-- src/TreeNode.vue -->
<el-checkbox v-model="node.checked" />
```

### 優缺點
*   **優點**: 實作簡單，無需在遞迴組件中層層傳遞事件 (Event Bubbling)。
*   **缺點**: 違反 Vue 的單向數據流原則（子組件不應直接修改 Props）。雖然因為是物件參考而不會報錯，但會導致資料流向不明確，難以追蹤是哪個組件修改了資料。

---

## 2. 重構目標 (Goal)

將資料的「修改權」收回到父組件 (`App.vue`)，子組件 (`TreeNode.vue`) 僅負責「顯示」與「通知」。

---

## 3. 技術方案 (Solution)

使用 Vue 的 **Dependency Injection (依賴注入)** 機制 (`provide` / `inject`) 來解決遞迴組件的通訊問題，避免事件冒泡地獄。

### 架構圖解

1.  **App.vue (Provider)**: 提供一個修改數據的方法 `toggleNodeCheck`。
2.  **TreeNode.vue (Injector)**: 注入該方法，並在 Checkbox 點擊時呼叫。

---

## 4. 實作細節 (Implementation)

### A. 父組件 (src/App.vue)

在 `App.vue` 中定義修改邏輯並 `provide` 給所有子孫組件。

```javascript
import { provide } from 'vue';

// ... 其他代碼

// 1. 定義修改數據的唯一入口
const toggleNodeCheck = (nodeId, isChecked) => {
  // 遞迴查找並修改目標節點
  const findAndToggle = (nodes) => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        node.checked = isChecked;
        return true;
      }
      if (node.children && findAndToggle(node.children)) {
        return true;
      }
    }
    return false;
  };
  
  findAndToggle(treeData);
};

// 2. 提供給後代組件
provide('toggleNodeCheck', toggleNodeCheck);
```

### B. 子組件 (src/TreeNode.vue)

在 `TreeNode.vue` 中 `inject` 該方法，並將 `v-model` 拆解為 `:model-value` 和 `@change`。

```javascript
import { inject } from 'vue';

// 1. 注入修改方法
const toggleNodeCheck = inject('toggleNodeCheck');

// ...
```

```html
<!-- 2. 模板修改 -->
<!-- 舊寫法 (移除) -->
<!-- <el-checkbox v-model="node.checked" /> -->

<!-- 新寫法 (採用) -->
<el-checkbox 
  :model-value="node.checked" 
  @change="(val) => toggleNodeCheck(node.id, val)"
  :disabled="isLocked"
/>
```

---

## 5. 關鍵區別 (Key Differences)

| 特性 | 舊方案 (v-model) | 新方案 (provide/inject) |
| :--- | :--- | :--- |
| **資料修改者** | 子組件 (`TreeNode`) | 父組件 (`App`) |
| **資料流向** | 雙向 (Two-way) | 單向 (One-way) |
| **代碼複雜度** | 低 | 中 (需增加查找邏輯) |
| **可維護性** | 低 (隱式修改) | 高 (顯式修改，邏輯集中) |
| **Vue 原則** | 違反 (但在物件下不報錯) | **完全符合** |

## 6. 結論

<<<<<<< HEAD
採用 **provide/inject** 配合 **:model-value/@change** 是處理深層遞迴組件狀態管理的最佳實踐。它既保留了跨層級通訊的便利性（避免了 props drilling 和 event bubbling），又嚴格遵守了單向數據流原則，讓狀態管理更加可預測。
=======
採用 **provide/inject** 配合 **:model-value/@change** 是處理深層遞迴組件狀態管理的最佳實踐。它既保留了跨層級通訊的便利性（避免了 props drilling 和 event bubbling），又嚴格遵守了單向數據流原則，讓狀態管理更加可預測。
>>>>>>> ea2d1ad (chore: save local changes before pull)
