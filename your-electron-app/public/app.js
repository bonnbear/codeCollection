// app.js - 前端應用程式邏輯
let socket;
let currentData = [];
let currentEntryId = null;
let isUnlocked = false;

// 初始化 Socket.IO 連線
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('已連線到伺服器');
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('與伺服器斷線');
        updateConnectionStatus(false);
    });
    
    // 監聽即時資料更新
    socket.on('data-updated', (data) => {
        console.log('收到即時資料更新');
        currentData = data;
        renderDataList();
        showAlert('資料已由其他使用者更新', 'info');
    });
}

// 更新連線狀態顯示
function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = '已連線';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = '已斷線';
    }
}

// 顯示提示訊息
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.left-panel');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// 檢查是否設定主密碼
async function checkPassword() {
    try {
        const response = await fetch('/api/check-password');
        const result = await response.json();
        
        if (result.hasPassword) {
            showMasterPasswordModal();
        } else {
            isUnlocked = true;
            await loadData();
        }
    } catch (error) {
        console.error('檢查密碼失敗:', error);
        showAlert('檢查密碼狀態失敗', 'error');
    }
}

// 顯示主密碼輸入視窗
function showMasterPasswordModal() {
    const modal = document.getElementById('master-password-modal');
    const title = document.getElementById('master-password-title');
    const confirmGroup = document.getElementById('confirm-password-group');
    
    title.textContent = '請輸入主密碼';
    confirmGroup.style.display = 'none';
    modal.classList.remove('hidden');
}

// 解鎖資料
async function unlockData(password) {
    try {
        const response = await fetch('/api/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isUnlocked = true;
            document.getElementById('master-password-modal').classList.add('hidden');
            await loadData();
            showAlert('解鎖成功', 'success');
        } else {
            document.getElementById('master-password-error').textContent = result.error || '密碼錯誤';
        }
    } catch (error) {
        console.error('解鎖失敗:', error);
        document.getElementById('master-password-error').textContent = '解鎖失敗';
    }
}

// 載入資料
async function loadData() {
    try {
        const response = await fetch('/api/data');
        const result = await response.json();
        
        if (result.success) {
            currentData = result.data || [];
            renderDataList();
        } else {
            showAlert(result.error || '載入資料失敗', 'error');
        }
    } catch (error) {
        console.error('載入資料失敗:', error);
        showAlert('載入資料失敗', 'error');
    }
}

// 儲存資料
async function saveData() {
    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: currentData })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 通知其他客戶端
            socket.emit('update-data', currentData);
            return true;
        } else {
            showAlert(result.error || '儲存失敗', 'error');
            return false;
        }
    } catch (error) {
        console.error('儲存資料失敗:', error);
        showAlert('儲存資料失敗', 'error');
        return false;
    }
}

// 渲染資料列表
function renderDataList() {
    const dataList = document.getElementById('data-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    const filteredData = currentData.filter(item => 
        item.name.toLowerCase().includes(searchTerm) || 
        item.account.toLowerCase().includes(searchTerm)
    );
    
    if (filteredData.length === 0) {
        dataList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">沒有資料</p>';
        return;
    }
    
    dataList.innerHTML = filteredData.map(item => `
        <div class="data-item" data-id="${item.id}">
            <div>
                <h3>${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.account)}</p>
            </div>
            <div class="item-buttons">
                <button class="details-btn" onclick="showDetails('${item.id}')">詳情</button>
                <button class="edit-btn" onclick="editEntry('${item.id}')">編輯</button>
            </div>
        </div>
    `).join('');
}

// HTML 轉義
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 顯示詳情
function showDetails(id) {
    const entry = currentData.find(item => item.id === id);
    if (!entry) return;
    
    document.getElementById('details-name').textContent = `名稱: ${entry.name}`;
    document.getElementById('details-account').textContent = `帳號: ${entry.account}`;
    document.getElementById('details-password').textContent = `密碼: ${entry.password}`;
    
    const detailsImage = document.getElementById('details-image');
    if (entry.image) {
        detailsImage.src = `/api/images/${entry.image}`;
        detailsImage.style.display = 'block';
        detailsImage.onclick = () => showLightbox(`/api/images/${entry.image}`);
    } else {
        detailsImage.style.display = 'none';
    }
    
    document.getElementById('details-modal').classList.remove('hidden');
}

