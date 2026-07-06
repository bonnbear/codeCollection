const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lanShare', {
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  startSharing: (payload) => ipcRenderer.invoke('start-sharing', payload),
  stopSharing: () => ipcRenderer.invoke('stop-sharing'),
  getState: () => ipcRenderer.invoke('get-state'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url)
});
