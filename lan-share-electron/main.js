const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

let mainWindow = null;
const execFileAsync = promisify(execFile);
const SHARING_BIN = '/usr/sbin/sharing';
const OSASCRIPT_BIN = '/usr/bin/osascript';
let appShareName = '';
let serverState = {
  running: false,
  shareDir: '',
  shareName: '',
  localUrls: [],
  protocol: 'SMB'
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const key of Object.keys(interfaces)) {
    for (const address of interfaces[key] || []) {
      if (address.family === 'IPv4' && !address.internal) {
        ips.push(address.address);
      }
    }
  }

  return [...new Set(ips)];
}

function resetState() {
  serverState = {
    running: false,
    shareDir: '',
    shareName: '',
    localUrls: [],
    protocol: 'SMB'
  };
}

function validateShareName(value) {
  const name = String(value || '').trim();
  if (!name) {
    throw new Error('共享名不能为空');
  }
  if (!/^[\w\-. \u4e00-\u9fa5]+$/.test(name)) {
    throw new Error('共享名仅支持中英文、数字、空格、下划线、短横线和点');
  }
  return name;
}

function shellEscape(arg) {
  return `'${String(arg).replace(/'/g, `'\\''`)}'`;
}

async function runSharing(args, options = {}) {
  const { elevated = false } = options;
  if (!elevated) {
    const { stdout } = await execFileAsync(SHARING_BIN, args);
    return stdout || '';
  }

  const command = `${shellEscape(SHARING_BIN)} ${args.map(shellEscape).join(' ')}`;
  const script = `do shell script ${JSON.stringify(command)} with administrator privileges`;
  const { stdout } = await execFileAsync(OSASCRIPT_BIN, ['-e', script]);
  return stdout || '';
}

async function listShares() {
  const stdout = await runSharing(['-l', '-f', 'json']);
  try {
    return JSON.parse(stdout || '{}');
  } catch {
    return {};
  }
}

async function stopSharing() {
  if (!appShareName) {
    resetState();
    return serverState;
  }

  try {
    await runSharing(['-r', appShareName], { elevated: true });
  } catch (error) {
    throw new Error(`停止 SMB 共享失败: ${error.message || String(error)}`);
  }

  appShareName = '';
  resetState();
  return serverState;
}

async function startSharing({ shareDir, shareName }) {
  if (process.platform !== 'darwin') {
    throw new Error('当前版本仅支持 macOS（依赖系统 sharing 命令）');
  }
  if (!fs.existsSync(SHARING_BIN)) {
    throw new Error('未找到 /usr/sbin/sharing，无法启用 SMB 共享');
  }

  const absDir = path.resolve(String(shareDir || '').trim());
  if (!absDir || !fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    throw new Error('目录不存在或不可访问');
  }

  const normalizedName = validateShareName(shareName || path.basename(absDir));
  await stopSharing();

  const shares = await listShares();
  if (shares[normalizedName]) {
    throw new Error(`共享名已存在: ${normalizedName}，请换一个名字`);
  }

  try {
    await runSharing(['-a', absDir, '-S', normalizedName, '-s', '001', '-g', '001'], { elevated: true });
  } catch (error) {
    throw new Error(
      `创建 SMB 共享失败。请在弹出的系统窗口输入管理员密码并重试。原始错误: ${error.message || String(error)}`
    );
  }

  appShareName = normalizedName;
  const localIPs = getLocalIPv4Addresses();
  serverState = {
    running: true,
    shareDir: absDir,
    shareName: normalizedName,
    localUrls: [
      `smb://localhost/${encodeURIComponent(normalizedName)}`,
      ...localIPs.map((ip) => `smb://${ip}/${encodeURIComponent(normalizedName)}`)
    ],
    protocol: 'SMB'
  };
  return serverState;
}

ipcMain.handle('choose-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle('start-sharing', async (_event, payload) => {
  return startSharing(payload);
});

ipcMain.handle('stop-sharing', async () => {
  return stopSharing();
});

ipcMain.handle('get-state', async () => {
  return serverState;
});

ipcMain.handle('open-url', async (_event, url) => {
  await shell.openExternal(url);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  try {
    await stopSharing();
  } catch {
    // Ignore cleanup errors when app is closing.
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
