<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

const videoUrl = ref('')
const cookiePath = ref('') // 用于指向本地 cookies.txt
const downloadPath = ref('') // 下載目錄
const downloading = ref(false)
const progress = ref(0)
const statusMsg = ref('')
const logs = ref<string[]>([])
const logContainer = ref<HTMLElement | null>(null)

// 格式相關狀態
const fetchingFormats = ref(false)
const availableFormats = ref<VideoFormat[]>([])
const selectedFormatId = ref('')
const showFormats = ref(false)

// Debug: Watch for selection changes
watch(selectedFormatId, (newVal) => {
  console.log('[App.vue] selectedFormatId changed to:', newVal, 'Type:', typeof newVal)
})

// 診斷日誌: 檢查 window.electron 是否可用
console.log('[App.vue] Checking window.electron:', typeof window.electron)
console.log('[App.vue] window.electron available:', !!window.electron)
if (window.electron) {
  console.log('[App.vue] window.electron methods:', Object.keys(window.electron))
}

// 選擇下載目錄
const selectDownloadDirectory = async () => {
  try {
    const path = await window.electron.selectDirectory()
    if (path) {
      downloadPath.value = path
    }
  } catch (error) {
    console.error('[App.vue] Error selecting directory:', error)
  }
}

// 獲取可用格式列表
const fetchFormats = async () => {
  if (!videoUrl.value) {
    statusMsg.value = '請先輸入影片連結'
    return
  }

  fetchingFormats.value = true
  statusMsg.value = '正在獲取可用格式...'
  logs.value = []
  availableFormats.value = []
  selectedFormatId.value = ''

  try {
    const result = await window.electron.getFormats({ url: videoUrl.value })
    availableFormats.value = result.formats
    showFormats.value = true
    statusMsg.value = `找到 ${result.formats.length} 個可用格式`
    
    console.log('[App.vue] Fetched formats:', result.formats)
  } catch (error) {
    console.error('[App.vue] Error fetching formats:', error)
    statusMsg.value = '獲取格式失敗，請檢查 URL'
    logs.value.push(`Error: ${error}`)
  } finally {
    fetchingFormats.value = false
  }
}

// 格式化顯示文字
const formatDisplay = (format: VideoFormat): string => {
  const parts = []
  
  if (format.resolution && format.resolution !== 'audio only') {
    parts.push(format.resolution)
  } else if (format.resolution === 'audio only') {
    parts.push('僅音訊')
  }
  
  if (format.fps) {
    parts.push(format.fps)
  }
  
  if (format.ext) {
    parts.push(format.ext)
  }
  
  if (format.filesize) {
    parts.push(format.filesize)
  }
  
  if (format.vcodec && format.vcodec !== 'none') {
    parts.push(`視訊:${format.vcodec}`)
  }
  
  if (format.acodec && format.acodec !== 'none') {
    parts.push(`音訊:${format.acodec}`)
  }
  
  if (format.note) {
    parts.push(`(${format.note})`)
  }
  
  return `[${format.id}] ${parts.join(' | ')}`
}

const handleDownload = async () => {
  console.log('[App.vue] handleDownload called')
  console.log('[App.vue] videoUrl:', videoUrl.value)
  console.log('[App.vue] selectedFormatId:', selectedFormatId.value)
  console.log('[App.vue] downloadPath:', downloadPath.value)
  console.log('[App.vue] window.electron:', window.electron)
  
  if (!videoUrl.value) return
  
  downloading.value = true
  progress.value = 0
  statusMsg.value = '正在初始化下載...'
  logs.value = []

  // 监听进度
  window.electron.onProgress((percent: number) => {
    progress.value = percent
    statusMsg.value = `下載中: ${percent}%`
  })

  // 监听详细日志
  window.electron.onLog((log: string) => {
    logs.value.push(log)
    // 自动滚动到底部
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  })

  try {
    await window.electron.startDownload({
      url: videoUrl.value,
      cookiePath: cookiePath.value, // 如果为空则不传
      formatId: selectedFormatId.value || undefined, // 如果未選擇則使用預設
      downloadPath: downloadPath.value || undefined // 如果未選擇則使用預設
    })
    statusMsg.value = '下載完成！已保存到下載文件夾。'
    progress.value = 100
  } catch (error) {
    console.error(error)
    statusMsg.value = '下載失敗，請檢查 URL 或網路。'
    logs.value.push(`Error: ${error}`)
  } finally {
    downloading.value = false
    window.electron.removeListeners()
  }
}
</script>

