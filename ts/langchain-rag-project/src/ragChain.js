import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from './config.js';
import { searchSimilarDocuments } from './vectorStore.js';

/**
 * 建立 RAG 提示詞範本
 */
const RAG_PROMPT_TEMPLATE = `你是一個專業的問答助手。請根據以下提供的上下文資訊來回答使用者的問題。

上下文資訊：
{context}

使用者問題：{question}

請根據上下文資訊提供準確、詳細的回答。如果上下文中沒有相關資訊，請誠實地說明你不知道，不要編造答案。

回答：`;

/**
 * 建立 ChatOpenAI 模型實例
 */
function createChatModel() {
  return new ChatOpenAI({
    openAIApiKey: config.openai.apiKey,
    modelName: config.openai.model,
    temperature: 0.7,
  });
}

/**
 * 建立 RAG Chain
 */
export function createRAGChain(vectorStore) {
  const model = createChatModel();
  const prompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);
  
  // 建立 RAG 鏈
  const chain = RunnableSequence.from([
    {
      context: async (input) => {
        // 從向量資料庫檢索相關文件
        const relevantDocs = await searchSimilarDocuments(vectorStore, input.question);
        // 將文件內容合併成上下文
        return relevantDocs.map(doc => doc.pageContent).join('\n\n');
      },
      question: (input) => input.question,
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);
  
  return chain;
}

/**
 * 使用 RAG 系統回答問題（串流模式）
 */
export async function askQuestion(chain, question) {
  console.log('\n❓ 問題:', question);
  console.log('🤔 思考中...\n');
  
  try {
    const stream = await chain.stream({ question });
    process.stdout.write('💡 回答: ');
    return stream;
  } catch (error) {
    console.error('✗ 回答問題時發生錯誤:', error.message);
    throw error;
  }
}

/**
 * 顯示相關文件（用於除錯）
 */
export async function showRelevantDocuments(vectorStore, question) {
  console.log('\n📚 檢索相關文件...');
  
  try {
    const docs = await searchSimilarDocuments(vectorStore, question);
    
    console.log(`\n找到 ${docs.length} 個相關文件片段：\n`);
    docs.forEach((doc, index) => {
      console.log(`--- 文件片段 ${index + 1} ---`);
      console.log(doc.pageContent.substring(0, 200) + '...');
      console.log('');
    });
  } catch (error) {
    console.error('✗ 檢索文件時發生錯誤:', error.message);
    throw error;
  }
}