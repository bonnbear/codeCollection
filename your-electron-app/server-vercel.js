// server-vercel.js - Vercel 專用伺服器 (使用 MongoDB)
const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('./crypto');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

// MongoDB 連線設定
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
let db;

async function connectDB() {
    if (db) return db;
    if (!uri) {
        console.error("MONGODB_URI is not set. Using in-memory store.");
        return null;
    }
    try {
        await client.connect();
        db = client.db("info-manager"); // 預設資料庫名稱
        console.log("Successfully connected to MongoDB.");
        return db;
    } catch (e) {
        console.error("Failed to connect to MongoDB:", e);
        return null;
    }
}

// 中介軟體設定
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Session 設定
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// 資料庫連線中介軟體
app.use(async (req, res, next) => {
    req.db = await connectDB();
    next();
});

// 輔助函式：取得 meta 資料
async function getMeta(db) {
    if (!db) return {};
    const metaCollection = db.collection('meta');
    const metaDoc = await metaCollection.findOne({ _id: 'meta' });
    return metaDoc || {};
}

// 輔助函式：儲存 meta 資料
async function saveMeta(db, meta) {
    if (!db) return;
    const metaCollection = db.collection('meta');
    await metaCollection.updateOne(
        { _id: 'meta' },
        { $set: meta },
        { upsert: true }
    );
}

// 輔助函式：取得資料
async function getData(db) {
    if (!db) return [];
    const dataCollection = db.collection('data');
    const dataDocs = await dataCollection.find({}).toArray();
    return dataDocs.map(doc => doc.encryptedData);
}

// 輔助函式：儲存資料
async function saveData(db, data) {
    if (!db) return;
    const dataCollection = db.collection('data');
    // 為了簡化，我們假設 data 是一個包含加密字串的陣列
    // 每次更新都清空並重寫，這對於 Vercel 的無狀態環境是可接受的
    await dataCollection.deleteMany({});
    if (data.length > 0) {
        const docs = data.map(encryptedData => ({ encryptedData }));
        await dataCollection.insertMany(docs);
    }
}

// API 路由

// 檢查是否設定密碼
app.get('/api/check-password', async (req, res) => {
    try {
        const meta = await getMeta(req.db);
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
        
        const passwordHash = await crypto.hashPassword(password);
        await saveMeta(req.db, { passwordHash });
        
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
        const meta = await getMeta(req.db);
        
        if (!meta.passwordHash) {
            return res.json({ success: true });
        }
        
        const isValid = await crypto.verifyPassword(password, meta.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: '密碼錯誤' });
        }
        
        await saveMeta(req.db, { passwordHash: null });
        delete req.session.password;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 驗證密碼
app.post('/api/unlock', async (req, res) => {
    try {
        const { password } = req.body;
        const meta = await getMeta(req.db);
        
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
        const data = await getData(req.db);
        res.json({ success: true, data: data || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 儲存資料
app.post('/api/data', async (req, res) => {
    try {
        const { data } = req.body;
        await saveData(req.db, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 上傳圖片 (Base64 儲存在資料中)
app.post('/api/upload-image', async (req, res) => {
    try {
        const { imageData, fileName } = req.body;
        
        if (!imageData) {
            return res.status(400).json({ error: '沒有圖片資料' });
        }
        
        // 在 Vercel 上,圖片以 Base64 格式儲存在資料中
        const finalFileName = fileName || `image-${Date.now()}.png`;
        
        res.json({ 
            success: true, 
            fileName: finalFileName,
            imageData: imageData // 返回 Base64 資料
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 健康檢查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        storage: req.db ? 'mongodb' : 'in-memory (MONGODB_URI missing)',
        note: req.db ? 'Data is persistent via MongoDB.' : 'Data will be lost on restart. Set MONGODB_URI for persistence.'
    });
});

// 根路徑
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Vercel 需要導出 app
module.exports = app;

// 本地開發
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Vercel 版本伺服器運行於 http://localhost:${PORT}`);
        console.log(`資料儲存: ${uri ? 'MongoDB' : '記憶體 (請設定 MONGODB_URI)'}`);
    });
}