<template>
  <div class="container">
    <h1>Universal Video Downloader</h1>
    
    <div class="input-group">
      <label>視頻連結:</label>
      <input v-model="videoUrl" type="text" placeholder="https://..." :disabled="downloading || fetchingFormats" />
    </div>

    <div class="input-group">
      <label>Cookies 路徑 (選填, 用於會員視頻):</label>
      <input 
        v-model="cookiePath" 
        type="text" 
        placeholder="/path/to/cookies.txt" 
        :disabled="downloading || fetchingFormats" 
      />
      <small class="hint">請使用 Netscape 格式的 cookies.txt 文件</small>
    </div>

    <div class="input-group">
      <label>下載目錄 (選填, 預設為 Downloads):</label>
      <div class="path-input-container">
        <input 
          v-model="downloadPath" 
          type="text" 
          placeholder="預設下載目錄" 
          readonly
          :disabled="downloading || fetchingFormats" 
        />
        <button @click="selectDownloadDirectory" :disabled="downloading || fetchingFormats" class="btn-small">
          瀏覽...
        </button>
      </div>
    </div>

    <div class="button-group">
      <button @click="fetchFormats" :disabled="downloading || fetchingFormats || !videoUrl" class="btn-secondary">
        {{ fetchingFormats ? '獲取中...' : '獲取可用格式' }}
      </button>
      
      <button @click="handleDownload" :disabled="downloading || !videoUrl" class="btn-primary">
        {{ downloading ? '下載中...' : '開始下載' }}
      </button>
    </div>

    <!-- 格式選擇區域 -->
    <div v-if="showFormats && availableFormats.length > 0" class="formats-section">
      <h3>選擇格式 (可選，不選則下載最佳品質):</h3>
      <div class="format-list">
        <label class="format-item" :class="{ selected: selectedFormatId === '' }">
          <input type="radio" v-model="selectedFormatId" value="" />
          <span class="format-text">自動選擇最佳品質 (預設)</span>
        </label>
        <label 
          v-for="format in availableFormats" 
          :key="format.id" 
          class="format-item"
          :class="{ selected: selectedFormatId === format.id }"
        >
          <input type="radio" v-model="selectedFormatId" :value="format.id" />
          <span class="format-text">{{ formatDisplay(format) }}</span>
        </label>
      </div>
    </div>

    <div v-if="downloading || progress > 0" class="progress-bar-container">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>
    
    <p class="status">{{ statusMsg }}</p>

    <div v-if="logs.length > 0" class="logs-container" ref="logContainer">
      <div v-for="(log, index) in logs" :key="index" class="log-item">{{ log }}</div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: sans-serif;
  color: #333;
}
h1 {
  text-align: center;
  color: #2c3e50;
}
h3 {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}
.input-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  text-align: left;
}
.path-input-container {
  display: flex;
  gap: 10px;
}
label {
  font-weight: bold;
  margin-bottom: 0.5rem;
}
input[type="text"] {
  padding: 10px;
  margin-top: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
  width: 100%;
  box-sizing: border-box;
}
.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 1rem;
}
button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s;
}
.btn-small {
  flex: 0 0 auto;
  width: auto;
  padding: 10px 20px;
  margin-top: 5px;
  background-color: #6c757d;
  color: white;
}
.btn-small:hover:not(:disabled) {
  background-color: #5a6268;
}
.btn-primary {
  background-color: #42b983;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background-color: #3aa876;
}
.btn-secondary {
  background-color: #2196f3;
  color: white;
}
.btn-secondary:hover:not(:disabled) {
  background-color: #1976d2;
}
button:disabled {
  background-color: #a8d1c0;
  cursor: not-allowed;
  opacity: 0.6;
}
.progress-bar-container {
  width: 100%;
  height: 20px;
  background-color: #eee;
  border-radius: 10px;
  margin-top: 20px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background-color: #2196f3;
  transition: width 0.3s ease;
}
.hint {
  color: #666;
  font-size: 0.8rem;
  margin-top: 4px;
}
.status {
  margin-top: 20px;
  font-weight: bold;
  text-align: center;
}
.logs-container {
  margin-top: 20px;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  height: 150px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  color: #555;
  text-align: left;
  border: 1px solid #ddd;
}
.log-item {
  margin-bottom: 2px;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 格式選擇區域樣式 */
.formats-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}
.format-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  padding: 0.5rem;
}
.format-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.format-item:hover {
  background-color: #f0f0f0;
}
.format-item.selected {
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
}
.format-item input[type="radio"] {
  margin-right: 0.5rem;
  cursor: pointer;
  width: auto;
}
.format-text {
  font-family: monospace;
  font-size: 13px;
  color: #333;
  flex: 1;
}
</style>
