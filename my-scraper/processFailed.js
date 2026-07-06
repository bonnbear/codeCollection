const fs = require('fs'); 
// 引入 Node.js 内置模块 fs，用于读写文件

const jsonFile = 'javbus_results.json';
// 输入：包含抓取结果的 JSON 文件名

const failedFile = 'failed.txt';
// 输入：失败磁力（或失败链接）列表文件名，一行一个

const outputFile = 'alternatives.txt';
// 输出：把挑选出来的备选磁力链接写到这个文件

function extractHash(magnet) {
// 从 magnet 字符串里提取 btih hash（磁力链接的 infohash）
  const match = magnet.match(/btih:([a-fA-F0-9]+)/i);
  // 正则：匹配 "btih:" 后面跟的一段十六进制字符；i 表示忽略大小写
  return match ? match[1].toUpperCase() : null;
  // 如果匹配到，返回 hash 并统一转成大写；否则返回 null
}

function getMagnetSize(size) {
// 把 size 字符串（如 "2.3 GB" / "800 MB"）转成数值，用 MB 作为统一单位用于比较
  if (!size) return 0;
  // size 为空就认为大小为 0

  const gbMatch = size.match(/([\d.]+)\s*GB/i);
  // 匹配类似 "1.23 GB" 的格式，提取数值部分
  if (gbMatch) return parseFloat(gbMatch[1]) * 1024;
  // GB 转成 MB：乘以 1024

  const mbMatch = size.match(/([\d.]+)\s*MB/i);
  // 匹配类似 "700 MB"
  if (mbMatch) return parseFloat(mbMatch[1]);
  // MB 直接返回数值

  return 0;
  // 既不是 GB 也不是 MB（或格式不对）就当 0
}

function getTagPriority(tags) {
// 根据 tags 决定优先级：字幕最高，其次高清，其余最低
  if (!tags || !Array.isArray(tags)) return 99;
  // 没有 tags 或不是数组：给最低优先级 99

  if (tags.includes('字幕')) return 1;
  // 包含“字幕”：优先级 1（最高）

  if (tags.includes('高清')) return 2;
  // 包含“高清”：优先级 2（次高）

  return 99;
  // 其他情况：优先级 99（最低）
}

function isCleanName(name) {
// 判断 name 是否为“干净番号”格式：字母-数字，例如 "ABCD-123"
  if (!name) return false;
  // name 为空直接 false

  return /^[A-Za-z]+-\d+$/.test(name.trim());
  // 正则：若干字母 + "-" + 若干数字，并且整体完全匹配
  // trim() 去除首尾空格
}

function getNamePriority(name) {
// 干净番号优先
  return isCleanName(name) ? 1 : 2;
  // 干净：优先级 1；不干净：优先级 2
}

function selectBestMagnet(magnets, excludeHashes) {
// 从 magnets 列表里选出一个“最佳磁力”，并排除 excludeHashes 中的 hash
  if (!magnets || magnets.length === 0) return null;
  // 没有 magnets 或为空：返回 null

  let best = null;
  // best 保存当前选中的最佳 magnet 对象

  let bestScore = { tag: 99, name: 99, size: 0 };
  // bestScore 保存 best 的评分：tag 优先级、name 优先级、size（MB）
  // 初始值设为最差（tag/name = 99，size = 0）

  for (let i = magnets.length - 1; i >= 0; i--) {
  // 从后往前遍历 magnets（注意：这是一个实现细节，会影响“平局”时选到哪一个）
    const m = magnets[i];
    // 当前 magnet 对象（预期结构：{ magnet, tags, name, size, ... }）

    const hash = extractHash(m.magnet);
    // 提取当前 magnet 链接的 btih hash

    if (hash && excludeHashes.has(hash)) continue;
    // 如果能提取出 hash 且 hash 在排除集合里（失败集合），跳过这个磁力

    const tagPriority = getTagPriority(m.tags);
    // 计算 tags 的优先级（字幕/高清/其他）

    const namePriority = getNamePriority(m.name);
    // 计算 name 的优先级（是否干净番号）

    const size = getMagnetSize(m.size);
    // 计算大小（统一转 MB），用于最终比较

    if (
      tagPriority < bestScore.tag ||
      // tag 优先级更高（数字更小）则替换 best

      (tagPriority === bestScore.tag && namePriority < bestScore.name) ||
      // tag 相同，name 优先级更高则替换

      (tagPriority === bestScore.tag && namePriority === bestScore.name && size > bestScore.size)
      // tag 与 name 都相同，size 更大则替换
    ) {
      best = m;
      // 更新最佳 magnet

      bestScore = { tag: tagPriority, name: namePriority, size: size };
      // 同步更新最佳 magnet 的评分
    }
  }

  return best;
  // 返回最终选中的 magnet 对象（如果都被排除可能仍为 null）
}

const failedContent = fs.readFileSync(failedFile, 'utf8');
// 同步读取 failed.txt 文件内容（整文件字符串）

const failedHashes = new Set(
  failedContent
    .split('\n')
    // 按行拆分

    .map(line => line.replace(/&amp;/g, '&').trim())
    // 将 &amp; 还原成 &，然后 trim 去空格
    // 说明 failed.txt 里可能存的是 HTML 转义过的链接

    .filter(Boolean)
    // 过滤空行

    .map(extractHash)
    // 每行提取 btih hash（提取不到会变成 null）

    .filter(Boolean)
    // 过滤掉 null
);
// 用 Set 存储失败 hash，查找 O(1)

const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
// 同步读取并解析 javbus_results.json，得到数组（预期是 Array）

const alternatives = [];
// 收集最终的备选磁力链接（字符串数组）

jsonData.forEach(item => {
// 遍历每个条目 item
  if (!item.magnets || !Array.isArray(item.magnets)) return;
  // 如果没有 magnets 或 magnets 不是数组，跳过这个 item

  const hasFailed = item.magnets.some(m => {
  // 判断该 item 的 magnets 中是否“存在任意一个失败 hash”
    const hash = extractHash(m.magnet);
    // 提取每个 magnet 的 hash
    return hash && failedHashes.has(hash);
    // hash 存在且在失败集合里：表示失败
  });

  if (hasFailed) {
  // 只有当这个 item 确实包含失败磁力时，才需要找替代
    const best = selectBestMagnet(item.magnets, failedHashes);
    // 从该 item 的 magnets 中选出一个未失败的“最佳”磁力

    if (best && best.magnet) {
    // 找到了且 magnet 字段存在
      alternatives.push(best.magnet);
      // 把这个磁力链接加入输出列表
    }
  }
});

fs.writeFileSync(outputFile, alternatives.join('\n'), 'utf8');
// 把 alternatives 写到 alternatives.txt
// join('\n')：一行一个 magnet 链接

console.log(`输出 ${alternatives.length} 个备选磁力链接到 ${outputFile}`);
// 在控制台打印结果数量和输出文件名