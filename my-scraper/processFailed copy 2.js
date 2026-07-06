/**
 * alternatives.js
 *
 * 功能：
 * 1) 读取 failed.txt，提取失败磁力的 BTIH hash（infohash）集合
 * 2) 读取 javbus_results.json（数组，每项包含 magnets 数组）
 * 3) 对每个 item：
 *    -（可选）仅当该 item 内存在失败磁力时，才输出备选
 *    - 在“未失败”的磁力里：先跳过前 N 个可用磁力，再取 M 个写入 alternatives.txt
 *
 * 输出：
 * alternatives.txt（每行一个 magnet 链接）
 *
 * ---------------------------
 * 使用方法：
 * 1) Node.js 环境（建议 v14+）
 * 2) 准备文件：
 *    - javbus_results.json
 *    - failed.txt（每行一个 magnet 或包含 magnet 的文本）
 * 3) 修改下方 CONFIG 配置
 * 4) 运行：
 *    node alternatives.js
 *
 * ---------------------------
 * 使用示例（改 CONFIG 即可）：
 *
 * 示例 A：第一个不行，只推“第二个可用磁力”
 *   CONFIG.skipFirstN = 1
 *   CONFIG.takeN      = 1
 *
 * 示例 B：推前两个可用磁力（不跳过）
 *   CONFIG.skipFirstN = 0
 *   CONFIG.takeN      = 2
 *
 * 示例 C：跳过前两个可用磁力，推后面 3 个
 *   CONFIG.skipFirstN = 2
 *   CONFIG.takeN      = 3
 *
 * 示例 D：不管 item 是否包含失败磁力，都照样输出备选
 *   CONFIG.onlyWhenHasFailed = false
 *
 * 注意：
 * - “跳过/计数”是针对“可用磁力（未失败）”进行的；
 *   失败磁力会被忽略，不会算进 skipFirstN 的计数里。
 */

const fs = require('fs');

// 输入文件
const jsonFile = 'javbus_results.json';
const failedFile = 'failed.txt';

// 输出文件
const outputFile = 'alternatives.txt';

// ==========================
// 配置项（你主要改这里）
// ==========================
const CONFIG = {
  /**
   * skipFirstN：
   * 在每个 item 内部，对“可用磁力（未失败）”先跳过前 N 个。
   * - 0：不跳过，从第 1 个可用磁力开始取
   * - 1：跳过第 1 个可用磁力（相当于“只挑第二个/从第二个开始”）
   * - 2：跳过前 2 个可用磁力...
   */
  skipFirstN: 1,

  /**
   * takeN：
   * 在跳过 skipFirstN 个可用磁力之后，再推进 takeN 个到输出。
   * - 1：只推 1 个
   * - 2：推 2 个...
   */
  takeN: 1,

  /**
   * onlyWhenHasFailed：
   * - true：只有当该 item 的 magnets 里出现过失败 hash，才输出该 item 的备选
   * - false：不管是否出现失败，都输出（等于全量抽取未失败的候选）
   */
  onlyWhenHasFailed: true,

  /**
   * 去重开关（可选）：
   * - true：全局按 hash 去重（不同 item 里重复的 hash 只输出一次）
   * - false：不去重（保持原样追加）
   */
  dedupeByHash: true,
};
// ==========================

function extractHash(magnet) {
  // 从 magnet 字符串里提取 btih hash（磁力链接的 infohash）
  const match = (magnet || '').match(/btih:([a-fA-F0-9]+)/i);
  return match ? match[1].toUpperCase() : null;
}

// ---------- 读取 failed.txt 并构建失败 hash 集合 ----------
const failedContent = fs.readFileSync(failedFile, 'utf8');

const failedHashes = new Set(
  failedContent
    .split('\n')
    .map(line => line.replace(/&amp;/g, '&').trim()) // 还原 HTML 转义 &amp;
    .filter(Boolean)
    .map(extractHash)
    .filter(Boolean)
);

// ---------- 读取 JSON ----------
const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

// ---------- 输出收集 ----------
const alternatives = [];
const seenHashes = new Set(); // 用于全局去重（可选）

jsonData.forEach(item => {
  if (!item.magnets || !Array.isArray(item.magnets)) return;

  // 判断该 item 是否包含失败磁力（保持你原先“有失败才找备选”的触发逻辑，可配置关闭）
  const hasFailed = item.magnets.some(m => {
    const hash = extractHash(m && m.magnet);
    return hash && failedHashes.has(hash);
  });

  // 可配置：是否只处理“出现失败磁力”的 item
  if (CONFIG.onlyWhenHasFailed && !hasFailed) return;

  // 核心：在“未失败”的磁力里，先跳过 skipFirstN 个，再取 takeN 个
  let skipped = 0; // 已跳过的“可用磁力”数量（只数未失败的）
  let pushed = 0;  // 已推进数量

  for (const m of item.magnets) {
    if (!m || !m.magnet) continue;

    const hash = extractHash(m.magnet);

    // 失败的直接跳过（不算“可用磁力”）
    if (hash && failedHashes.has(hash)) continue;

    // 全局去重（可选）
    if (CONFIG.dedupeByHash && hash) {
      if (seenHashes.has(hash)) continue;
    }

    // 这是一个“可用磁力”，先按配置跳过前 N 个
    if (skipped < CONFIG.skipFirstN) {
      skipped++;
      // 注意：跳过的也不计入 seenHashes（因为你没输出它）
      continue;
    }

    // 到这里：该磁力是“要输出的候选”
    alternatives.push(m.magnet);

    if (CONFIG.dedupeByHash && hash) {
      seenHashes.add(hash);
    }

    pushed++;
    if (pushed >= CONFIG.takeN) break; // 推够了就停（针对当前 item）
  }
});

// 写文件
fs.writeFileSync(outputFile, alternatives.join('\n'), 'utf8');
console.log(`输出 ${alternatives.length} 条备选磁力链接到 ${outputFile}`);

/**
 * ---------------------------
 * 再给几个直观“配置结果”的说明：
 *
 * 1) skipFirstN=1, takeN=1
 *    - 对每个 item：在未失败磁力中跳过第1个，输出第2个（如果存在）
 *
 * 2) skipFirstN=0, takeN=2
 *    - 对每个 item：输出未失败磁力中的前2个
 *
 * 3) onlyWhenHasFailed=false
 *    - 不管 item 里有没有失败磁力，都按 skip/take 规则输出
 *
 * 4) dedupeByHash=true
 *    - 如果多个 item 里出现相同 hash，只会在 alternatives.txt 里出现一次
 */