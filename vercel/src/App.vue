<template>
  <header>
    <h1>資訊管理器</h1>
    <!-- 我們暫時移除設定功能以簡化專案 -->
  </header>

  <main class="app-container">
    <!-- 新增/編輯資料區 -->
    <section id="form-container" class="card">
      <h2 id="form-title">{{ form.id ? '編輯資料' : '新增資料' }}</h2>
      <form id="data-form" @submit.prevent="handleSave">
        <div class="form-group">
          <label for="name">名稱</label>
          <input type="text" id="name" v-model="form.name" required>
        </div>
        <div class="form-group">
          <label for="account">帳號</label>
          <input type="text" id="account" v-model="form.account" required>
        </div>
        <div class="form-group">
          <label for="password">密碼</label>
          <input type="password" id="password" v-model="form.password" required>
        </div>
        <div class="form-buttons">
          <button type="submit" class="btn btn-primary btn-full-width">儲存資料</button>
          <button type="button" @click="clearForm" class="btn btn-secondary">清空表單</button>
          <button type="button" @click="handleDelete" v-if="form.id" class="btn btn-danger">刪除選取</button>
        </div>
      </form>
    </section>

    <!-- 資料列表區 -->
    <section id="list-container" class="card">
      <h2>資料列表</h2>
      <input type="search" id="search-input" v-model="searchTerm" placeholder="搜尋名稱或帳號...">
      <div id="data-list">
         <p v-if="filteredEntries.length === 0">找不到符合條件的資料。</p>
         <div 
            v-for="entry in filteredEntries" 
            :key="entry.id" 
            class="data-item"
            :class="{ selected: entry.id === form.id }"
            @click="selectEntry(entry)">
            <h3>{{ entry.name }}</h3>
            <p>帳號: {{ entry.account }}</p>
         </div>
      </div>
    </section>

    <!-- 圖片區 -->
    <section id="image-container" class="card">
      <h2>對應圖片</h2>
      <div id="image-section" @click="triggerImageImport">
        <div id="image-placeholder" v-if="!form.image">
          <p>點此匯入圖片</p>
        </div>
        <img id="entry-image" :src="form.image" v-if="form.image" alt="對應圖片">
      </div>
      <input type="file" ref="imageInput" @change="handleImageUpload" accept="image/*" style="display: none;">
      <div class="image-buttons">
        <button @click="triggerImageImport" class="btn btn-secondary">從檔案匯入</button>
        <button @click="deleteImage" v-if="form.image" class="btn btn-danger">刪除圖片</button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import axios from 'axios';

// API 的基本 URL。Vercel 會自動處理代理。
const API_BASE_URL = '/api';

const entries = ref([]);
const searchTerm = ref('');
const imageInput = ref(null);

const initialFormState = {
  id: null,
  name: '',
  account: '',
  password: '',
  image: null, // 使用 base64 字串儲存圖片
};

const form = reactive({ ...initialFormState });

