// server.js - Web 伺服器主程式
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const crypto = require('./crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 中介軟體設定
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Session 設定
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // 在生產環境中使用 HTTPS 時設為 true
        maxAge: 24 * 60 * 60 * 1000 // 24 小時
    }
}));

// 資料檔案路徑
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const META_FILE = path.join(DATA_DIR, 'meta.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

// 確保資料目錄存在
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(IMAGES_DIR, { recursive: true });
    } catch (error) {
        console.error('建立資料目錄失敗:', error);
    }
}

// 讀取 meta 資料
async function readMeta() {
    try {
        const data = await fs.readFile(META_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        throw error;
    }
}

// 寫入 meta 資料
async function writeMeta(meta) {
    await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2));
}

// 讀取資料
async function readData(password = null) {
    try {
        const meta = await readMeta();
        const fileContent = await fs.readFile(DATA_FILE, 'utf8');
        
        if (!meta.passwordHash) {
            return JSON.parse(fileContent);
        }
        
        if (!password) {
            throw new Error('需要密碼');
        }
        
        const isValid = await crypto.verifyPassword(password, meta.passwordHash);
        if (!isValid) {
            throw new Error('密碼錯誤');
        }
        
        const decryptedData = crypto.decryptData(fileContent, password);
        return JSON.parse(decryptedData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// 儲存資料
async function saveData(data, password = null) {
    const meta = await readMeta();
    let dataToSave = JSON.stringify(data, null, 2);
    
    if (meta.passwordHash) {
        if (!password) {
            throw new Error('需要密碼');
        }
        const isValid = await crypto.verifyPassword(password, meta.passwordHash);
        if (!isValid) {
            throw new Error('密碼錯誤');
        }
        dataToSave = crypto.encryptData(dataToSave, password);
    }
    
    await fs.writeFile(DATA_FILE, dataToSave);
}

// API 路由

// 檢查是否設定密碼
app.get('/api/check-password', async (req, res) => {
    try {
        const meta = await readMeta();
        res.json({ hasPassword: !!meta.passwordHash });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 設定主密碼
app.post('/api/set-password', async (req, res) => {
    try {
        const { password, oldPassword } = req.body;
        if (!password) {
            return res.status(400).json({ error: '密碼不能為空' });
        }
        
        const meta = await readMeta();
        let data = [];
        
        try {
            data = await readData(oldPassword);
        } catch (e) {
            // 忽略讀取錯誤
        }
        
        const passwordHash = await crypto.hashPassword(password);
        const encryptedData = crypto.encryptData(JSON.stringify(data), password);
        
        await fs.writeFile(DATA_FILE, encryptedData);
        await writeMeta({ passwordHash });
        
        req.session.password = password;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 移除主密碼
app.post('/api/remove-password', async (req, res) => {
    try {
        const { password } = req.body;
        const meta = await readMeta();
        
        if (!meta.passwordHash) {
            return res.json({ success: true });
        }
        
        const isValid = await crypto.verifyPassword(password, meta.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: '密碼錯誤' });
        }
        
        const data = await readData(password);
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        await writeMeta({ passwordHash: null });
        
        delete req.session.password;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 驗證密碼並建立 session
app.post('/api/unlock', async (req, res) => {
    try {
        const { password } = req.body;
        const meta = await readMeta();
        
        if (!meta.passwordHash) {
            return res.json({ success: true });
        }
        
        const isValid = await crypto.verifyPassword(password, meta.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: '密碼錯誤' });
        }
        
        req.session.password = password;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 取得資料
app.get('/api/data', async (req, res) => {
    try {
        const password = req.session.password;
        const data = await readData(password);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 儲存資料
app.post('/api/data', async (req, res) => {
    try {
        const { data } = req.body;
        const password = req.session.password;
        await saveData(data, password);
        
        // 廣播更新給所有連線的客戶端
        io.emit('data-updated', data);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 上傳圖片
app.post('/api/upload-image', async (req, res) => {
    try {
        const { imageData, fileName } = req.body;
        
        if (!imageData) {
            return res.status(400).json({ error: '沒有圖片資料' });
        }
        
        // 移除 data URL 前綴
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const finalFileName = fileName || `image-${Date.now()}.png`;
        const filePath = path.join(IMAGES_DIR, finalFileName);
        
        await fs.writeFile(filePath, buffer);
        
        res.json({ success: true, fileName: finalFileName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 取得圖片
app.get('/api/images/:fileName', async (req, res) => {
    try {
        const filePath = path.join(IMAGES_DIR, req.params.fileName);
        res.sendFile(filePath);
    } catch (error) {
        res.status(404).json({ error: '圖片不存在' });
    }
});

// 刪除圖片
app.delete('/api/images/:fileName', async (req, res) => {
    try {
        const filePath = path.join(IMAGES_DIR, req.params.fileName);
        await fs.unlink(filePath);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket 連線處理
io.on('connection', (socket) => {
    console.log('新客戶端連線:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('客戶端斷線:', socket.id);
    });
    
    // 即時資料更新
    socket.on('update-data', async (data) => {
        try {
            // 廣播給其他客戶端
            socket.broadcast.emit('data-updated', data);
        } catch (error) {
            console.error('廣播資料更新失敗:', error);
        }
    });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;

ensureDataDir().then(() => {
    server.listen(PORT, () => {
        console.log(`伺服器運行於 http://localhost:${PORT}`);
    });
});