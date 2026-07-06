const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('audioAPI', {
    // 检查 Sox 是否可用
    checkSox: () => ipcRenderer.invoke('check-sox'),

    // 选择文件
    selectFiles: () => ipcRenderer.invoke('select-files'),

    // 选择输出目录
    selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),

    // 获取文件信息
    getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),

    // 转换单个文件
    convertAudio: (options) => ipcRenderer.invoke('convert-audio', options),

    // 批量转换
    convertBatch: (options) => ipcRenderer.invoke('convert-batch', options),

    // 监听转换进度
    onConversionProgress: (callback) => {
        ipcRenderer.on('conversion-progress', (event, data) => callback(data));
    },

    // 监听批量进度
    onBatchProgress: (callback) => {
        ipcRenderer.on('batch-progress', (event, data) => callback(data));
    }
});