// --- API 呼叫 ---
const fetchEntries = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/entries`);
    entries.value = response.data;
  } catch (error) {
    console.error('獲取資料失敗:', error);
    alert('無法從伺服器載入資料。');
  }
};

const handleSave = async () => {
  if (!form.name || !form.account || !form.password) {
    alert('名稱、帳號和密碼為必填項。');
    return;
  }

  const payload = {
    name: form.name,
    account: form.account,
    password: form.password,
    image: form.image,
  };

  try {
    if (form.id) {
      // 更新
      await axios.put(`${API_BASE_URL}/entries/${form.id}`, payload);
    } else {
      // 新增
      await axios.post(`${API_BASE_URL}/entries`, payload);
    }
    await fetchEntries(); // 重新獲取列表
    clearForm();
  } catch (error) {
    console.error('儲存失敗:', error);
    alert('儲存資料失敗。');
  }
};

const handleDelete = async () => {
  if (!form.id || !confirm(`確定要刪除 "${form.name}" 嗎？`)) {
    return;
  }
  try {
    await axios.delete(`${API_BASE_URL}/entries/${form.id}`);
    await fetchEntries();
    clearForm();
  } catch (error) {
    console.error('刪除失敗:', error);
    alert('刪除資料失敗。');
  }
};

// --- 表單與互動邏輯 ---
const clearForm = () => {
  Object.assign(form, initialFormState);
};

const selectEntry = (entry) => {
  form.id = entry.id;
  form.name = entry.name;
  form.account = entry.account;
  form.password = entry.password;
  form.image = entry.image || null;
};

const filteredEntries = computed(() => {
  if (!searchTerm.value) {
    return entries.value;
  }
  const lowerCaseSearch = searchTerm.value.toLowerCase();
  return entries.value.filter(entry => 
    entry.name.toLowerCase().includes(lowerCaseSearch) ||
    entry.account.toLowerCase().includes(lowerCaseSearch)
  );
});

// --- 圖片處理 ---
const triggerImageImport = () => {
  imageInput.value.click();
};

const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    form.image = e.target.result; // Base64 字串
  };
  reader.readAsDataURL(file);
};

const deleteImage = () => {
  form.image = null;
};

// 元件掛載後，自動獲取資料
onMounted(fetchEntries);

</script>

<style>
  /* --- 複製貼上之前提供的完整 CSS 樣式到這裡 --- */
  /* --- 全域變數與基本設定 --- */
  :root {
      --primary-color: #007bff;
      --primary-hover-color: #0056b3;
      --danger-color: #dc3545;
      --danger-hover-color: #c82333;
      --secondary-color: #6c757d;
      --secondary-hover-color: #5a6268;
      --background-color: #f4f7f9;
      --card-bg-color: #ffffff;
      --text-color: #333;
      --border-color: #dee2e6;
      --selected-bg-color: #e6f2ff;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }

  * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
  }

  body {
      font-family: var(--font-family);
      background-color: var(--background-color);
      color: var(--text-color);
      line-height: 1.6;
      padding: 20px;
  }

  /* --- 主佈局 --- */
  .app-container {
      display: grid;
      grid-template-columns: 300px 1fr 350px;
      grid-template-areas: "form list image";
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
  }

  /* --- 卡片式設計 --- */
  .card {
      background-color: var(--card-bg-color);
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
  }

  .card h2 {
      font-size: 1.2rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
      margin-bottom: 10px;
  }

  #form-container { grid-area: form; }
  #list-container { grid-area: list; }
  #image-container { grid-area: image; }

  /* --- 表單樣式 --- */
  .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
  }

  .form-group label {
      font-weight: 600;
      font-size: 0.9rem;
  }

  .form-group input {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 5px;
      font-size: 1rem;
  }

  .form-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
  }

  /* --- 按鈕樣式 --- */
  .btn {
      padding: 10px 15px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: background-color 0.2s;
      color: white;
      text-align: center;
  }

  .btn-primary { background-color: var(--primary-color); }
  .btn-primary:hover { background-color: var(--primary-hover-color); }

  .btn-secondary { background-color: var(--secondary-color); color: white; }
  .btn-secondary:hover { background-color: var(--secondary-hover-color); }

  .btn-danger { background-color: var(--danger-color); }
  .btn-danger:hover { background-color: var(--c82333); }
  
  .btn-full-width { grid-column: 1 / -1; }

  /* --- 資料列表 --- */
  #search-input {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 5px;
      font-size: 1rem;
  }
  
  #data-list {
      overflow-y: auto;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 300px; /* 給列表一個最小高度 */
  }

  .data-item {
      padding: 15px;
      border: 1px solid var(--border-color);
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
  }

  .data-item:hover {
      background-color: #f8f9fa;
  }

  .data-item.selected {
      background-color: var(--selected-bg-color);
      border-color: var(--primary-color);
  }

  .data-item h3 { font-size: 1.1rem; margin-bottom: 5px; }
  .data-item p { font-size: 0.9rem; color: #666; }

  /* --- 圖片區 --- */
  #image-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-grow: 1;
      border: 2px dashed var(--border-color);
      border-radius: 5px;
      position: relative;
      cursor: pointer;
  }

  #image-placeholder {
      text-align: center;
      color: #888;
  }
  
  #entry-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 5px;
  }

  .image-buttons {
      display: flex;
      gap: 10px;
      width: 100%;
  }
  .image-buttons .btn { flex: 1; }

  header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      max-width: 1400px;
      margin-left: auto;
      margin-right: auto;
  }

  header h1 { font-size: 1.8rem; }

  @media (max-width: 1200px) {
      .app-container {
          grid-template-columns: 280px 1fr;
          grid-template-areas:
              "form list"
              "image image";
      }
  }

  @media (max-width: 768px) {
      body { padding: 10px; }
      .app-container {
          grid-template-columns: 1fr;
          grid-template-areas:
              "form"
              "list"
              "image";
      }
      header { flex-direction: column; gap: 10px; }
  }
</style>