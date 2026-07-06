const fs = require('fs');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// ==========================================
// ⚙️ 配置区域  (BT1207 磁力搜索引擎)
// ==========================================
const CONFIG = {
  ORIGIN: 'https://bt1207so.top',

  // 搜索关键词（每个词会翻 START_PAGE..END_PAGE 页）
  KEYWORDS: ['成实'],
  START_PAGE: 1,
  END_PAGE: 3,

  // 是否进入详情页抓取真实磁力链接（搜索页本身没有磁力，磁力在详情页）
  FETCH_DETAIL: true,

  OUTPUT_FILE: 'bt1207so_results.json',
  TEMP_FILE: 'bt1207so_results_temp.jsonl',

  TIMEOUT: 60000,
  CHALLENGE_TIMEOUT: 25000,
  HEADLESS: false,
  DELAY_MIN: 600,
  DELAY_MAX: 1600,
};

// ==========================================
// 🔧 工具函数
// ==========================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randDelay = () =>
  sleep(Math.floor(Math.random() * (CONFIG.DELAY_MAX - CONFIG.DELAY_MIN)) + CONFIG.DELAY_MIN);

function saveItemToTempFile(data) {
  try {
    fs.appendFileSync(CONFIG.TEMP_FILE, JSON.stringify(data) + '\n', 'utf-8');
  } catch (e) {
    console.error(`❌ 写入文件失败: ${e.message}`);
  }
}

function convertTempToFinal() {
  if (!fs.existsSync(CONFIG.TEMP_FILE)) return;
  console.log('\n🔄 正在整理最终数据...');
  try {
    const content = fs.readFileSync(CONFIG.TEMP_FILE, 'utf-8').trim();
    if (!content) {
      console.log('⚠️ 临时文件为空');
      return;
    }
    const arr = content
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    console.log(`✅ 转换完成！共 ${arr.length} 条数据 → ${CONFIG.OUTPUT_FILE}`);
  } catch (e) {
    console.error(`❌ 转换失败: ${e.message}`);
  }
}

/**
 * 🛡️ 方案 A：处理 BT1207 的"伪 Cloudflare" JS 验证页
 *
 * 挑战页特征：<title> 含 "Bot Challenge"/"Checking your browser"，或存在 <form id="recaptcha-form">。
 * challenge.min.js 会自动 GET /anti/recaptcha/v4/gen 取 token，再提交到
 * /anti/recaptcha/v4/verify，verify 通过后下发放行 cookie(JSESSIONID/fct) 并 302 跳回真实页。
 * 我们只需"识别 + 等它自己跳走"；放行 cookie 种在根域，同 context 后续请求自动带上。
 */
async function passBotChallenge(page, timeout = CONFIG.CHALLENGE_TIMEOUT) {
  const title = await page.title().catch(() => '');
  const hasForm = (await page.locator('#recaptcha-form').count()) > 0;
  if (!/Bot Challenge|Checking your browser/i.test(title) && !hasForm) return false;

  console.log('    🛡️ 检测到 JS 验证页，等待自动放行...');
  await page
    .waitForFunction(() => !document.getElementById('recaptcha-form'), { timeout })
    .catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  if ((await page.locator('#recaptcha-form').count()) > 0) {
    console.log('    ⚠️ 验证未在超时内放行，可加大 CHALLENGE_TIMEOUT');
    return false;
  }
  console.log('    ✅ 已通过验证');
  return true;
}

async function gotoWithChallenge(page, url) {
  await page.goto(url, { timeout: CONFIG.TIMEOUT, waitUntil: 'domcontentloaded' });
  if (await passBotChallenge(page)) {
    await passBotChallenge(page); // 防二次挑战
  }
}

/**
 * 解析搜索结果页 → 条目列表
 * 结构：每条是一个 <ul class="list-unstyled">，内含
 *   <a class="rrt common-link" href="/detail/..">标题</a>
 *   <li class="rrf"><span>文件名</span><span class="rrfs">大小</span></li> (可多个)
 *   <li class="rrmi"> 收录时间/文件大小/文件数量 各一个 <span class="rrmiv"> </li>
 */