// 編輯項目
function editEntry(id) {
    const entry = currentData.find(item => item.id === id);
    if (!entry) return;
    
    currentEntryId = id;
    document.getElementById('entry-id').value = id;
    document.getElementById('name').value = entry.name;
    document.getElementById('account').value = entry.account;
    document.getElementById('password').value = entry.password;
    document.getElementById('form-title').textContent = '編輯資料';
    
    // 顯示圖片區域
    const imageSection = document.getElementById('image-section');
    imageSection.classList.remove('hidden');
    
    const entryImage = document.getElementById('entry-image');
    const imagePlaceholder = document.getElementById('image-placeholder');
    
    if (entry.image) {
        entryImage.src = `/api/images/${entry.image}`;
        entryImage.classList.remove('hidden');
        imagePlaceholder.classList.add('hidden');
    } else {
        entryImage.classList.add('hidden');
        imagePlaceholder.classList.remove('hidden');
    }
    
    // 捲動到表單
    document.querySelector('.left-panel').scrollIntoView({ behavior: 'smooth' });
}

// 刪除項目
async function deleteEntry() {
    if (!currentEntryId) {
        showAlert('請先選擇要刪除的項目', 'error');
        return;
    }
    
    if (!confirm('確定要刪除這筆資料嗎?')) {
        return;
    }
    
    const entry = currentData.find(item => item.id === currentEntryId);
    
    // 如果有圖片,先刪除圖片
    if (entry && entry.image) {
        try {
            await fetch(`/api/images/${entry.image}`, { method: 'DELETE' });
        } catch (error) {
            console.error('刪除圖片失敗:', error);
        }
    }
    
    currentData = currentData.filter(item => item.id !== currentEntryId);
    
    if (await saveData()) {
        clearForm();
        renderDataList();
        showAlert('刪除成功', 'success');
    }
}

// 清空表單
function clearForm() {
    currentEntryId = null;
    document.getElementById('entry-id').value = '';
    document.getElementById('name').value = '';
    document.getElementById('account').value = '';
    document.getElementById('password').value = '';
    document.getElementById('form-title').textContent = '新增資料';
    document.getElementById('image-section').classList.add('hidden');
    document.getElementById('entry-image').classList.add('hidden');
    document.getElementById('image-placeholder').classList.remove('hidden');
}

