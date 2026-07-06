const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { randomUUID } = require('node:crypto');

let mainWindow = null;
let activeJob = null;

function sanitizeFilename(name) {
  return (name || 'archive.tar.lz4').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

function sendJobEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('job:event', payload);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (activeJob?.worker) {
    activeJob.worker.terminate();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:pick-sources', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择文件或目录',
    properties: ['openFile', 'openDirectory', 'multiSelections']
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('dialog:pick-save', async (_event, suggestedName = 'archive.tar.lz4') => {
  const safeName = sanitizeFilename(suggestedName);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存压缩包',
    defaultPath: path.join(app.getPath('downloads'), safeName),
    filters: [
      { name: 'LZ4 Archive', extensions: ['lz4'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  return result.canceled ? '' : result.filePath || '';
});

ipcMain.handle('dialog:pick-archive', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择 .tar.lz4 文件',
    properties: ['openFile'],
    filters: [
      { name: 'LZ4 Archive', extensions: ['lz4'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) return '';
  return result.filePaths[0];
});

ipcMain.handle('dialog:pick-target-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择解压目录',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) return '';
  return result.filePaths[0];
});

ipcMain.handle('job:start', async (_event, payload) => {
  if (activeJob) {
    throw new Error('已有任务在运行，请先取消或等待完成。');
  }

  if (!payload || !payload.operation) {
    throw new Error('任务参数无效');
  }

  const jobId = randomUUID();
  const worker = new Worker(path.join(__dirname, 'worker.js'), {
    workerData: { jobId, ...payload }
  });

  activeJob = {
    jobId,
    worker,
    terminalNotified: false
  };

  worker.on('message', (msg) => {
    if (!activeJob || activeJob.jobId !== jobId) return;
    if (msg && (msg.type === 'done' || msg.type === 'error' || msg.type === 'canceled')) {
      activeJob.terminalNotified = true;
    }
    sendJobEvent({ jobId, ...msg });
  });

  worker.on('error', (err) => {
    if (!activeJob || activeJob.jobId !== jobId) return;
    activeJob.terminalNotified = true;
    sendJobEvent({
      jobId,
      type: 'error',
      operation: payload.operation,
      message: err?.message || '后台任务异常'
    });
  });

  worker.on('exit', (code) => {
    const current = activeJob && activeJob.jobId === jobId ? activeJob : null;
    if (current) {
      activeJob = null;
    }

    if (code !== 0 && current && !current.terminalNotified) {
      sendJobEvent({
        jobId,
        type: 'error',
        operation: payload.operation,
        message: `后台任务异常退出（code=${code}）`
      });
    }
  });

  return { jobId };
});

ipcMain.handle('job:cancel', async (_event, jobId) => {
  if (!activeJob || activeJob.jobId !== jobId) return false;
  activeJob.worker.postMessage({ type: 'cancel' });
  return true;
});
