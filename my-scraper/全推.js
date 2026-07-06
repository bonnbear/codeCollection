const fs = require('fs');

const jsonFile = 'javbus_results.json';
const failedFile = 'failed.txt';
const outputFile = 'alternatives.txt';

function extractHash(magnet) {
  const match = (magnet || '').match(/btih:([a-fA-F0-9]+)/i);
  return match ? match[1].toUpperCase() : null;
}

// 读取 failed.txt，提取失败 hash 集合
const failedContent = fs.readFileSync(failedFile, 'utf8');
const failedHashes = new Set(
  failedContent
    .split('\n')
    .map(line => line.replace(/&amp;/g, '&').trim())
    .filter(Boolean)
    .map(extractHash)
    .filter(Boolean)
);

// 读取 JSON
const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

// 收集所有备选（不评分：把“其余所有的”都推进去）
const alternatives = [];
const seen = new Set(); // 用于去重（按 hash 或 magnet 字符串）

jsonData.forEach(item => {
  if (!item.magnets || !Array.isArray(item.magnets)) return;

  // 这个 item 是否包含失败磁力
  const hasFailed = item.magnets.some(m => {
    const hash = extractHash(m.magnet);
    return hash && failedHashes.has(hash);
  });

  // 只有出现过失败的条目，才输出“其余所有未失败的”
  if (!hasFailed) return;

  item.magnets.forEach(m => {
    if (!m || !m.magnet) return;

    const hash = extractHash(m.magnet);
    // 排除失败 hash
    if (hash && failedHashes.has(hash)) return;

    // 去重策略：优先按 hash 去重；提取不到 hash 就按原字符串去重
    const key = hash ? `hash:${hash}` : `magnet:${m.magnet.trim()}`;
    if (seen.has(key)) return;

    seen.add(key);
    alternatives.push(m.magnet);
  });
});

// 写出
fs.writeFileSync(outputFile, alternatives.join('\n'), 'utf8');
console.log(`输出 ${alternatives.length} 个备选磁力链接到 ${outputFile}`);