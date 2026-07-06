const dirInput = document.getElementById('dirInput');
const shareNameInput = document.getElementById('shareNameInput');
const chooseDirBtn = document.getElementById('chooseDirBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const urlList = document.getElementById('urlList');

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.background = isError ? '#ffe9e6' : '#f2f6ff';
  statusEl.style.color = isError ? '#a1261b' : '#1a315e';
}

function renderUrls(urls) {
  urlList.innerHTML = '';

  if (!urls || !urls.length) {
    const li = document.createElement('li');
    li.className = 'url-item';
    li.textContent = '服务启动后会在这里显示链接';
    urlList.appendChild(li);
    return;
  }

  for (const url of urls) {
    const li = document.createElement('li');
    li.className = 'url-item';

    const code = document.createElement('code');
    code.textContent = url;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const openBtn = document.createElement('button');
    openBtn.className = 'secondary';
    openBtn.textContent = '打开';
    openBtn.addEventListener('click', () => window.lanShare.openUrl(url));

    const copyBtn = document.createElement('button');
    copyBtn.className = 'secondary';
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(url);
      setStatus(`已复制: ${url}`);
    });

    actions.appendChild(openBtn);
    actions.appendChild(copyBtn);
    li.appendChild(code);
    li.appendChild(actions);
    urlList.appendChild(li);
  }
}

function applyState(state) {
  if (!state?.running) {
    setStatus('未启动（SMB）');
    renderUrls([]);
    return;
  }

  dirInput.value = state.shareDir || dirInput.value;
  shareNameInput.value = state.shareName || shareNameInput.value;
  setStatus(`SMB 共享中: ${state.shareName} -> ${state.shareDir}`);
  renderUrls(state.localUrls || []);
}

chooseDirBtn.addEventListener('click', async () => {
  const result = await window.lanShare.chooseDirectory();
  if (!result?.canceled && result?.path) {
    dirInput.value = result.path;
    if (!shareNameInput.value.trim()) {
      const segments = result.path.split('/').filter(Boolean);
      shareNameInput.value = segments[segments.length - 1] || 'share';
    }
  }
});

startBtn.addEventListener('click', async () => {
  try {
    const shareDir = dirInput.value.trim();
    const shareName = shareNameInput.value.trim();

    if (!shareDir) {
      setStatus('请先选择共享目录', true);
      return;
    }

    setStatus('正在启动 SMB 共享，等待系统授权...');
    const state = await window.lanShare.startSharing({ shareDir, shareName });
    applyState(state);
  } catch (error) {
    setStatus(`启动失败: ${error.message || String(error)}`, true);
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    await window.lanShare.stopSharing();
    applyState({ running: false });
  } catch (error) {
    setStatus(`停止失败: ${error.message || String(error)}`, true);
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  const state = await window.lanShare.getState();
  applyState(state);
});
