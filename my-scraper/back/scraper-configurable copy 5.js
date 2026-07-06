const fs = require('fs');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

const CONFIG = {
  // ✏️ 在这里修改你要爬取的 URL
  // 1. 支持列表页 (如 /new, /weekly-hot)
  // 2. 支持女优页 (如 /actresses/...)
  BASE_URL: 'https://missav.ws/dm70/actresses/%E4%BD%90%E5%B1%B1%E6%84%9B', 
  
  // 🎯 爬取范围控制 (页码)
  START_PAGE: 1,    
  END_PAGE: 69,     
  
  // 💾 文件配置
  OUTPUT_FILE: 'missav_magnets.json',       // 最终结果
  TEMP_FILE: 'missav_magnets_temp.jsonl',   // 过程临时文件 (安全备份)

  SELECTORS: {
    // 列表页视频链接 (可能会变，如果抓不到请检查这里)
    itemDetailLink: 'a.text-secondary.group-hover\\:text-primary',
    // 详情页磁力链接
    magnetLink: 'a[href^="magnet:"]',
  },
  BROWSER_OPTIONS: {
    headless: true, 
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  TIMEOUT: {
    navigation: 60000,
    element: 15000,
    extraWait: 2000,
  },
  CONCURRENCY: {
    detailPages: 5,   // 详情页并发数 (建议 3-5，太高容易被 Cloudflare 拦截)
    listPages: 5,     // 列表页并发数
  }
};

// ==========================================
// 🛠️ 工具函数：文件保存与并发控制
// ==========================================

/**
 * 💾 [实时保存] 追加写入一条数据到临时文件
 */
function saveItemToTempFile(data) {
  try {
    // 压缩成一行 JSON 写入
    const line = JSON.stringify(data) + '\n';
    fs.appendFileSync(CONFIG.TEMP_FILE, line, 'utf-8');
  } catch (e) {
    console.error(`❌ 写入临时文件失败: ${e.message}`);
  }
}

/**
 * 🧹 [最终合并] 将临时 JSONL 文件转换为最终 JSON 文件
 */
function convertTempToFinal() {
  if (!fs.existsSync(CONFIG.TEMP_FILE)) return;
  
  console.log('\n🔄 正在将临时数据转换为最终 JSON 格式...');
  try {
    const fileStream = fs.readFileSync(CONFIG.TEMP_FILE, 'utf-8');
    const lines = fileStream.trim().split('\n');
    const jsonArray = lines.map(line => {
      try { return JSON.parse(line); } catch(e) { return null; }
    }).filter(item => item !== null);

    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(jsonArray, null, 2), 'utf-8');
    console.log(`✅ 转换完成！所有数据已保存至: ${CONFIG.OUTPUT_FILE}`);
    
    // 转换成功后删除临时文件 (可选)
    // fs.unlinkSync(CONFIG.TEMP_FILE); 
  } catch (e) {
    console.error(`❌ 转换失败: ${e.message}`);
    console.log(`⚠️ 原始数据仍保存在 ${CONFIG.TEMP_FILE} 中`);
  }
}

/**
 * 🔧 URL构建器：自动处理 page 参数
 */
function buildPageUrl(baseUrl, pageNum) {
  try {
    const url = new URL(baseUrl);
    if (url.searchParams.has('page')) {
      url.searchParams.set('page', pageNum);
    } else {
      url.searchParams.append('page', pageNum);
    }
    return url.href;
  } catch (e) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${pageNum}`;
  }
}

/**
 * 🚦 并发控制器
 */
class ConcurrencyController {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async run(fn) {
    while (this.running >= this.limit) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

// ==========================================
// 🕷️ 核心爬虫逻辑
// ==========================================

/**
 * 1. 详情页爬取 (包含字幕检测)
 */
async function scrapeDetailPage(browser, url, retryCount = 0) {
  const MAX_RETRIES = 3;
  let context = null;
  let page = null;

  try {
    context = await browser.newContext(CONFIG.BROWSER_OPTIONS);
    page = await context.newPage();

    // 随机延迟 (防风控关键)
    const randomDelay = Math.floor(Math.random() * 1500) + 500; 
    await new Promise(r => setTimeout(r, randomDelay));

    const waitStrategy = retryCount === 0 ? 'domcontentloaded' : 'load';
    await page.goto(url, { waitUntil: waitStrategy, timeout: CONFIG.TIMEOUT.navigation });

    // 尝试滚动到底部触发加载
    try {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForSelector(CONFIG.SELECTORS.magnetLink, { timeout: CONFIG.TIMEOUT.element, state: 'visible' });
      await page.waitForTimeout(CONFIG.TIMEOUT.extraWait);
    } catch (waitError) {
      const count = await page.locator(CONFIG.SELECTORS.magnetLink).count();
      if (count === 0) {
        await page.evaluate(() => window.scrollTo(0, 0)); // 没找到滚回去试试
        await page.waitForTimeout(1000);
      }
    }

    // 🔥 [核心升级] 提取磁力链 + 字幕状态 + 番号
    const rawMagnets = await page.$$eval('a[href^="magnet:"]', anchors => {
      return anchors.map(a => {
        // 向上寻找最近的 td 单元格
        const container = a.closest('td');
        // 检查该单元格内是否有 "字幕" 标签
        const hasSubtitle = container 
          ? Array.from(container.querySelectorAll('span')).some(s => s.textContent.includes('字幕'))
          : false;

        return {
          link: a.href,
          hasSubtitle: hasSubtitle,
          code: a.innerText.trim() // 顺便抓取链接文字(通常是番号)
        };
      });
    });

    // 对象去重 (根据 link 属性)
    const uniqueMagnets = [];
    const seenLinks = new Set();
    for (const item of rawMagnets) {
      if (!seenLinks.has(item.link)) {
        seenLinks.add(item.link);
        uniqueMagnets.push(item);
      }
    }

    if (uniqueMagnets.length > 0) {
      const subCount = uniqueMagnets.filter(m => m.hasSubtitle).length;
      console.log(`    ✅ [成功] 找到 ${uniqueMagnets.length} 个磁力 (含字幕: ${subCount}) | ${url.split('/').pop()}`);
      
      const resultData = { url: url, magnetLinks: uniqueMagnets };
      
      // 🔥 立即保存到临时文件
      saveItemToTempFile(resultData);
      
      return resultData;
    }

    throw new Error('未提取到磁力链接');

  } catch (error) {
    const isNetworkError = error.message.includes('ERR_CONNECTION_RESET') || error.message.includes('Timeout');
    
    if (context) await context.close();

    if (retryCount < MAX_RETRIES) {
      const waitTime = isNetworkError ? 5000 : 2000;
      console.warn(`    ⚠️  出错 (${retryCount + 1}/${MAX_RETRIES}): ${error.message} -> 重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return scrapeDetailPage(browser, url, retryCount + 1);
    }

    console.warn(`    ❌ [放弃] ${url}`);
    return null;
  } finally {
    if (context) try { await context.close(); } catch (e) {}
  }
}

