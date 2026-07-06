const fs = require('fs');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// ==========================================
// ⚙️ 配置区域
// ==========================================
const CONFIG = {
  BASE_URL: "https://www.javbus.com/series/2ed",
  START_PAGE: 1,
  END_PAGE: 7,
  
  OUTPUT_FILE: 'javbus_results.json',
  TEMP_FILE: 'javbus_results_temp.jsonl',

  TIMEOUT: 60000,
  HEADLESS: false
};

// ==========================================
// 🔧 工具函数
// ==========================================
function saveItemToTempFile(data) {
  try {
    const line = JSON.stringify(data) + '\n';
    fs.appendFileSync(CONFIG.TEMP_FILE, line, 'utf-8');
  } catch (e) {
    console.error(`❌ 写入文件失败: ${e.message}`);
  }
}

function convertTempToFinal() {
  if (!fs.existsSync(CONFIG.TEMP_FILE)) {
    console.log('⚠️ 临时文件不存在，跳过转换');
    return;
  }

  console.log('\n🔄 正在整理最终数据...');

  try {
    const content = fs.readFileSync(CONFIG.TEMP_FILE, 'utf-8').trim();

    if (!content) {
      console.log('⚠️ 临时文件为空，无数据可转换');
      return;
    }

    const lines = content.split('\n');
    const jsonArray = lines
      .filter(line => line.trim() !== '')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.warn(`⚠️ 解析失败的行: ${line.substring(0, 50)}...`);
          return null;
        }
      })
      .filter(item => item !== null);

    if (jsonArray.length === 0) {
      console.log('⚠️ 没有有效数据可保存');
      return;
    }

    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(jsonArray, null, 2), 'utf-8');
    console.log(`✅ 转换完成！共 ${jsonArray.length} 条数据已保存至: ${CONFIG.OUTPUT_FILE}`);
  } catch (e) {
    console.error(`❌ 转换失败: ${e.message}`);
  }
}

/**
 * 🔞 处理年龄验证
 */
async function handleAgeVerification(page) {
  try {
    const verifyBtn = page.locator('text=我已經成年');
    if (await verifyBtn.count() > 0 && await verifyBtn.isVisible({ timeout: 2000 })) {
      console.log('    🛡️ 检测到年龄验证，正在通过...');
      await verifyBtn.click();
      await page.waitForLoadState('domcontentloaded');
    }
  } catch (e) {
    // 忽略
  }
}

/**
 * 🎯 等待列表页关键元素
 */
async function waitForListPage(page) {
  try {
    await page.waitForSelector('a.movie-box', { timeout: 10000 });
  } catch (e) {
    console.log('    ⚠️ 列表页元素等待超时');
  }
}

/**
 * ✅ 等待磁力链接出现，或等待“无磁力”提示
 */
async function waitForMagnetsOrEmpty(page, timeout = 15000) {
  // 有些站点需要先点“磁力鏈接”标签
  const magnetTab = page.locator('text=磁力鏈接');
  if (await magnetTab.count()) {
    await magnetTab.first().click().catch(() => {});
  }

  const magnetLink = page.locator('#magnet-table a[href^="magnet:"]');
  const emptyHint = page.locator('#magnet-table').locator('text=/暫無|无磁力|No magnet/i');

  await Promise.race([
    magnetLink.first().waitFor({ state: 'visible', timeout }).catch(() => {}),
    emptyHint.first().waitFor({ state: 'visible', timeout }).catch(() => {})
  ]);

  return magnetLink;
}

// ==========================================
// 🚀 主程序
// ==========================================
async function run() {
  chromium.use(stealth);

  if (fs.existsSync(CONFIG.TEMP_FILE)) {
    fs.unlinkSync(CONFIG.TEMP_FILE);
  }

  const browser = await chromium.launch({
    headless: CONFIG.HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const mainPage = await context.newPage();

  console.log(`🚀 启动爬虫: JavBus [${CONFIG.START_PAGE} - ${CONFIG.END_PAGE} 页]`);

  try {
    for (let p = CONFIG.START_PAGE; p <= CONFIG.END_PAGE; p++) {
      const url = `${CONFIG.BASE_URL}/${p}`;
      console.log(`\n======= 📄 正在爬取第 ${p} 页：${url} =======`);

      try {
        await mainPage.goto(url, {
          timeout: CONFIG.TIMEOUT,
          waitUntil: 'domcontentloaded'
        });

        await handleAgeVerification(mainPage);
        await waitForListPage(mainPage);

        const movieLinks = await mainPage.$$eval('a.movie-box', els => els.map(e => e.href));
        console.log(`  🎬 第 ${p} 页发现 ${movieLinks.length} 个影片`);

        if (movieLinks.length === 0) {
          console.warn('  ⚠️ 未找到影片，可能是空页或被拦截');
          continue;
        }

        for (let i = 0; i < movieLinks.length; i++) {
          const movieUrl = movieLinks[i];
          console.log(`  [${i + 1}/${movieLinks.length}] 处理: ${movieUrl.split('/').pop()}`);

          const detailPage = await context.newPage();

          try {
            // 随机延迟
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500));

            // 加载详情页
            await detailPage.goto(movieUrl, {
              timeout: CONFIG.TIMEOUT,
              waitUntil: 'domcontentloaded'
            });

            await handleAgeVerification(detailPage);

            // 给异步加载一点时间
            await detailPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

            // 等待磁力链接或无磁力提示
            const magnetLocator = await waitForMagnetsOrEmpty(detailPage, 15000);
            const magnetCount = await magnetLocator.count();

            let magnetList = [];

            if (magnetCount > 0) {
              magnetList = await detailPage.$$eval('#magnet-table tr', rows => {
                const list = [];
                for (let r of rows) {
                  const tds = r.querySelectorAll('td');
                  if (tds.length < 3) continue;

                  const nameA = tds[0].querySelector("a[href^='magnet:']");
                  if (!nameA) continue;

                  const name = nameA.textContent.trim();
                  const magnet = nameA.href;

                  const sizeA = tds[1].querySelector('a');
                  const size = sizeA ? sizeA.textContent.trim() : '';

                  const dateA = tds[2].querySelector('a');
                  const date = dateA ? dateA.textContent.trim() : '';

                  const tags = [];
                  const tagEls = tds[0].querySelectorAll('.btn');
                  tagEls.forEach(btn => tags.push(btn.textContent.trim()));

                  list.push({ name, magnet, size, date, tags });
                }
                return list;
              });
            } else {
              console.log('    ⚠️ 未发现磁力链接（可能真的没有，或被拦截）');
            }

            console.log(`    ✅ 抓取成功: ${magnetList.length} 个磁力链`);

            const resultItem = {
              page: p,
              url: movieUrl,
              title: await detailPage.title(),
              magnets: magnetList
            };
            saveItemToTempFile(resultItem);
          } catch (err) {
            console.error(`    ❌ 详情页出错: ${err.message}`);
          } finally {
            await detailPage.close();
          }
        }
      } catch (err) {
        console.error(`  ❌ 列表页加载出错: ${err.message}`);
      }
    }
  } catch (globalErr) {
    console.error(`❌ 致命错误: ${globalErr}`);
  } finally {
    await browser.close();
    convertTempToFinal();
    console.log('\n🎉 所有任务结束！');
  }
}

run();