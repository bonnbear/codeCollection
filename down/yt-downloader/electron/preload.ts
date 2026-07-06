import { ipcRenderer, contextBridge } from 'electron'

// 診斷日誌: 檢查 preload 腳本是否執行
console.log('[Preload] Script loaded')

const api = {
  startDownload: (params: { url: string; cookiePath?: string; formatId?: string; downloadPath?: string }) => 
    ipcRenderer.invoke('start-download', params),
  
  getFormats: (params: { url: string }) =>
    ipcRenderer.invoke('get-formats', params),

  selectDirectory: () => 
    ipcRenderer.invoke('select-directory'),
  
  onProgress: (callback: (progress: number) => void) => 
    ipcRenderer.on('download-progress', (_event, value) => callback(value)),
    
  onLog: (callback: (log: string) => void) => 
    ipcRenderer.on('download-log', (_event, value) => callback(value)),
    
  removeListeners: () => {
    ipcRenderer.removeAllListeners('download-progress')
    ipcRenderer.removeAllListeners('download-log')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api)
    console.log('[Preload] contextBridge.exposeInMainWorld called, window.electron should be available')
    console.log('[Preload] API methods:', Object.keys(api))
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = api
}
