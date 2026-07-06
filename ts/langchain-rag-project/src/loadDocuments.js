import { validateConfig } from './config.js';
import { loadAndSplitDocuments } from './documentLoader.js';
import { createVectorStore, saveVectorStore } from './vectorStore.js';

/**
 * 載入文件並建立向量資料庫的主程式
 */
async function main() {
  console.log('🚀 開始建立 RAG 系統...\n');
  
  try {
    // 驗證配置
    validateConfig();
    
    // 載入並分割文件
    const documents = await loadAndSplitDocuments();
    
    if (documents.length === 0) {
      console.log('⚠️  警告: 沒有找到任何文件');
      console.log('請將文件放入 documents/ 目錄中');
      return;
    }
    
    // 建立向量資料庫
    const vectorStore = await createVectorStore(documents);
    
    // 儲存向量資料庫
    await saveVectorStore(vectorStore);
    
    console.log('\n✅ RAG 系統建立完成！');
    console.log('現在可以使用 npm run query 來提問了');
    
  } catch (error) {
    console.error('\n❌ 發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行主程式
main();