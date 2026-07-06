const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 安全获取 File 的真实路径
  getFilePath: (file) => webUtils.getPathForFile(file),

  // 压缩
  compressFolder: (folderPath, options) => ipcRenderer.invoke('drag-compress', folderPath, options),

  // 解压
  extractArchive: (archivePath) => ipcRenderer.invoke('drag-extract', archivePath),

  // 订阅压缩进度
  onZipProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('zip-progress', subscription);
    return () => ipcRenderer.removeListener('zip-progress', subscription);
  },

  // 订阅解压进度
  onUnzipProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('unzip-progress', subscription);
    return () => ipcRenderer.removeListener('unzip-progress', subscription);
  }
});