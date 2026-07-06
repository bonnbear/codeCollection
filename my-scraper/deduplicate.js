const fs = require('fs');
const path = require('path');

// 直接在這裡定義要處理的目錄路徑
const targetDirectory = './your-folder-path'; // 修改為你的目錄路徑

/**
 * 從文件名中提取編碼（字母3-4位+數字3位組合）
 * @param {string} filename - 文件名
 * @returns {string|null} 標準化後的編碼，如果沒有则返回 null
 */
function extractCode(filename) {
  // 移除副檔名
  const nameWithoutExt = path.parse(filename).name;

  // 嘗試匹配各種字母數字組合格式
  const patterns = [
    // 字母3-4位 + 分隔符 + 數字3位
    /([A-Z]{3,4})[\s\-_\.]*(\d{3})/i,
    // 數字3位 + 分隔符 + 字母3-4位
    /(\d{3})[\s\-_\.]*([A-Z]{3,4})/i,
    // 字母3-4位數字3位直接連接
    /([A-Z]{3,4}\d{3})/i,
    // 數字3位字母3-4位直接連接
    /(\d{3}[A-Z]{3,4})/i,
  ];

  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      // 提取匹配的部分
      let extracted = match[0];

      // 標準化：移除所有非字母數字字符，轉為大寫
      let normalized = extracted.replace(/[^a-z0-9]/gi, '').toUpperCase();

      // 驗證格式：必須有3位數字和3-4位字母
      const hasThreeDigits = /\d{3}/.test(normalized);
      const hasThreeOrFourLetters = /[A-Z]{3,4}/.test(normalized);

      if (hasThreeDigits && hasThreeOrFourLetters) {
        // 統一格式：字母在前，數字在後
        const letters = normalized.match(/[A-Z]+/)[0];
        const digits = normalized.match(/\d+/)[0];

        // 只取3位數字和3-4位字母
        const finalLetters = letters.substring(0, 4);
        const finalDigits = digits.substring(0, 3);

        return finalLetters + finalDigits;
      }
    }
  }

  return null;
}

/**
 * 安全地移動文件，如果目標已存在則自動重命名
 * @param {string} sourcePath - 源文件路徑
 * @param {string} targetDir - 目標目錄
 * @param {string} fileName - 文件名
 * @returns {boolean} 是否成功移動
 */
function safeMove(sourcePath, targetDir, fileName) {
  let targetPath = path.join(targetDir, fileName);
  
  // 檢查目標文件是否已存在
  if (fs.existsSync(targetPath)) {
    // 如果存在，添加時間戳
    const timestamp = Date.now();
    const parsed = path.parse(fileName);
    const newFileName = `${parsed.name}_${timestamp}${parsed.ext}`;
    targetPath = path.join(targetDir, newFileName);
    console.log(`     ⚠ 目標已存在，重命名為：${newFileName}`);
  }
  
  try {
    fs.renameSync(sourcePath, targetPath);
    return true;
  } catch (err) {
    console.error(`     ❌ 移動失敗：${err.message}`);
    return false;
  }
}

/**
 * 根據編碼數字刪除重複檔案，保留文件大小最大的
 * @param {string} directory - 要處理的目錄路徑
 */
