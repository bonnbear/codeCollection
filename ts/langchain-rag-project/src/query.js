import readline from 'readline';
import { validateConfig } from './config.js';
import { loadVectorStore, vectorStoreExists } from './vectorStore.js';
import { createRAGChain, askQuestion, showRelevantDocuments } from './ragChain.js';

/**
 * 建立提問介面
 */
function createQuestionInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    question: (query) => new Promise((resolve) => rl.question(query, resolve)),
    close: () => rl.close(),
  };
}

/**
 * 互動式問答主程式
 */
async function main() {
  console.log('🤖 LangChain RAG 問答系統\n');
  
  try {
    // 驗證配置
    validateConfig();
    
    // 檢查向量資料庫是否存在
    if (!vectorStoreExists()) {
      console.log('❌ 向量資料庫不存在');
      console.log('請先執行 npm run load-docs 來建立向量資料庫');
      process.exit(1);
    }
    
    // 載入向量資料庫
    const vectorStore = await loadVectorStore();
    
    // 建立 RAG Chain
    const chain = createRAGChain(vectorStore);
    
    console.log('✅ 系統已就緒！\n');
    console.log('指令說明：');
    console.log('  - 直接輸入問題來提問');
    console.log('  - 輸入 "docs: 你的問題" 來查看相關文件');
    console.log('  - 輸入 "exit" 或 "quit" 來退出\n');
    console.log('='.repeat(80) + '\n');
    
    // 建立提問介面
    const cli = createQuestionInterface();
    
    // 使用 while 迴圈進行提問
    while (true) {
      const input = await cli.question('💬 請輸入您的問題: ');
      const question = input.trim();
      
      // 檢查退出指令
      if (question.toLowerCase() === 'exit' || question.toLowerCase() === 'quit') {
        console.log('\n👋 再見！');
        cli.close();
        break;
      }
      
      // 檢查是否為空
      if (!question) {
        continue;
      }
      
      try {
        // 檢查是否要顯示相關文件
        if (question.toLowerCase().startsWith('docs:')) {
          const actualQuestion = question.substring(5).trim();
          await showRelevantDocuments(vectorStore, actualQuestion);
        } else {
          // 正常問答（串流模式）
          const stream = await askQuestion(chain, question);
          for await (const chunk of stream) {
            process.stdout.write(chunk);
          }
          console.log('\n' + '='.repeat(80) + '\n');
        }
      } catch (error) {
        console.error('❌ 發生錯誤:', error.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ 發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行主程式
main();