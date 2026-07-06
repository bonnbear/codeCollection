import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 載入環境變數
dotenv.config();

// 取得當前檔案的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置物件
export const config = {
  // OpenAI 設定
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
  },
  
  // 路徑設定
  paths: {
    documents: join(__dirname, '../documents'),
    vectorStore: process.env.VECTOR_STORE_PATH || join(__dirname, '../data/vectorstore'),
  },
  
  // RAG 設定
  rag: {
    chunkSize: 1000,
    chunkOverlap: 200,
    topK: 4, // 檢索時返回的最相關文件數量
  },
};

// 驗證必要的環境變數
export function validateConfig() {
  if (!config.openai.apiKey) {
    throw new Error('請在 .env 檔案中設定 OPENAI_API_KEY');
  }
  console.log('✓ 配置驗證成功');
}