import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { config } from './config.js';

/**
 * 載入指定目錄中的所有文件
 * 支援 .txt 和 .pdf 格式
 */
export async function loadDocuments() {
  console.log('📂 開始載入文件...');
  
  try {
    // 建立目錄載入器，支援多種文件格式
    const loader = new DirectoryLoader(
      config.paths.documents,
      {
        '.txt': (path) => new TextLoader(path),
        '.pdf': (path) => new PDFLoader(path),
      }
    );

    // 載入所有文件
    const docs = await loader.load();
    console.log(`✓ 成功載入 ${docs.length} 個文件`);
    
    return docs;
  } catch (error) {
    console.error('✗ 載入文件時發生錯誤:', error.message);
    throw error;
  }
}

/**
 * 將文件分割成較小的區塊
 * 這對於提高檢索效率和準確性很重要
 */
export async function splitDocuments(docs) {
  console.log('✂️  開始分割文件...');
  
  try {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.rag.chunkSize,
      chunkOverlap: config.rag.chunkOverlap,
    });

    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`✓ 文件已分割成 ${splitDocs.length} 個區塊`);
    
    return splitDocs;
  } catch (error) {
    console.error('✗ 分割文件時發生錯誤:', error.message);
    throw error;
  }
}

/**
 * 載入並處理文件的完整流程
 */
export async function loadAndSplitDocuments() {
  const docs = await loadDocuments();
  const splitDocs = await splitDocuments(docs);
  return splitDocs;
}