/**
 * 2. 列表页爬取
 */
async function scrapeListPage(browser, listPageUrl, pageNum, retryCount = 0) {
  const MAX_RETRIES = 3;
  let context = null;
  
  console.log(`\n📄 [第${pageNum}页] 正在读取: ${listPageUrl}`);

  try {
    context = await browser.newContext(CONFIG.BROWSER_OPTIONS);
    const page = await context.newPage();

    await page.goto(listPageUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.TIMEOUT.navigation });

    const itemDetailLocator = page.locator(CONFIG.SELECTORS.itemDetailLink);
    try {
      await itemDetailLocator.first().waitFor({ timeout: 15000 });
    } catch (e) {
      throw new Error("未找到视频列表，可能是空页或加载失败");
    }

    const relativeUrls = await itemDetailLocator.evaluateAll(links => links.map(a => a.getAttribute('href')));
    const absoluteUrls = [...new Set(relativeUrls.map(relUrl => new URL(relUrl, listPageUrl).href))];

    console.log(`  📋 此页发现 ${absoluteUrls.length} 个视频`);
    return absoluteUrls;

  } catch (error) {
    console.warn(`  ❌ 列表页出错: ${error.message}`);
    if (context) await context.close();

    if (retryCount < MAX_RETRIES) {
      const waitTime = 5000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return scrapeListPage(browser, listPageUrl, pageNum, retryCount + 1);
    }
    return [];
  } finally {
    if (context) try { await context.close(); } catch (e) {}
  }
}

// ==========================================
// 🚀 主程序
// ==========================================

async function main() {
  let browser;
  const startTime = Date.now();

  // 初始化：清空旧的临时文件（如果是重新开始）
  // 如果你想支持断点续传，请注释掉下面这行 fs.unlinkSync
  if (fs.existsSync(CONFIG.TEMP_FILE)) {
    fs.unlinkSync(CONFIG.TEMP_FILE);
  }

  try {
    chromium.use(stealth);
    
    console.log('🚀 启动爬虫 (字幕检测 + 实时存档版)...');
    console.log(`📍 BASE_URL: ${CONFIG.BASE_URL}`);
    console.log(`💾 数据将实时写入: ${CONFIG.TEMP_FILE}`);

    browser = await chromium.launch({
      headless: CONFIG.BROWSER_OPTIONS.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    // 1. 获取所有详情页 URL
    const listPageController = new ConcurrencyController(CONFIG.CONCURRENCY.listPages);
    const allDetailUrls = [];
    const pageRange = Array.from({ length: CONFIG.END_PAGE - CONFIG.START_PAGE + 1 }, (_, i) => CONFIG.START_PAGE + i);

    const listPageTasks = pageRange.map(async (pageNum) => {
      await new Promise(r => setTimeout(r, Math.random() * 2000));
      return listPageController.run(async () => {
        return await scrapeListPage(browser, buildPageUrl(CONFIG.BASE_URL, pageNum), pageNum);
      });
    });

    const listPageResults = await Promise.all(listPageTasks);
    listPageResults.forEach(urls => allDetailUrls.push(...urls));
    const uniqueDetailUrls = [...new Set(allDetailUrls)];

    console.log(`\n📊 URL 采集完毕。共 ${uniqueDetailUrls.length} 个唯一视频`);
    console.log(`\n🚀 开始并发爬取详情页...\n`);

    // 2. 并发爬取详情页
    const detailController = new ConcurrencyController(CONFIG.CONCURRENCY.detailPages);
    const tasks = uniqueDetailUrls
      .filter(url => url.includes('/dm')) // 简单的 URL 过滤
      .map((url) =>
        detailController.run(async () => {
          return await scrapeDetailPage(browser, url);
        })
      );

    await Promise.all(tasks);

    // 3. 结束处理
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`⏱️  总耗时: ${duration} 秒`);
    
    // 将临时文件转为最终 JSON
    convertTempToFinal();

  } catch (error) {
    console.error('\n❌ 主程序错误:', error);
    console.log(`⚠️ 已抓取的数据安全保存在 ${CONFIG.TEMP_FILE} 中`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 浏览器已关闭');
    }
  }
}

main();