async function parseSearchPage(page) {
  return page.$$eval('a.rrt.common-link', (anchors) => {
    return anchors.map((a) => {
      const title = a.textContent.trim();
      const detailUrl = a.href;
      const ul = a.closest('ul');

      // 文件列表
      const files = [];
      if (ul) {
        ul.querySelectorAll('li.rrf').forEach((li) => {
          const spans = li.querySelectorAll('span');
          const name = spans[0]?.textContent.trim() || '';
          const size = li.querySelector('.rrfs')?.textContent.trim() || '';
          if (name) files.push({ name, size });
        });
      }

      // 元信息 (收录时间/文件大小/文件数量)
      let meta = {};
      const next = ul?.nextElementSibling;
      const metaUl = next && next.querySelector ? next : ul;
      const rrmiv = (ul?.parentElement || document).querySelectorAll('li.rrmi .rrmiv');
      if (rrmiv.length >= 1) meta.indexedAt = rrmiv[0]?.textContent.trim();
      if (rrmiv.length >= 2) meta.size = rrmiv[1]?.textContent.trim();
      if (rrmiv.length >= 3) meta.fileCount = rrmiv[2]?.textContent.trim();

      return { title, detailUrl, files, meta };
    });
  });
}

/**
 * 解析详情页 → 磁力链接 + 哈希 + 元信息
 * 结构：<a id="magnet" href="magnet:?xt=urn:btih:HASH">
 *       元信息在若干 <li>文件大小：..</li> <li>收录时间：..</li> <li>种子哈希：..</li>
 */
async function parseDetailPage(page) {
  return page.evaluate(() => {
    const magnetA = document.querySelector('#magnet[href^="magnet:"]') ||
      document.querySelector('a[href^="magnet:"]');
    const magnet = magnetA ? magnetA.getAttribute('href') : '';

    const text = document.body.innerText || '';
    const grab = (label) => {
      const m = text.match(new RegExp(label + '[:：]\\s*([^\\n]+)'));
      return m ? m[1].trim() : '';
    };
    return {
      magnet,
      hash: (magnet.match(/btih:([0-9A-Fa-f]{40})/) || [])[1] || '',
      size: grab('文件大小'),
      indexedAt: grab('收录时间'),
    };
  });
}

// ==========================================
// 🚀 主程序
// ==========================================
async function run() {
  chromium.use(stealth);
  if (fs.existsSync(CONFIG.TEMP_FILE)) fs.unlinkSync(CONFIG.TEMP_FILE);

  const browser = await chromium.launch({
    headless: CONFIG.HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const mainPage = await context.newPage();

  console.log(`🚀 启动爬虫: BT1207 [关键词: ${CONFIG.KEYWORDS.join(', ')}]`);

  let total = 0;
  try {
    for (const kw of CONFIG.KEYWORDS) {
      for (let p = CONFIG.START_PAGE; p <= CONFIG.END_PAGE; p++) {
        const searchUrl =
          `${CONFIG.ORIGIN}/search?keyword=${encodeURIComponent(kw)}&p=${p}`;
        console.log(`\n======= 🔍 "${kw}" 第 ${p} 页 =======`);

        try {
          await gotoWithChallenge(mainPage, searchUrl);
          const items = await parseSearchPage(mainPage);
          console.log(`  📄 发现 ${items.length} 条结果`);
          if (items.length === 0) break; // 没有更多结果，跳出翻页

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log(`  [${i + 1}/${items.length}] ${item.title}`);

            const record = { keyword: kw, page: p, ...item };

            if (CONFIG.FETCH_DETAIL && item.detailUrl) {
              const dp = await context.newPage();
              try {
                await randDelay();
                await gotoWithChallenge(dp, item.detailUrl);
                const detail = await parseDetailPage(dp);
                Object.assign(record, detail);
                console.log(
                  detail.magnet
                    ? `    ✅ 磁力 ${detail.hash}`
                    : `    ⚠️ 未找到磁力`
                );
              } catch (e) {
                console.error(`    ❌ 详情页出错: ${e.message}`);
              } finally {
                await dp.close();
              }
            }

            saveItemToTempFile(record);
            if (record.magnet) total++;
          }
        } catch (e) {
          console.error(`  ❌ 搜索页出错: ${e.message}`);
        }
      }
    }
  } catch (globalErr) {
    console.error(`❌ 致命错误: ${globalErr}`);
  } finally {
    await browser.close();
    convertTempToFinal();
    console.log(`\n🎉 结束！累计磁力 ${total} 条`);
  }
}

run();
