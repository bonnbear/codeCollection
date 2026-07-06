const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { _electron: electron } = require('playwright');

(async () => {
  const appDir = '/Volumes/sk801/codecollection/lan-share-electron';
  const artifactsDir = path.join(appDir, 'e2e-artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  const shareDir = path.join(os.tmpdir(), 'lan-share-e2e-share');
  fs.mkdirSync(shareDir, { recursive: true });
  fs.writeFileSync(path.join(shareDir, 'hello.txt'), 'hello smb');

  const shareName = `codex_smb_gui_${Date.now().toString().slice(-6)}`;

  const electronApp = await electron.launch({
    args: [appDir],
    cwd: appDir
  });

  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  await window.fill('#dirInput', shareDir);
  await window.fill('#shareNameInput', shareName);

  await window.screenshot({ path: path.join(artifactsDir, 'before-start.png'), fullPage: true });

  await window.click('#startBtn');

  const startResult = { phase: 'start', status: '', urls: [] };

  try {
    await window.waitForFunction(() => {
      const t = document.querySelector('#status')?.textContent || '';
      return t.includes('SMB 共享中') || t.includes('启动失败');
    }, null, { timeout: 30000 });
  } catch {
    // likely waiting on macOS admin auth dialog outside Electron.
  }

  startResult.status = await window.locator('#status').innerText();
  startResult.urls = await window.locator('#urlList .url-item code').allInnerTexts();

  await window.screenshot({ path: path.join(artifactsDir, 'after-start.png'), fullPage: true });

  let stopStatus = '';
  try {
    await window.click('#stopBtn');
    await window.waitForTimeout(2000);
    stopStatus = await window.locator('#status').innerText();
  } catch (e) {
    stopStatus = `stop action failed: ${e.message}`;
  }

  await window.screenshot({ path: path.join(artifactsDir, 'after-stop.png'), fullPage: true });

  const result = {
    shareDir,
    shareName,
    startStatus: startResult.status,
    urls: startResult.urls,
    stopStatus
  };

  fs.writeFileSync(path.join(artifactsDir, 'result.json'), JSON.stringify(result, null, 2));

  await electronApp.close();
  console.log(JSON.stringify(result, null, 2));
})();
