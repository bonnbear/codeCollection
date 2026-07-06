const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronMusicAPI', {
  getEnvironment() {
    return ipcRenderer.invoke('app:get-environment')
  },
  selectFolder() {
    return ipcRenderer.invoke('music:select-folder')
  },
  scanMusic(folderPath) {
    return ipcRenderer.invoke('music:scan-folder', folderPath)
  },
})
