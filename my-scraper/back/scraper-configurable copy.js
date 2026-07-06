const fs = require('fs');
// ✏️ 修改: 从 'playwright' 切换到 'playwright-extra'
const { chromium } = require('playwright-extra');
// ✨ 新增: 导入并实例化 'puppeteer-extra-plugin-stealth'
const stealth = require('puppeteer-extra-plugin-stealth')();

const CONFIG = {
  BASE_URL: 'https://missav.ws/dm41/actresses/%E8%92%82%E4%BA%9E?page=1',
  TOTAL_PAGES: 26,
  OUTPUT_FILE: 'missav_magnets.json',
  
  SELECTORS: {
    itemDetailLink: 'a.text-secondary.group-hover\\:text-primary',
    magnetLink: 'a[href^="magnet:"]',
  },

  BROWSER_OPTIONS: {
    headless: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  
  TIMEOUT: {
    navigation: 45000,
    element: 15000,
    extraWait: 1500,
  },
  
  // 🔥 并发控制配置
  CONCURRENCY: {
    detailPages: 12,  // 详情页并发数（建议3-8，根据网络和机器性能调整）
    listPages: 17,    // 列表页并发数（完全并发模式使用）
  }
};

/**
 * 🚀 并发控制器 - 限制同时执行的 Promise 数量
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
 * 🔥 多策略重试版本
 */
async function scrapeDetailPage(context, url, retryCount = 0) {
  const MAX_RETRIES = 1;
  console.log(`  -> 正在爬取详情页: ${url}${retryCount > 0 ? ` (重试 ${retryCount}/${MAX_RETRIES})` : ''}`);
  
  const page = await context.newPage();
  
  try {
    const waitStrategy = retryCount === 0 ? 'domcontentloaded' : 'load';
    
    await page.goto(url, { 
      waitUntil: waitStrategy,
      timeout: CONFIG.TIMEOUT.navigation 
    });
    
    try {
      // 滚动触发懒加载
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
      
      await page.waitForSelector(CONFIG.SELECTORS.magnetLink, { 
        timeout: CONFIG.TIMEOUT.element,
        state: 'visible'
      });
      
      await page.waitForTimeout(CONFIG.TIMEOUT.extraWait);
      
    } catch (waitError) {
      console.log(`    ⚠️  第一次未找到，尝试更长等待...`);
      
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(2000);
      
      const hasLinks = await page.locator(CONFIG.SELECTORS.magnetLink).count() > 0;
      if (!hasLinks) {
        throw new Error('未找到磁力链接元素');
      }
    }
    
    const magnetLinks = await page.$$eval('a[href^="magnet:"]', links => 
      links.map(a => a.href)
    );
    
    const uniqueMagnets = [...new Set(magnetLinks)];

    if (uniqueMagnets.length > 0) {
      console.log(`    ✅ 找到 ${uniqueMagnets.length} 个磁力链接`);
      return { url: url, magnetLinks: uniqueMagnets };
    }
    
    throw new Error('未提取到磁力链接');
    
  } catch (error) {
    console.warn(`  ⚠️  爬取出错: ${error.message}`);
    
    if (retryCount < MAX_RETRIES) {
      await page.close();
      console.log(`    🔄 等待2秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return scrapeDetailPage(context, url, retryCount + 1);
    }
    
    console.warn(`  ❌ 达到最大重试次数，跳过`);
    return null;
    
  } finally {
    if (!page.isClosed()) {
      await page.close();
    }
  }
}

async function scrapeListPage(page, listPageUrl) {
  console.log(`\n📄 正在爬取列表页: ${listPageUrl}`);
  try {
    await page.goto(listPageUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.TIMEOUT.navigation
    });

    const itemDetailLocator = page.locator(CONFIG.SELECTORS.itemDetailLink);
    const relativeUrls = await itemDetailLocator.evaluateAll(links => 
      links.map(a => a.getAttribute('href'))
    );
    
    const absoluteUrls = [...new Set(
      relativeUrls.map(relUrl => new URL(relUrl, listPageUrl).href)
    )];
    
    console.log(`  📋 找到 ${absoluteUrls.length} 个详情链接`);
    return absoluteUrls;

  } catch (error) {
    console.warn(`  ❌ 爬取列表页失败: ${error.message}`);
    return [];
  }
}

/**
 * 🚀 并发爬取详情页列表
 */
async function scrapeDetailPagesConcurrently(context, urls, concurrencyLimit) {
  const controller = new ConcurrencyController(concurrencyLimit);
  const results = [];
  
  const tasks = urls
    .filter(url => url.includes('/dm'))
    .map((url) => 
      controller.run(async () => {
        const data = await scrapeDetailPage(context, url);
        if (data) {
          results.push(data);
        }
        return data;
      })
    );
  
  await Promise.all(tasks);
  return results;
}

/**
 * 🎯 方案1: 串行列表页 + 并发详情页（推荐，更稳定）
 */
async function main() {
  let browser;
  const allScrapedData = [];
  const startTime = Date.now();

  try {
    // ✨ 新增: 在启动浏览器之前应用 stealth 插件
    chromium.use(stealth);

    // ✏️ 修改: 更新日志以反映潜行模式
    console.log('🚀 启动爬虫（并发优化 + 潜行模式）...');
    console.log(`⚙️  详情页并发数: ${CONFIG.CONCURRENCY.detailPages}\n`);
    
    browser = await chromium.launch({ 
      headless: CONFIG.BROWSER_OPTIONS.headless 
    });
    
    const context = await browser.newContext({
      userAgent: CONFIG.BROWSER_OPTIONS.userAgent
    });
    
    const listPage = await context.newPage();

    for (let pageNum = 1; pageNum <= CONFIG.TOTAL_PAGES; pageNum++) {
      const currentListPageUrl = `${CONFIG.BASE_URL}&page=${pageNum}`;
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📖 处理列表页 ${pageNum}/${CONFIG.TOTAL_PAGES}`);
      console.log(`${'='.repeat(60)}`);
      
      const itemUrlsToScrape = await scrapeListPage(listPage, currentListPageUrl);
      
      // 🔥 并发爬取该列表页的所有详情页
      const pageResults = await scrapeDetailPagesConcurrently(
        context, 
        itemUrlsToScrape, 
        CONFIG.CONCURRENCY.detailPages
      );
      
      allScrapedData.push(...pageResults);
      
      const validUrls = itemUrlsToScrape.filter(u => u.includes('/dm')).length;
      console.log(`\n  📊 本页完成: 成功 ${pageResults.length}/${validUrls} 个`);
    }
    
    await listPage.close();
    
    // 统计结果
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ 爬取完成！`);
    console.log(`${'='.repeat(60)}`);
    console.log(`⏱️  总耗时: ${duration} 秒`);
    console.log(`📊 处理了 ${CONFIG.TOTAL_PAGES} 个列表页`);
    console.log(`📊 成功爬取 ${allScrapedData.length} 个详情页`);
    
    const totalMagnets = allScrapedData.reduce((sum, item) => sum + item.magnetLinks.length, 0);
    console.log(`📊 提取 ${totalMagnets} 个磁力链接`);

    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(allScrapedData, null, 2), 'utf-8');
    console.log(`\n💾 已保存到 ${CONFIG.OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('\n❌ 严重错误:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 浏览器已关闭');
    }
  }
}

/**
 * 🚀 方案2: 完全并发（列表页 + 详情页都并发，速度最快但资源消耗大）
 */
async function mainFullyConcurrent() {
  let browser;
  const startTime = Date.now();

  try {
    // ✨ 新增: 在启动浏览器之前应用 stealth 插件
    chromium.use(stealth);

    // ✏️ 修改: 更新日志以反映潜行模式
    console.log('🚀 启动爬虫（完全并发 + 潜行模式）...');
    console.log(`⚙️  列表页并发数: ${CONFIG.CONCURRENCY.listPages}`);
    console.log(`⚙️  详情页并发数: ${CONFIG.CONCURRENCY.detailPages}\n`);
    
    browser = await chromium.launch({ 
      headless: CONFIG.BROWSER_OPTIONS.headless 
    });
    
    const context = await browser.newContext({
      userAgent: CONFIG.BROWSER_OPTIONS.userAgent
    });
    
    // 🔥 并发爬取所有列表页
    const listPageController = new ConcurrencyController(CONFIG.CONCURRENCY.listPages);
    const allDetailUrls = [];
    
    const listPageTasks = Array.from({ length: CONFIG.TOTAL_PAGES }, (_, i) => i + 1).map(pageNum =>
      listPageController.run(async () => {
        const page = await context.newPage();
        try {
          const listPageUrl = `${CONFIG.BASE_URL}&page=${pageNum}`;
          const urls = await scrapeListPage(page, listPageUrl);
          return urls;
        } finally {
          await page.close();
        }
      })
    );
    
    const listPageResults = await Promise.all(listPageTasks);
    listPageResults.forEach(urls => allDetailUrls.push(...urls));
    
    console.log(`\n📊 所有列表页爬取完成，共找到 ${allDetailUrls.length} 个详情链接`);
    console.log(`\n开始并发爬取详情页...\n`);
    
    // 🔥 并发爬取所有详情页
    const allScrapedData = await scrapeDetailPagesConcurrently(
      context,
      allDetailUrls,
      CONFIG.CONCURRENCY.detailPages
    );
    
    // 统计结果
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ 爬取完成！`);
    console.log(`${'='.repeat(60)}`);
    console.log(`⏱️  总耗时: ${duration} 秒`);
    console.log(`📊 处理了 ${CONFIG.TOTAL_PAGES} 个列表页`);
    console.log(`📊 成功爬取 ${allScrapedData.length} 个详情页`);
    
    const totalMagnets = allScrapedData.reduce((sum, item) => sum + item.magnetLinks.length, 0);
    console.log(`📊 提取 ${totalMagnets} 个磁力链接`);

    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(allScrapedData, null, 2), 'utf-8');
    console.log(`\n💾 已保存到 ${CONFIG.OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('\n❌ 严重错误:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 浏览器已关闭');
    }
  }
}

// 🎯 默认使用方案1（推荐）
// main();

// 如果想使用完全并发版本（速度更快），取消下面的注释并注释掉上面的 main()
mainFullyConcurrent();