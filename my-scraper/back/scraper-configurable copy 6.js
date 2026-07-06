const fs = require('fs');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

const CONFIG = {
  // ✏️ 支持带page参数的URL，会自动识别并递增
  BASE_URL: 'https://missav.ws/dm70/actresses/%E4%BD%90%E5%B1%B1%E6%84%9B', 
  // BASE_URL: 'https://missav.ws/dm169/weekly-hot?page=1', 
  
  // 🎯 新增：爬取范围控制
  START_PAGE: 1,    // 开始页码
  END_PAGE: 69,     // 结束页码
  
  OUTPUT_FILE: 'missav_magnets.json',
  SELECTORS: {
    itemDetailLink: 'a.text-secondary.group-hover\\:text-primary',
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
    detailPages: 8,   
    listPages: 8,    
  }
};

/**
 * 🔧 智能URL构建器：自动识别并处理page参数
 */
function buildPageUrl(baseUrl, pageNum) {
  try {
    const url = new URL(baseUrl);
    
    // 检查URL是否已包含page参数
    if (url.searchParams.has('page')) {
      // 替换现有的page参数
      url.searchParams.set('page', pageNum);
      return url.href;
    } else {
      // 追加page参数
      url.searchParams.append('page', pageNum);
      return url.href;
    }
  } catch (e) {
    // 如果URL解析失败，使用简单拼接（兜底方案）
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}page=${pageNum}`;
  }
}

/**
 * 🚀 并发控制器
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

/**
 * 详情页爬取逻辑
 */
async function scrapeDetailPage(browser, url, retryCount = 0) {
  const MAX_RETRIES = 3;
  let context = null;
  let page = null;

  try {
    context = await browser.newContext({
      ...CONFIG.BROWSER_OPTIONS,
    });
    
    page = await context.newPage();

    const waitStrategy = retryCount === 0 ? 'domcontentloaded' : 'load';
    await page.goto(url, {
      waitUntil: waitStrategy,
      timeout: CONFIG.TIMEOUT.navigation
    });

    try {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForSelector(CONFIG.SELECTORS.magnetLink, {
        timeout: CONFIG.TIMEOUT.element,
        state: 'visible'
      });
      await page.waitForTimeout(CONFIG.TIMEOUT.extraWait);
    } catch (waitError) {
      const count = await page.locator(CONFIG.SELECTORS.magnetLink).count();
      if (count === 0) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);
      }
    }

    const magnetLinks = await page.$$eval('a[href^="magnet:"]', links =>
      links.map(a => a.href)
    );

    const uniqueMagnets = [...new Set(magnetLinks)];

    if (uniqueMagnets.length > 0) {
      console.log(`    ✅ [成功] 找到 ${uniqueMagnets.length} 个磁力链接`);
      return { url: url, magnetLinks: uniqueMagnets };
    }

    throw new Error('未提取到磁力链接');

  } catch (error) {
    const isNetworkError = error.message.includes('ERR_CONNECTION_RESET') || error.message.includes('Timeout');
    
    if (context) await context.close();

    if (retryCount < MAX_RETRIES) {
      const waitTime = isNetworkError ? 5000 + (Math.random() * 5000) : 2000;
      console.warn(`    ⚠️  出错 (${url}): ${error.message} -> 等待 ${Math.round(waitTime/1000)}秒后重试...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return scrapeDetailPage(browser, url, retryCount + 1);
    }

    console.warn(`    ❌ [放弃] ${url} 达到最大重试次数`);
    return null;
  } finally {
    if (context) {
      try { await context.close(); } catch (e) {}
    }
  }
}

/**
 * 列表页爬取逻辑（带重试）
 */
