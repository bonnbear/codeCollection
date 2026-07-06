const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { path7za } = require('7zip-bin');
const EventEmitter = require('events');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 防止拖入文件导致导航
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // 防止新窗口打开
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 通用：解析 stdout/stderr 行
function wireLineStream(stream, emitName, ee) {
  let buf = '';
  stream.on('data', chunk => {
    buf += chunk.toString();
    const parts = buf.split(/\r\n|\n|\r/);
    buf = parts.pop();
    for (const line of parts) {
      if (line.trim().length) ee.emit(emitName, line);
    }
  });
  stream.on('end', () => {
    if (buf.trim().length) ee.emit(emitName, buf);
  });
}

// 压缩
function compress7z({ sourcePath, outFile, level = 5 }) {
  const ee = new EventEmitter();
  const args = [
    'a',
    '-bsp1',
    '-bso1',
    '-bse1',
    '-y',
    `-mx=${level}`, // 添加压缩等级参数
    outFile,
    sourcePath,
    // 可按需添加：'-mmt=on'
  ];
  const child = spawn(path7za, args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  wireLineStream(child.stdout, 'stdout', ee);
  wireLineStream(child.stderr, 'stderr', ee);

  ee.on('stdout', line => {
    const m = line.match(/(\d{1,3})%/);
    if (m) ee.emit('progress', clampPercent(Number(m[1])));
  });

  child.on('error', err => ee.emit('error', err));
  child.on('close', (code, signal) => ee.emit('done', { code, signal }));
  ee.cancel = () => child.kill('SIGTERM');
  return ee;
}

// 解压
function extract7z({ archivePath, destDir }) {
  const ee = new EventEmitter();
  const args = [
    'x',
    '-bsp1',
    '-bso1',
    '-bse1',
    '-y',
    archivePath,
    `-o${destDir}`,
    // 可按需添加：'-aoa' 覆盖策略
  ];
  const child = spawn(path7za, args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  wireLineStream(child.stdout, 'stdout', ee);
  wireLineStream(child.stderr, 'stderr', ee);

  ee.on('stdout', line => {
    const m = line.match(/(\d{1,3})%/);
    if (m) ee.emit('progress', clampPercent(Number(m[1])));
  });

  child.on('error', err => ee.emit('error', err));
  child.on('close', (code, signal) => ee.emit('done', { code, signal }));
  ee.cancel = () => child.kill('SIGTERM');
  return ee;
}

function clampPercent(n) {
  return Math.max(0, Math.min(100, n));
}

// IPC: 压缩
ipcMain.handle('drag-compress', async (event, realPath, options = {}) => {
  if (!realPath || typeof realPath !== 'string') {
    throw new Error('Invalid path');
  }
  const outFile = path.join(
    path.dirname(realPath),
    `${path.basename(realPath)}.7z`
  );

  return new Promise((resolve, reject) => {
    const task = compress7z({ 
      sourcePath: realPath, 
      outFile,
      level: options.level // 传递压缩等级
    });

    task.on('progress', (p) => {
      event.sender.send('zip-progress', p);
    });

    task.on('stderr', () => { /* 可记录日志 */ });

    task.on('done', ({ code }) => {
      if (code === 0) resolve({ outFile });
      else reject(new Error(`7z exited with code ${code}`));
    });

    task.on('error', reject);
  });
});

// IPC: 解压
ipcMain.handle('drag-extract', async (event, archivePath) => {
  if (!archivePath || typeof archivePath !== 'string') {
    throw new Error('Invalid archive path');
  }
  const base = path.basename(archivePath, path.extname(archivePath));
  const destDir = path.join(path.dirname(archivePath), `${base}_extracted`);

  return new Promise((resolve, reject) => {
    const task = extract7z({ archivePath, destDir });

    task.on('progress', (p) => {
      event.sender.send('unzip-progress', p);
    });

    task.on('stderr', () => { /* 可记录日志 */ });

    task.on('done', ({ code }) => {
      if (code === 0) resolve({ destDir });
      else reject(new Error(`7z exited with code ${code}`));
    });

    task.on('error', reject);
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});