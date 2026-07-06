const fs = require('fs');

// --- 配置区域 ---
const inputFile = 'javbus_results.json';      // 原始数据文件
const deadFile = 'dead_magnets.txt';          // 下载失败的磁力链接列表（一行一个）
const outputFile = 'javbus_all_backups.txt';  // 输出结果：所有可用的备用链接

console.log('正在启动失效链接补救程序...');

// 1. 读取失效链接列表
let deadMagnetsSet = new Set();
try {
    if (fs.existsSync(deadFile)) {
        const deadContent = fs.readFileSync(deadFile, 'utf8');
        // 按行分割，去空格，存入 Set 以便快速比对
        const lines = deadContent.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        deadMagnetsSet = new Set(lines);
        console.log(`[步骤1] 已加载黑名单，共包含 ${deadMagnetsSet.size} 个失效链接。`);
    } else {
        console.log(`[警告] 未找到 ${deadFile}，请确保该文件存在，否则无法进行过滤。`);
    }
} catch (err) {
    console.error('读取失效列表失败:', err);
    process.exit(1);
}

// 2. 读取并处理主数据
fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error('读取 JSON 文件失败:', err);
    return;
  }

  try {
    const jsonData = JSON.parse(data);
    let allBackupMagnets = [];
    let processedMoviesCount = 0; // 计数：有多少部电影触发了补救

    // 遍历每一个电影条目
    jsonData.forEach((item) => {
        // 安全检查：如果这个条目没有磁力链接，直接跳过
        if (!item.magnets || !Array.isArray(item.magnets)) return;

        // 【核心逻辑 A】：判断这个电影是否需要补救
        // 只要这个电影的磁力列表中，有 任意一个 链接存在于黑名单中，就触发逻辑
        const hasDeadLink = item.magnets.some(m => deadMagnetsSet.has(m.magnet));

        if (hasDeadLink) {
            // 【核心逻辑 B】：提取所有幸存的链接
            // 过滤掉所有在黑名单里的链接（无论是一个还是多个坏的，都会被剔除）
            const survivors = item.magnets
                .filter(m => !deadMagnetsSet.has(m.magnet))
                .map(m => m.magnet); // 只提取链接字符串

            if (survivors.length > 0) {
                // 将幸存的链接全部加入输出列表（不进行优先级筛选，全部导出）
                allBackupMagnets = allBackupMagnets.concat(survivors);
                processedMoviesCount++;
            } else {
                console.log(`[无解] 番号 ${item.code || '未知'}: 所有链接均已失效。`);
            }
        }
    });

    // 3. 写入结果文件
    if (allBackupMagnets.length > 0) {
        fs.writeFile(outputFile, allBackupMagnets.join('\n'), 'utf8', err => {
            if (err) {
                console.error('写入结果文件失败:', err);
            } else {
                console.log(`\n================ 处理完成 ================`);
                console.log(`[统计] 共有 ${processedMoviesCount} 部电影存在失效链接。`);
                console.log(`[结果] 已剔除所有坏链，并导出其余 ${allBackupMagnets.length} 个备用链接。`);
                console.log(`[输出] 请查看文件: ${outputFile}`);
                console.log(`==========================================`);
            }
        });
    } else {
        console.log('\n[提示] 未发现任何符合条件的替换项。可能是没有匹配到失效链接，或者该影片没有备用链接。');
    }

  } catch (e) {
    console.error('解析 JSON 数据失败，请检查 javbus_results.json 格式是否正确:', e);
  }
});