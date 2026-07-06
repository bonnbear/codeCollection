灵活配置爬虫 - 工作流程说明

这个爬虫被设计为“配置驱动”，这意味着它的核心逻辑是通用的，而具体的爬取目标（如URL和页面元素）则通过一个独立的 CONFIG 对象来定义。

阶段一：定义配置 (CONFIG)

一切都始于 scraper-configurable.js 文件顶部的 CONFIG 对象。这是爬虫的“大脑”和“地图”。

START_URL: 定义爬虫从哪个网址开始工作（通常是列表页的第一页）。

OUTPUT_FILE: 定义爬取到的所有数据最终保存的文件名。

SELECTORS: 这是最关键的部分，它告诉爬虫如何在页面上“看”东西：

listPage.itemDetailLink: 在列表页上，如何找到指向详情页的链接。

listPage.nextPageButton: 在列表页上，如何找到指向**“下一页”**的按钮或链接。

detailPage: 在详情页上，定义所有你想抓取的数据项及其对应的CSS选择器（例如 authorName: 'h3.author-title'）。

DATA_CLEANERS: (可选) 为从详情页抓取到的原始文本提供“清理函数”，例如去除多余的“in”或“Born:”等前缀。

阶段二：启动和初始化 (main 函数)

main 函数开始执行。

它根据 CONFIG.BROWSER_OPTIONS 启动 Playwright (Chromium) 浏览器。

创建一个新的浏览器上下文（Context）和一个新页面（Page）。

设置 currentUrl = CONFIG.START_URL，准备开始主循环。

阶段三：主循环（分页处理）

脚本进入一个 while (currentUrl) 循环。只要 currentUrl 不是 null（即“下一页”还存在），这个循环就会一直持续。

阶段四：列表页爬取 (scrapeListPage 函数)

在主循环的每一次迭代中：

爬虫导航到当前的 currentUrl。

调用 scrapeListPage 函数。

此函数使用 CONFIG.SELECTORS.listPage.itemDetailLink 找到当前页面上所有详情页的链接，并将它们（处理成绝对路径后）收集到一个数组中（itemUrlsToScrape）。

它使用 CONFIG.SELECTORS.listPage.nextPageButton 查找“下一页”的链接。

函数返回两个结果：① 详情页链接数组；② “下一页”的URL（如果没找到，则返回 null）。

阶段五：详情页爬取 (scrapeDetailPage 函数)

拿到详情页链接数组后，脚本会进入一个嵌套循环，遍历这个数组中的每一个 itemUrl：

调用 scrapeDetailPage 函数，并传入 itemUrl。

函数导航到这个详情页URL。

(核心) 它遍历 CONFIG.SELECTORS.detailPage 对象中定义的所有键（如 authorName, authorBornDate 等）。

对于每一个键，它使用对应的选择器（如 h3.author-title）去页面上定位元素并提取文本。

(可选) 如果 CONFIG.DATA_CLEANERS 中定义了对应的清理函数，则使用它来清理文本。

所有数据被收集到一个对象中 (例如 { url: "...", authorName: "...", ... })。

这个对象被 push 到最终的 allScrapedData 总数组中。

阶段六：迭代和终止

当详情页嵌套循环（阶段五）完成后（即当前列表页上的所有 item 都爬完了），main 函数会将 currentUrl 更新为列表页函数（阶段四）返回的 nextPageUrl。

主循环（阶段三）检查 currentUrl：

如果不为 null: 循环继续，爬虫跳转到新的 currentUrl（即下一页），重复阶段四和阶段五。

如果为 null:（意味着 scrapeListPage 没找到“下一页”按钮），主循环终止。

阶段七：完成和输出

主循环终止后，allScrapedData 数组中已包含所有页面、所有 item 的全部数据。

使用 fs.writeFileSync 将这个数组转换为格式化的 JSON 字符串，并保存到 CONFIG.OUTPUT_FILE 指定的文件中。

关闭浏览器，脚本执行完毕。