async function scrapeListPage(browser, listPageUrl, pageNum, retryCount = 0) {
  const MAX_RETRIES = 3;
  let context = null;
  
  console.log(`\n📄 [第${pageNum}页] [${retryCount > 0 ? '重试' + retryCount : '开始'}]: ${listPageUrl}`);

  try {
    context = await browser.newContext(CONFIG.BROWSER_OPTIONS);
    const page = await context.newPage();

    await page.goto(listPageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.TIMEOUT.navigation
    });

    const itemDetailLocator = page.locator(CONFIG.SELECTORS.itemDetailLink);
    try {
      await itemDetailLocator.first().waitFor({ timeout: 15000 });
    } catch (e) {
      throw new Error("未找到视频链接，可能页面加载失败");
    }

    const relativeUrls = await itemDetailLocator.evaluateAll(links =>
      links.map(a => a.getAttribute('href'))
    );

    const absoluteUrls = [...new Set(
      relativeUrls.map(relUrl => new URL(relUrl, listPageUrl).href)
    )];

    console.log(`  📋 此页发现 ${absoluteUrls.length} 个视频`);
    return absoluteUrls;

  } catch (error) {
    console.warn(`  ❌ 列表页出错: ${error.message}`);
    
    if (context) await context.close();

    if (retryCount < MAX_RETRIES) {
      const waitTime = 5000 + (Math.random() * 5000);
      console.log(`  🔄 等待 ${Math.round(waitTime/1000)} 秒后重试列表页...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return scrapeListPage(browser, listPageUrl, pageNum, retryCount + 1);
    }
    
    return [];
  } finally {
    if (context) {
      try { await context.close(); } catch (e) {}
    }
  }
}

async function scrapeDetailPagesConcurrently(browser, urls, concurrencyLimit) {
  const controller = new ConcurrencyController(concurrencyLimit);
  const results = [];

  const tasks = urls
    .filter(url => url.includes('/dm'))
    .map((url) =>
      controller.run(async () => {
        const data = await scrapeDetailPage(browser, url);
        if (data) {
          results.push(data);
        }
        return data;
      })
    );

  await Promise.all(tasks);
  return results;
}

async function mainFullyConcurrent() {
  let browser;
  const startTime = Date.now();

  try {
    chromium.use(stealth);
    
    // 📊 显示配置信息
    console.log('🚀 启动爬虫 (智能URL + 范围控制)...');
    console.log(`📍 BASE_URL: ${CONFIG.BASE_URL}`);
    console.log(`📄 爬取范围: 第 ${CONFIG.START_PAGE} 页 → 第 ${CONFIG.END_PAGE} 页`);
    console.log(`⚙️  列表并发: ${CONFIG.CONCURRENCY.listPages} | 详情并发: ${CONFIG.CONCURRENCY.detailPages}\n`);

    browser = await chromium.launch({
      headless: CONFIG.BROWSER_OPTIONS.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const listPageController = new ConcurrencyController(CONFIG.CONCURRENCY.listPages);
    const allDetailUrls = [];

    // 🎯 使用START_PAGE和END_PAGE控制范围
    const pageRange = Array.from(
      { length: CONFIG.END_PAGE - CONFIG.START_PAGE + 1 }, 
      (_, i) => CONFIG.START_PAGE + i
    );

    const listPageTasks = pageRange.map(async (pageNum) => {
      await new Promise(r => setTimeout(r, Math.random() * 2000));
      
      return listPageController.run(async () => {
        // 🔧 使用智能URL构建器
        const listPageUrl = buildPageUrl(CONFIG.BASE_URL, pageNum);
        return await scrapeListPage(browser, listPageUrl, pageNum);
      });
    });

    const listPageResults = await Promise.all(listPageTasks);
    listPageResults.forEach(urls => allDetailUrls.push(...urls));

    const uniqueDetailUrls = [...new Set(allDetailUrls)];

    console.log(`\n📊 URL 采集完毕。共 ${uniqueDetailUrls.length} 个唯一视频链接`);
    console.log(`\n🚀 开始并发爬取详情页...\n`);

    const allScrapedData = await scrapeDetailPagesConcurrently(
      browser, 
      uniqueDetailUrls,
      CONFIG.CONCURRENCY.detailPages
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ 爬取完成！`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📄 爬取范围: 第 ${CONFIG.START_PAGE}-${CONFIG.END_PAGE} 页`);
    console.log(`⏱️  总耗时: ${duration} 秒`);
    console.log(`📊 总视频数: ${uniqueDetailUrls.length}`);
    console.log(`📊 成功提取: ${allScrapedData.length}`);

    const totalMagnets = allScrapedData.reduce((sum, item) => sum + item.magnetLinks.length, 0);
    console.log(`📊 磁力链接总数: ${totalMagnets}`);

    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(allScrapedData, null, 2), 'utf-8');
    console.log(`\n💾 数据已保存到 ${CONFIG.OUTPUT_FILE}`);

  } catch (error) {
    console.error('\n❌ 主程序错误:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 浏览器已彻底关闭');
    }
  }
}

mainFullyConcurrent();