// 上傳圖片
async function uploadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const response = await fetch('/api/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageData: e.target.result,
                        fileName: file.name
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    resolve(result.fileName);
                } else {
                    reject(new Error(result.error));
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 刪除圖片
async function deleteImage() {
    if (!currentEntryId) return;
    
    const entry = currentData.find(item => item.id === currentEntryId);
    if (!entry || !entry.image) return;
    
    try {
        await fetch(`/api/images/${entry.image}`, { method: 'DELETE' });
        entry.image = null;
        
        document.getElementById('entry-image').classList.add('hidden');
        document.getElementById('image-placeholder').classList.remove('hidden');
        
        await saveData();
        showAlert('圖片已刪除', 'success');
    } catch (error) {
        console.error('刪除圖片失敗:', error);
        showAlert('刪除圖片失敗', 'error');
    }
}

// 顯示 Lightbox
function showLightbox(imageSrc) {
    document.getElementById('lightbox-image').src = imageSrc;
    document.getElementById('lightbox').classList.remove('hidden');
}

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 初始化事件監聽器
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    checkPassword();
    
    // 表單提交
    document.getElementById('data-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const account = document.getElementById('account').value;
        const password = document.getElementById('password').value;
        
        if (currentEntryId) {
            // 編輯現有項目
            const entry = currentData.find(item => item.id === currentEntryId);
            if (entry) {
                entry.name = name;
                entry.account = account;
                entry.password = password;
            }
        } else {
            // 新增項目
            currentData.push({
                id: generateId(),
                name,
                account,
                password,
                image: null
            });
        }
        
        if (await saveData()) {
            renderDataList();
            clearForm();
            showAlert(currentEntryId ? '更新成功' : '新增成功', 'success');
        }
    });
    
    // 清空表單按鈕
    document.getElementById('clear-btn').addEventListener('click', clearForm);
    
    // 刪除按鈕
    document.getElementById('delete-btn').addEventListener('click', deleteEntry);
    
    // 搜尋
    document.getElementById('search-input').addEventListener('input', renderDataList);
    
    // 圖片相關
    document.getElementById('import-image-btn').addEventListener('click', () => {
        document.getElementById('image-file-input').click();
    });
    
    document.getElementById('image-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!currentEntryId) {
            showAlert('請先選擇或建立一個項目', 'error');
            return;
        }
        
        try {
            const fileName = await uploadImage(file);
            const entry = currentData.find(item => item.id === currentEntryId);
            if (entry) {
                // 刪除舊圖片
                if (entry.image) {
                    await fetch(`/api/images/${entry.image}`, { method: 'DELETE' });
                }
                entry.image = fileName;
                await saveData();
                
                document.getElementById('entry-image').src = `/api/images/${fileName}`;
                document.getElementById('entry-image').classList.remove('hidden');
                document.getElementById('image-placeholder').classList.add('hidden');
                
                showAlert('圖片上傳成功', 'success');
            }
        } catch (error) {
            console.error('上傳圖片失敗:', error);
            showAlert('上傳圖片失敗', 'error');
        }
    });
    
    document.getElementById('delete-image-btn').addEventListener('click', deleteImage);
    
    document.getElementById('entry-image').addEventListener('click', function() {
        if (this.src) {
            showLightbox(this.src);
        }
    });
    
    // Lightbox 關閉
    document.getElementById('lightbox-close').addEventListener('click', () => {
        document.getElementById('lightbox').classList.add('hidden');
    });
    
    document.getElementById('lightbox').addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            document.getElementById('lightbox').classList.add('hidden');
        }
    });
    
    // 詳情視窗
    document.getElementById('close-details-btn').addEventListener('click', () => {
        document.getElementById('details-modal').classList.add('hidden');
    });
    
    document.getElementById('copy-password-btn').addEventListener('click', () => {
        const password = document.getElementById('details-password').textContent.replace('密碼: ', '');
        navigator.clipboard.writeText(password).then(() => {
            showAlert('密碼已複製', 'success');
        });
    });
    
    // 主密碼表單
    document.getElementById('master-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('master-password-input').value;
        await unlockData(password);
    });
    
    // 設定按鈕
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('hidden');
    });
    
    document.getElementById('close-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('hidden');
    });
    
    // 設定主密碼
    document.getElementById('set-password-btn').addEventListener('click', async () => {
        const password = prompt('請輸入新的主密碼:');
        if (!password) return;
        
        const confirm = prompt('請再次輸入密碼確認:');
        if (password !== confirm) {
            showAlert('兩次輸入的密碼不一致', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            const result = await response.json();
            if (result.success) {
                showAlert('主密碼設定成功', 'success');
                document.getElementById('settings-modal').classList.add('hidden');
            } else {
                showAlert(result.error || '設定失敗', 'error');
            }
        } catch (error) {
            console.error('設定主密碼失敗:', error);
            showAlert('設定主密碼失敗', 'error');
        }
    });
    
    // 移除主密碼
    document.getElementById('remove-password-btn').addEventListener('click', async () => {
        const password = prompt('請輸入目前的主密碼以確認移除:');
        if (!password) return;
        
        try {
            const response = await fetch('/api/remove-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            const result = await response.json();
            if (result.success) {
                showAlert('主密碼已移除', 'success');
                document.getElementById('settings-modal').classList.add('hidden');
            } else {
                showAlert(result.error || '移除失敗', 'error');
            }
        } catch (error) {
            console.error('移除主密碼失敗:', error);
            showAlert('移除主密碼失敗', 'error');
        }
    });
});