const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB 配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/info-manager';
const DB_NAME = 'info-manager';
const COLLECTION_NAME = 'entries';

let db;

// 初始化資料庫連接
const connectDB = async () => {
    if (db) return db;

    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('Connected to MongoDB');
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// 中介軟體
app.use(cors()); // 允許跨域
app.use(express.json({ limit: '10mb' })); // 解析 JSON 請求體，並增加圖片大小限制

// 在每個請求中確保資料庫連接
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({ message: 'Database connection failed' });
    }
});

// --- API 路由 ---

// GET /api/entries - 獲取所有資料
app.get('/api/entries', async (req, res) => {
    try {
        const collection = db.collection(COLLECTION_NAME);
        const entries = await collection.find({}).toArray();
        // 將 MongoDB 的 _id 轉換為前端使用的 id
        const formattedEntries = entries.map(entry => ({
            id: entry._id.toString(),
            ...entry,
            _id: undefined
        }));
        res.json(formattedEntries);
    } catch (error) {
        console.error('GET /api/entries error:', error);
        res.status(500).json({ message: 'Failed to fetch entries' });
    }
});

// POST /api/entries - 新增一筆資料
app.post('/api/entries', async (req, res) => {
    try {
        const collection = db.collection(COLLECTION_NAME);
        const result = await collection.insertOne(req.body);
        const newEntry = {
            id: result.insertedId.toString(),
            ...req.body
        };
        res.status(201).json(newEntry);
    } catch (error) {
        console.error('POST /api/entries error:', error);
        res.status(500).json({ message: 'Failed to create entry' });
    }
});

// PUT /api/entries/:id - 更新一筆資料
app.put('/api/entries/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    try {
        const collection = db.collection(COLLECTION_NAME);
        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ message: 'Entry not found' });
        }
        
        const updatedEntry = {
            id: result._id.toString(),
            ...result,
            _id: undefined
        };
        res.json(updatedEntry);
    } catch (error) {
        console.error('PUT /api/entries/:id error:', error);
        res.status(500).json({ message: 'Failed to update entry' });
    }
});

// DELETE /api/entries/:id - 刪除一筆資料
app.delete('/api/entries/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const collection = db.collection(COLLECTION_NAME);
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        res.status(204).send(); // 204 No Content
    } catch (error) {
        console.error('DELETE /api/entries/:id error:', error);
        res.status(500).json({ message: 'Failed to delete entry' });
    }
});

// 為了讓 Vercel 能將其作為 Serverless Function 運行
module.exports = app;

// 僅在本地開發時監聽端口
if (process.env.NODE_ENV !== 'production') {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Backend server is running on http://localhost:${PORT}`);
        });
    }).catch(err => {
        console.error('Failed to start server:', err);
    });
}