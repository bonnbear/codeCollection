// 应用状态
const state = {
    files: [],
    outputDir: '',
    isConverting: false
};

// DOM 元素
const elements = {
    soxWarning: document.getElementById('sox-warning'),
    dropZone: document.getElementById('drop-zone'),
    fileListContainer: document.getElementById('file-list-container'),
    fileList: document.getElementById('file-list'),
    clearFiles: document.getElementById('clear-files'),
    addMoreFiles: document.getElementById('add-more-files'),
    settingsPanel: document.getElementById('settings-panel'),
    outputFormat: document.getElementById('output-format'),
    sampleRate: document.getElementById('sample-rate'),
    channels: document.getElementById('channels'),
    bitrateGroup: document.getElementById('bitrate-group'),
    bitrate: document.getElementById('bitrate'),
    outputDir: document.getElementById('output-dir'),
    selectOutputDir: document.getElementById('select-output-dir'),
    convertBtn: document.getElementById('convert-btn'),
    progressSection: document.getElementById('progress-section'),
    progressText: document.getElementById('progress-text'),
    progressCount: document.getElementById('progress-count'),
    progressFill: document.getElementById('progress-fill'),
    currentFile: document.getElementById('current-file'),
    resultsSection: document.getElementById('results-section'),
    resultsSummary: document.getElementById('results-summary'),
    openOutputDir: document.getElementById('open-output-dir'),
    convertMore: document.getElementById('convert-more')
};

// 初始化
async function init() {
    // 检查 Sox
    const soxAvailable = await window.audioAPI.checkSox();
    if (!soxAvailable) {
        elements.soxWarning.classList.remove('hidden');
    }

    // 设置默认输出目录为桌面
    state.outputDir = '';

    // 绑定事件
    bindEvents();
}

// 事件绑定
function bindEvents() {
    // 拖放事件
    elements.dropZone.addEventListener('click', selectFiles);
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);

    // 文件操作
    elements.clearFiles.addEventListener('click', clearFiles);
    elements.addMoreFiles.addEventListener('click', selectFiles);

    // 设置
    elements.outputFormat.addEventListener('change', handleFormatChange);
    elements.selectOutputDir.addEventListener('click', selectOutputDir);

    // 转换
    elements.convertBtn.addEventListener('click', startConversion);

    // 结果操作
    elements.convertMore.addEventListener('click', resetUI);

    // 批量进度回调
    window.audioAPI.onBatchProgress(handleBatchProgress);
}

// 拖放处理
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    const audioPaths = files
        .filter(f => /\.(mp3|wav|flac|ogg|aac|aiff|wma|m4a)$/i.test(f.name))
        .map(f => f.path);

    if (audioPaths.length > 0) {
        addFiles(audioPaths);
    }
}

// 选择文件
async function selectFiles() {
    const filePaths = await window.audioAPI.selectFiles();
    if (filePaths.length > 0) {
        addFiles(filePaths);
    }
}

// 添加文件
function addFiles(paths) {
    paths.forEach(path => {
        if (!state.files.includes(path)) {
            state.files.push(path);
        }
    });
    updateFileList();
    showSettingsPanel();
}

// 更新文件列表 UI
function updateFileList() {
    elements.fileList.innerHTML = '';

    state.files.forEach((filePath, index) => {
        const fileName = filePath.split('/').pop();
        const ext = fileName.split('.').pop().toUpperCase();

        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
      <span class="file-icon">🎵</span>
      <div class="file-info">
        <div class="file-name">${fileName}</div>
        <div class="file-meta">${ext}</div>
      </div>
      <button class="remove-file" data-index="${index}">✕</button>
    `;

        li.querySelector('.remove-file').addEventListener('click', () => removeFile(index));
        elements.fileList.appendChild(li);
    });

    elements.fileListContainer.classList.toggle('hidden', state.files.length === 0);

    if (state.files.length === 0) {
        hideSettingsPanel();
    }
}

// 移除文件
function removeFile(index) {
    state.files.splice(index, 1);
    updateFileList();
}

// 清空文件
function clearFiles() {
    state.files = [];
    updateFileList();
}

// 显示设置面板
function showSettingsPanel() {
    elements.settingsPanel.classList.remove('hidden');
    elements.convertBtn.classList.remove('hidden');
}

// 隐藏设置面板
function hideSettingsPanel() {
    elements.settingsPanel.classList.add('hidden');
    elements.convertBtn.classList.add('hidden');
}

// 格式变化处理
function handleFormatChange() {
    const format = elements.outputFormat.value;
    elements.bitrateGroup.style.display = format === 'mp3' ? 'flex' : 'none';
}

// 选择输出目录
async function selectOutputDir() {
    const dir = await window.audioAPI.selectOutputDir();
    if (dir) {
        state.outputDir = dir;
        elements.outputDir.value = dir;
    }
}

// 开始转换
async function startConversion() {
    if (state.files.length === 0) return;

    if (!state.outputDir) {
        await selectOutputDir();
        if (!state.outputDir) return;
    }

    state.isConverting = true;

    // 显示进度
    elements.fileListContainer.classList.add('hidden');
    elements.settingsPanel.classList.add('hidden');
    elements.convertBtn.classList.add('hidden');
    elements.progressSection.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');

    // 获取设置
    const options = {
        files: state.files,
        outputDir: state.outputDir,
        outputFormat: elements.outputFormat.value,
        sampleRate: elements.sampleRate.value || null,
        channels: elements.channels.value || null,
        bitrate: elements.bitrate.value || null
    };

    try {
        const results = await window.audioAPI.convertBatch(options);
        showResults(results);
    } catch (error) {
        alert('转换出错: ' + error.message);
        resetUI();
    }

    state.isConverting = false;
}

// 处理批量进度
function handleBatchProgress(data) {
    const { current, total, file } = data;
    const percent = (current / total) * 100;

    elements.progressCount.textContent = `${current}/${total}`;
    elements.progressFill.style.width = `${percent}%`;
    elements.currentFile.textContent = file.split('/').pop();
}

// 显示结果
function showResults(results) {
    elements.progressSection.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    let summary = `成功转换 ${successCount} 个文件`;
    if (failCount > 0) {
        summary += `，${failCount} 个失败`;
    }

    elements.resultsSummary.textContent = summary;
}

// 重置 UI
function resetUI() {
    state.files = [];
    elements.fileListContainer.classList.add('hidden');
    elements.settingsPanel.classList.add('hidden');
    elements.convertBtn.classList.add('hidden');
    elements.progressSection.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.progressFill.style.width = '0%';
    updateFileList();
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', init);