function deduplicateByCode(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    console.error(`錯誤：找不到目錄 ${directory}`);
    return;
  }

  // 定義並創建"待刪除"文件夾
  const toDeleteFolder = path.join(directory, '_TO_DELETE');
  if (!fs.existsSync(toDeleteFolder)) {
    try {
      fs.mkdirSync(toDeleteFolder);
      console.log(`✓ 已創建"待刪除"文件夾：${toDeleteFolder}\n`);
    } catch (err) {
      console.error(`錯誤：無法創建"待刪除"文件夾：${err.message}`);
      return;
    }
  } else {
    console.log(`✓ "待刪除"文件夾已存在：${toDeleteFolder}\n`);
  }

  console.log(`開始處理目錄：${directory}`);
  console.log('='.repeat(60));

  const files = fs.readdirSync(directory);
  const codeMap = new Map(); // 編碼 -> [{filePath, size}, ...]
  const skippedFiles = [];

  // 第一步：收集所有文件信息
  console.log('\n【第一步】掃描並提取文件編碼：');
  for (const file of files) {
    const filePath = path.join(directory, file);

    // 跳過 _TO_DELETE 文件夾
    if (file === '_TO_DELETE') {
      continue;
    }

    try {
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        const code = extractCode(file);

        if (code) {
          if (!codeMap.has(code)) {
            codeMap.set(code, []);
          }
          codeMap.get(code).push({
            filePath: filePath,
            fileName: file,
            size: stat.size
          });
          console.log(`✓ "${file}"`);
          console.log(`  → 編碼：${code} | 大小：${formatSize(stat.size)}`);
        } else {
          skippedFiles.push(file);
        }
      }
    } catch (err) {
      console.error(`⚠ 無法讀取文件 "${file}"：${err.message}`);
      skippedFiles.push(file);
    }
  }

  if (skippedFiles.length > 0) {
    console.log(`\n⚠ 跳過 ${skippedFiles.length} 個無法提取編碼的文件：`);
    skippedFiles.forEach(file => console.log(`  - ${file}`));
  }

  // 第二步：顯示分組情況
  console.log('\n' + '='.repeat(60));
  console.log('【第二步】重複文件分組：');
  console.log('='.repeat(60));

  let groupCount = 0;
  for (const [code, fileList] of codeMap.entries()) {
    if (fileList.length > 1) {
      groupCount++;
      console.log(`\n📁 群組 ${groupCount} - 編碼：${code} (${fileList.length} 個文件)`);
      fileList.sort((a, b) => b.size - a.size); // 先排序以便顯示
      fileList.forEach((file, index) => {
        const tag = index === 0 ? '[保留]' : '[移動]';
        console.log(`   ${tag} ${file.fileName} - ${formatSize(file.size)}`);
      });
    }
  }

  if (groupCount === 0) {
    console.log('\n✓ 沒有發現重複文件！');
    return;
  }

  // 第三步：處理每組相同編碼的文件
  console.log('\n' + '='.repeat(60));
  console.log('【第三步】執行去重操作：');
  console.log('='.repeat(60));

  let movedCount = 0;
  let savedSpace = 0;

  for (const [code, fileList] of codeMap.entries()) {
    if (fileList.length > 1) {
      console.log(`\n處理編碼 ${code}：`);

      // 按文件大小降序排序
      fileList.sort((a, b) => b.size - a.size);

      // 保留第一個（最大的），移動其他
      const keepFile = fileList[0];
      console.log(`  ✓ 保留：${keepFile.fileName} (${formatSize(keepFile.size)})`);

      for (let i = 1; i < fileList.length; i++) {
        const moveFile = fileList[i];
        console.log(`  → 移動：${moveFile.fileName} (${formatSize(moveFile.size)})`);

        if (safeMove(moveFile.filePath, toDeleteFolder, moveFile.fileName)) {
          movedCount++;
          savedSpace += moveFile.size;
          console.log(`     ✓ 已成功移動到 _TO_DELETE`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('【完成】處理結果：');
  console.log('='.repeat(60));
  console.log(`✓ 共移動 ${movedCount} 個重複檔案到 _TO_DELETE 文件夾`);
  console.log(`✓ 這些文件佔用空間 ${formatSize(savedSpace)}`);
  console.log(`✓ 共有 ${codeMap.size} 個不同的編碼`);
  console.log(`\n💡 提示：請檢查 _TO_DELETE 文件夾，確認無誤後可手動刪除`);
  console.log('='.repeat(60));
}

/**
 * 格式化文件大小顯示
 * @param {number} bytes - 字節數
 * @returns {string} 格式化後的大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// 執行去重功能
deduplicateByCode(path.resolve(targetDirectory));