const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents'); // 📦 新增：用于生成随机 UA
const fs = require('fs');
const path = require('path');

// 加载隐身插件
chromium.use(stealth());

// --- 配置区域 ---
const CONFIG = {
  BASE_URL: 'https://missav.com/cn/new', // 示例入口，按需修改
  MAX_PAGES: 5,                          // 爬取多少页列表
  CONCURRENCY: 3,                        // 并发数（同时爬取几个详情页），建议不要太高以免被封
  OUTPUT_FILE: 'missav_data.jsonl',      // 💾 改为 .jsonl 后缀，方便增量写入
  TIMEOUT: 60000,                        // 超时时间 60秒
  RETRY_LIMIT: 3                         // 失败重试次数
};

// --- 💾 工具函数：增量写入 ---
// 优势：每爬一条存一条，程序崩溃不丢数据
function appendResult(data) {
  try {
    const line = JSON.stringify(data) + '\n';
    fs.appendFileSync(CONFIG.OUTPUT_FILE, line, 'utf8');
  } catch (err) {
    console.error('❌ 写入文件失败:', err);
  }
}

// --- 🛠 工具函数：随机延迟 ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 核心函数：爬取详情页
 */
async function scrapeDetailPage(browser, url, retryCount = 0) {
  let context = null;
  let page = null;

  try {
    // 🕵️‍♂️ 反爬增强：每次创建新上下文时，使用随机 User-Agent
    const userAgent = new UserAgent({ deviceCategory: 'desktop' }); // 仅生成桌面端 UA
    
    context = await browser.newContext({
      userAgent: userAgent.toString(),
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai'
    });

    page = await context.newPage();

    // ⚡ 性能优化：拦截图片和字体，加快加载速度
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    console.log(`\n[${retryCount + 1}/${CONFIG.RETRY_LIMIT + 1}] 正在处理: ${url}`);
    console.log(`   🎭 使用 UA: ${userAgent.toString().substring(0, 50)}...`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.TIMEOUT });

    // 模拟人类行为：随机滚动，触发懒加载
    await page.evaluate(async () => {
      window.scrollBy(0, 500);
    });
    await delay(1000 + Math.random() * 2000);

    // --- 提取逻辑 ---
    // 获取标题
    const title = await page.title();
    
    // 获取磁力链接 (查找所有 href 以 magnet: 开头的 a 标签)
    const magnetLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href^="magnet:"]'));
      return [...new Set(anchors.map(a => a.href))]; // 去重
    });

    if (magnetLinks.length > 0) {
      const result = {
        url: url,
        title: title,
        magnets: magnetLinks,
        scraped_at: new Date().toISOString()
      };

      console.log(`   ✅ 成功! 找到 ${magnetLinks.length} 个磁力链接`);
      
      // 💾 关键修改：立即写入文件
      appendResult(result);
      
      return true; // 标记成功
    } else {
      console.warn(`   ⚠️  警告: 页面加载成功但未找到磁力链接`);
      return false;
    }

  } catch (error) {
    console.error(`   ❌ 错误: ${error.message}`);
    
    // 重试逻辑
    if (retryCount < CONFIG.RETRY_LIMIT) {
      console.log(`   🔄 准备重试 (${retryCount + 1})...`);
      await delay(2000);
      if (context) await context.close();
      return scrapeDetailPage(browser, url, retryCount + 1);
    }
    return false;
  } finally {
    // 务必关闭上下文释放内存
    if (context) await context.close();
  }
}

/**
 * 核心函数：爬取列表页
 */
async function scrapeListPage(page, pageNum) {
  const url = `${CONFIG.BASE_URL}?page=${pageNum}`;
  console.log(`\n📂 正在扫描列表页: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // 根据实际情况修改选择器，这里假设视频链接在 .thumbnail a 或类似结构中
  // 请根据 Missav 实际 DOM 结构调整 selector
  const videoUrls = await page.evaluate(() => {
    // 这是一个通用的选择器猜测，需要根据实际网站调整
    // 比如 Missav 可能是 'div.item a.text-secondary'
    const links = Array.from(document.querySelectorAll('a')); 
    return links
      .map(a => a.href)
      .filter(href => href.includes('/cn/') && !href.includes('page=') && href.split('/').length > 4) // 简单的过滤逻辑
      .filter((v, i, a) => a.indexOf(v) === i); // 去重
  });

  console.log(`   🔍 第 ${pageNum} 页找到 ${videoUrls.length} 个视频链接`);
  return videoUrls;
}

/**
 * 主程序
 */
(async () => {
  // 初始化：如果文件不存在，创建；如果存在，保留（追加模式）
  if (!fs.existsSync(CONFIG.OUTPUT_FILE)) {
    fs.writeFileSync(CONFIG.OUTPUT_FILE, ''); 
  }

  console.log('🚀 启动爬虫...');
  console.log(`📄 结果将实时保存至: ${CONFIG.OUTPUT_FILE}`);

  const browser = await chromium.launch({
    headless: true // 设置为 false 可视化调试
  });

  try {
    // 用于爬取列表页的上下文 (列表页不需要频繁换 UA，保持一个即可，或者也换)
    const listContext = await browser.newContext();
    const listPage = await listContext.newPage();

    for (let i = 1; i <= CONFIG.MAX_PAGES; i++) {
      // 1. 获取当前列表页的所有视频链接
      const videoUrls = await scrapeListPage(listPage, i);

      // 2. 批处理详情页 (控制并发)
      // 将数组切片，每组 CONFIG.CONCURRENCY 个
      for (let j = 0; j < videoUrls.length; j += CONFIG.CONCURRENCY) {
        const batch = videoUrls.slice(j, j + CONFIG.CONCURRENCY);
        console.log(`\n⚡ 正在并发处理第 ${j + 1} - ${j + batch.length} 个视频...`);
        
        // 并行执行 batch 中的所有任务
        await Promise.all(
          batch.map(url => scrapeDetailPage(browser, url))
        );

        // 批次之间稍微休息，防止服务器压力过大
        await delay(1000);
      }
    }

  } catch (e) {
    console.error('💥 主程序异常:', e);
  } finally {
    await browser.close();
    console.log('\n🏁 爬取结束。');
  }
})();