const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('compressorAPI', {
  pickSources: () => ipcRenderer.invoke('dialog:pick-sources'),
  pickSavePath: (suggestedName) => ipcRenderer.invoke('dialog:pick-save', suggestedName),
  pickArchiveFile: () => ipcRenderer.invoke('dialog:pick-archive'),
  pickTargetDirectory: () => ipcRenderer.invoke('dialog:pick-target-dir'),
  startJob: (payload) => ipcRenderer.invoke('job:start', payload),
  cancelJob: (jobId) => ipcRenderer.invoke('job:cancel', jobId),
  onJobEvent: (handler) => {
    const listener = (_event, data) => handler(data);
    ipcRenderer.on('job:event', listener);
    return () => ipcRenderer.removeListener('job:event', listener);
  }
});
