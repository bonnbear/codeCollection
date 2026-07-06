const fs = require('fs');

const inputFile = 'javbus_results.json';
const outputFile = 'javbus.txt';

function getMagnetSize(size) {
  if (!size) return 0;
  
  // 處理 GB
  const gbMatch = size.match(/([\d.]+)\s*GB/i);
  if (gbMatch) return parseFloat(gbMatch[1]) * 1024;
  
  // 處理 MB
  const mbMatch = size.match(/([\d.]+)\s*MB/i);
  if (mbMatch) return parseFloat(mbMatch[1]);
  
  return 0;
}

function getTagPriority(tags) {
  if (!tags || !Array.isArray(tags)) return 99;
  
  if (tags.includes('字幕')) return 1;
  if (tags.includes('高清')) return 2;
  
  return 99;
}

function isCleanName(name) {
  if (!name) return false;
  const cleanPattern = /^[A-Za-z]+-\d+$/;
  return cleanPattern.test(name.trim());
}

function getNamePriority(name) {
  if (isCleanName(name)) return 1;
  return 2;
}

function selectBestMagnet(magnets) {
  if (!magnets || magnets.length === 0) return null;
  
  // 從後往前遍歷，找到最優先的
  let best = null;
  let bestScore = { tag: 99, name: 99, size: 0, index: -1 };
  
  for (let i = magnets.length - 1; i >= 0; i--) {
    const m = magnets[i];
    const tagPriority = getTagPriority(m.tags);
    const namePriority = getNamePriority(m.name);
    const size = getMagnetSize(m.size);
    
    // 比較優先級：tag > name > size
    // 如果優先級相同，後面的（先遍歷到的）優先
    if (
      tagPriority < bestScore.tag ||
      (tagPriority === bestScore.tag && namePriority < bestScore.name) ||
      (tagPriority === bestScore.tag && namePriority === bestScore.name && size > bestScore.size)
    ) {
      best = m;
      bestScore = { tag: tagPriority, name: namePriority, size: size, index: i };
    }
  }
  
  return best;
}

fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error('讀取錯誤:', err);
    return;
  }

  try {
    const jsonData = JSON.parse(data);

    const allMagnetLinks = jsonData.reduce((acc, item) => {
      if (item.magnets && Array.isArray(item.magnets)) {
        const best = selectBestMagnet(item.magnets);
        if (best && best.magnet) {
          acc.push(best.magnet);
        }
      }
      return acc;
    }, []);

    fs.writeFile(outputFile, allMagnetLinks.join('\n'), 'utf8', err => {
      if (err) {
        console.error('寫入錯誤:', err);
      } else {
        console.log(`成功寫入 ${allMagnetLinks.length} 個磁力連結到 ${outputFile}`);
      }
    });

  } catch (e) {
    console.error('解析錯誤:', e);
  }
});