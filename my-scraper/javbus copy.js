const fs = require('fs');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// ==========================================
// ⚙️ 配置区域
// ==========================================
const CONFIG = {
  BASE_URL: "https://www.javbus.com/studio/7q",
  START_PAGE: 127,
  END_PAGE: 189,
  
  // 文件保存路径
  OUTPUT_FILE: 'javbus_results.json',      // 最终合并文件
  TEMP_FILE: 'javbus_results_temp.jsonl',  // 过程临时文件 (防丢失)

  TIMEOUT: 1200000, // 超时时间 60秒
  HEADLESS: false // 设为 true 可隐藏浏览器窗口
};

// ==========================================
// 🔧 工具函数
// ==========================================

/**
 * 💾 [实时保存] 追加写入一条数据到临时文件
 */
function saveItemToTempFile(data) {
  try {
    const line = JSON.stringify(data) + '\n';
    fs.appendFileSync(CONFIG.TEMP_FILE, line, 'utf-8');
  } catch (e) {
    console.error(`❌ 写入文件失败: ${e.message}`);
  }
}

/**
 * 🧹 [最终合并] 将临时 JSONL 文件转换为最终 JSON 文件
 * ✅ 修复: 增加空文件和空行处理
 */
function convertTempToFinal() {
  if (!fs.existsSync(CONFIG.TEMP_FILE)) {
    console.log('⚠️ 临时文件不存在，跳过转换');
    return;
  }
  
  console.log('\n🔄 正在整理最终数据...');
  
  try {
    const content = fs.readFileSync(CONFIG.TEMP_FILE, 'utf-8').trim();
    
    // ✅ 修复: 处理空文件情况
    if (!content) {
      console.log('⚠️ 临时文件为空，无数据可转换');
      return;
    }
    
    const lines = content.split('\n');
    
    // ✅ 修复: 过滤空行并安全解析
    const jsonArray = lines
      .filter(line => line.trim() !== '') // 过滤空行
      .map(line => {
        try { 
          return JSON.parse(line); 
        } catch(e) { 
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
 * 🔞 处理年龄验证 (针对 JavBus)
 */
async function handleAgeVerification(page) {
  try {
    // 检测页面是否包含 "你是否已經成年" 或 按钮 "我已經成年"
    const verifyBtn = page.locator('text=我已經成年');
    if (await verifyBtn.count() > 0 && await verifyBtn.isVisible()) {
      console.log('    🛡️ 检测到年龄验证，正在通过...');
      await verifyBtn.click();
      await page.waitForLoadState('domcontentloaded');
    }
  } catch (e) {
    // 忽略验证错误，可能页面不需要验证
  }
}

/**
 * ⏳ 等待页面内容完全加载
 * ✅ 新增: 确保详情页内容加载完成
 */
async function waitForPageReady(page) {
  try {
    // 等待网络空闲
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch (e) {
    // networkidle 超时不是致命错误，继续执行
    console.log('    ⏳ 网络空闲等待超时，继续处理...');
  }
  
  try {
    // 等待主要内容容器出现
    await page.waitForSelector('.container', { timeout: 5000 });
  } catch (e) {
    // 容器未找到也继续
  }
}

// ==========================================
// 🚀 主程序
// ==========================================

async function run() {
  // 加载隐身插件
  chromium.use(stealth);
  
  // 如果是重新运行，建议清理旧的临时文件 (可选)
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
        await mainPage.goto(url, { timeout: CONFIG.TIMEOUT });
        await handleAgeVerification(mainPage); // 处理列表页验证
        
        // ✅ 修复: 等待列表页内容加载
        await waitForPageReady(mainPage);

        // 抓取本页所有影片链接
        const movieLinks = await mainPage.$$eval("a.movie-box", els => els.map(e => e.href));
        console.log(`  🎬 第 ${p} 页发现 ${movieLinks.length} 个影片`);

        if (movieLinks.length === 0) {
          console.warn("  ⚠️ 未找到影片，可能是空页或被拦截");
          continue;
        }

        // 依序进入每个影片详情页
        for (let i = 0; i < movieLinks.length; i++) {
          const movieUrl = movieLinks[i];
          console.log(`  [${i + 1}/${movieLinks.length}] 处理: ${movieUrl.split('/').pop()}`);

          // 打开新标签页处理详情
          const detailPage = await context.newPage();
          
          try {
            // 随机延迟 (防风控)
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500));

            await detailPage.goto(movieUrl, { timeout: CONFIG.TIMEOUT });
            await handleAgeVerification(detailPage); // 处理详情页验证
            
            // ✅ 修复: 等待详情页内容完全加载
            await waitForPageReady(detailPage);

            // -------------------------------------------------------
            // 👇 这里是你原本的抓取逻辑 (保持不变)
            // -------------------------------------------------------
            
            // 等待 magnet-table
            let hasTable = true;
            try {
                await detailPage.waitForSelector("#magnet-table tbody tr", { timeout: 5000 });
            } catch {
                hasTable = false;
            }

            let magnetList = [];

            if (hasTable) {
                magnetList = await detailPage.$$eval("#magnet-table tr", rows => {
                    const list = [];
                    for (let r of rows) {
                        const tds = r.querySelectorAll("td");
                        if (tds.length < 3) continue;

                        // 磁力名称 + 链接
                        const nameA = tds[0].querySelector("a[href^='magnet:']");
                        if (!nameA) continue;

                        const name = nameA.textContent.trim();
                        const magnet = nameA.href;

                        // 文件大小
                        const sizeA = tds[1].querySelector("a");
                        const size = sizeA ? sizeA.textContent.trim() : "";

                        // 分享日期
                        const dateA = tds[2].querySelector("a");
                        const date = dateA ? dateA.textContent.trim() : "";

                        // 检查字幕/高清标签
                        const tags = [];
                        const tagEls = tds[0].querySelectorAll(".btn");
                        tagEls.forEach(btn => tags.push(btn.textContent.trim()));

                        list.push({ name, magnet, size, date, tags });
                    }
                    return list;
                });
            }
            // -------------------------------------------------------
            // 👆 原本逻辑结束
            // -------------------------------------------------------

            console.log(`    ✅ 抓取成功: ${magnetList.length} 个磁力链`);

            // 💾 实时保存数据
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
            await detailPage.close(); // 这一步很重要，释放内存
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
    // 转换最终文件
    convertTempToFinal();
    console.log("\n🎉 所有任务结束！");
  }
}

run();