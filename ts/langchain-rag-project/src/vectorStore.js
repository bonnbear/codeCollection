import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from './config.js';
import { existsSync } from 'fs';

/**
 * 建立 OpenAI Embeddings 實例
 */
function createEmbeddings() {
  return new OpenAIEmbeddings({
    openAIApiKey: config.openai.apiKey,
    modelName: config.openai.embeddingModel,
  });
}

/**
 * 從文件建立新的向量資料庫
 */
export async function createVectorStore(documents) {
  console.log('🔨 建立向量資料庫...');
  
  try {
    const embeddings = createEmbeddings();
    const vectorStore = await FaissStore.fromDocuments(documents, embeddings);
    
    console.log('✓ 向量資料庫建立成功');
    return vectorStore;
  } catch (error) {
    console.error('✗ 建立向量資料庫時發生錯誤:', error.message);
    throw error;
  }
}

/**
 * 儲存向量資料庫到磁碟
 */
export async function saveVectorStore(vectorStore) {
  console.log('💾 儲存向量資料庫...');
  
  try {
    await vectorStore.save(config.paths.vectorStore);
    console.log(`✓ 向量資料庫已儲存至: ${config.paths.vectorStore}`);
  } catch (error) {
    console.error('✗ 儲存向量資料庫時發生錯誤:', error.message);
    throw error;
  }
}

/**
 * 從磁碟載入向量資料庫
 */
export async function loadVectorStore() {
  console.log('📥 載入向量資料庫...');
  
  try {
    if (!existsSync(config.paths.vectorStore)) {
      throw new Error(`向量資料庫不存在: ${config.paths.vectorStore}`);
    }
    
    const embeddings = createEmbeddings();
    const vectorStore = await FaissStore.load(config.paths.vectorStore, embeddings);
    
    console.log('✓ 向量資料庫載入成功');
    return vectorStore;
  } catch (error) {
    console.error('✗ 載入向量資料庫時發生錯誤:', error.message);
    throw error;
  }
}

/**
 * 檢查向量資料庫是否存在
 */
export function vectorStoreExists() {
  return existsSync(config.paths.vectorStore);
}

/**
 * 在向量資料庫中搜尋相似文件
 */
export async function searchSimilarDocuments(vectorStore, query, k = null) {
  const topK = k || config.rag.topK;
  
  try {
    const results = await vectorStore.similaritySearch(query, topK);
    return results;
  } catch (error) {
    console.error('✗ 搜尋文件時發生錯誤:', error.message);
    throw error;
  }
}