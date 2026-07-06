const fs = require('fs');

// 1. 設定檔案路徑
const inputFile = 'javbus_results.json';
const outputFile = 'javbus_results.txt';

// 🛠️ 輔助函數：從磁力鏈接中提取 size 數值
function getMagnetSize(url) {
  try {
    // 匹配 &size=123456 或 ?size=123456
    const match = url.match(/[?&]size=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch (e) {
    return 0;
  }
}

// 2. 讀取並處理
fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error(`讀取檔案錯誤: ${err}`);
    return;
  }

  try {
    const jsonData = JSON.parse(data);
    console.log(`📦 處理中: 共 ${jsonData.length} 個影片項目`);

    const allMagnetLinks = jsonData.reduce((acc, item) => {
      if (item.magnetLinks && Array.isArray(item.magnetLinks) && item.magnetLinks.length > 0) {
        
        // 排序邏輯：字幕優先 > 大小優先
        const sortedLinks = [...item.magnetLinks].sort((a, b) => {
          // 1. 字幕權重
          if (a.hasSubtitle !== b.hasSubtitle) {
            return b.hasSubtitle ? 1 : -1; // 有字幕的排前面
          }
          // 2. 大小權重 (降序)
          const sizeA = getMagnetSize(a.link);
          const sizeB = getMagnetSize(b.link);
          return sizeB - sizeA;
        });

        // 🔥 核心修改：取前 2 個
        // 如果只有 1 個鏈接，它就只取 1 個；如果有 5 個，它取最好的 2 個
        const topTwo = sortedLinks.slice(0, 2).map(m => m.link);
        
        // 將選出的鏈接加入總列表
        return acc.concat(topTwo);
      }
      return acc;
    }, []);

    console.log(`\n🎉 總共提取了 ${allMagnetLinks.length} 條磁力鏈接 (每個影片最多 2 條)`);

    // 3. 寫入結果
    fs.writeFile(outputFile, allMagnetLinks.join('\n'), 'utf8', (writeErr) => {
      if (writeErr) {
        console.error(`寫入錯誤: ${writeErr}`);
        return;
      }
      console.log(`✅ 成功保存至 ${outputFile}`);
    });

  } catch (parseErr) {
    console.error(`JSON 解析錯誤: ${parseErr}`);
  }
});