#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const VALID_WAIT_UNTIL = new Set(['load', 'domcontentloaded', 'networkidle', 'commit'])

function printHelp() {
  console.log(`
Playwright crawler

Usage:
  npm run crawl -- --url <url> [options]
  npm run crawl -- --url <url1> --url <url2> [options]
  npm run crawl -- --urls-file urls.txt [options]
  npm run crawl -- --start-url <url> --detail-selector ".list-item a" [options]

Options:
  --url <url>                 URL to crawl. Can be used multiple times.
  --urls-file <path>          Text file with one URL per line.
  --start-url <url>           Entry page URL for detail-page crawling.
  --detail-selector <selector> CSS selector used to collect detail links from --start-url.
  --same-origin               Keep only detail links from the same origin as --start-url.
  --output <path>             JSON output path. Default: result.json
  --wait-until <event>        One of: load, domcontentloaded, networkidle, commit. Default: networkidle
  --timeout <ms>              Page navigation timeout. Default: 30000
  --width <px>                Browser viewport width. Default: 1280
  --height <px>               Browser viewport height. Default: 800
  --headed                    Launch a visible browser window.
  --help                      Show this help.

Examples:
  npm run crawl -- --url https://example.com
  npm run crawl -- --urls-file urls.txt --output output/crawl/pages.json
  npm run crawl -- --start-url https://example.com --detail-selector ".list-item a" --same-origin
`)
}

function parsePositiveInt(value, flagName) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer`)
  }
  return parsed
}

function assertValidUrl(url, flagName) {
  try {
    // eslint-disable-next-line no-new
    new URL(url)
  } catch {
    throw new Error(`${flagName} is not a valid URL: ${url}`)
  }
}

function parseArgs(argv) {
  const options = {
    urls: [],
    urlsFile: '',
    startUrl: '',
    detailSelector: '',
    sameOrigin: false,
    output: 'result.json',
    waitUntil: 'networkidle',
    timeout: 30000,
    width: 1280,
    height: 800,
    headless: true,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    switch (arg) {
      case '--url':
        options.urls.push(argv[++i] ?? '')
        break
      case '--urls-file':
        options.urlsFile = argv[++i] ?? ''
        break
      case '--start-url':
        options.startUrl = argv[++i] ?? ''
        break
      case '--detail-selector':
        options.detailSelector = argv[++i] ?? ''
        break
      case '--same-origin':
        options.sameOrigin = true
        break
      case '--output':
        options.output = argv[++i] ?? ''
        break
      case '--wait-until':
        options.waitUntil = argv[++i] ?? ''
        break
      case '--timeout':
        options.timeout = parsePositiveInt(argv[++i], '--timeout')
        break
      case '--width':
        options.width = parsePositiveInt(argv[++i], '--width')
        break
      case '--height':
        options.height = parsePositiveInt(argv[++i], '--height')
        break
      case '--headed':
        options.headless = false
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  return options
}

function readUrlsFile(filePath) {
  const resolvedPath = path.resolve(process.cwd(), filePath)
  const content = fs.readFileSync(resolvedPath, 'utf8')

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
}

function validateOptions(options) {
  if (!VALID_WAIT_UNTIL.has(options.waitUntil)) {
    throw new Error(`--wait-until must be one of: ${Array.from(VALID_WAIT_UNTIL).join(', ')}`)
  }

  if (options.urlsFile) {
    options.urls.push(...readUrlsFile(options.urlsFile))
  }

  if (options.startUrl) {
    assertValidUrl(options.startUrl, '--start-url')
    if (!options.detailSelector) {
      throw new Error('--detail-selector is required when --start-url is used')
    }
  }

  options.urls = [...new Set(options.urls.filter(Boolean))]

  for (const url of options.urls) {
    assertValidUrl(url, '--url')
  }

  if (!options.startUrl && options.urls.length === 0) {
    throw new Error('Provide at least one --url, --urls-file, or --start-url with --detail-selector')
  }

  if (!options.output) {
    throw new Error('--output cannot be empty')
  }
}

async function extractLinks(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map((anchor) => ({
        text: anchor.innerText.trim(),
        href: anchor.href,
      }))
      .filter((item) => item.href)
  })
}

async function collectDetailUrls(context, options) {
  if (!options.startUrl) {
    return []
  }

  const page = await context.newPage()

  try {
    console.log(`打开入口页面：${options.startUrl}`)
    await page.goto(options.startUrl, {
      waitUntil: options.waitUntil,
      timeout: options.timeout,
    })

    const urls = await page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector))
        .map((anchor) => anchor.href)
        .filter(Boolean)
    }, options.detailSelector)

    const startOrigin = new URL(options.startUrl).origin
    const uniqueUrls = [...new Set(urls)].filter((url) => {
      if (!options.sameOrigin) {
        return true
      }

      try {
        return new URL(url).origin === startOrigin
      } catch {
        return false
      }
    })

    console.log(`发现 ${uniqueUrls.length} 个详情链接`)
    return uniqueUrls
  } finally {
    await page.close()
  }
}

async function crawlPage(context, url, options) {
  const page = await context.newPage()

  try {
    console.log(`开始爬取：${url}`)
    await page.goto(url, {
      waitUntil: options.waitUntil,
      timeout: options.timeout,
    })

    const title = await page.title()
    const finalUrl = page.url()
    const text = await page.evaluate(() => (document.body ? document.body.innerText : ''))
    const links = await extractLinks(page)

    console.log(`爬取成功：${title || finalUrl}`)

    return {
      inputUrl: url,
      finalUrl,
      title,
      text,
      links,
      crawledAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`爬取失败：${url}`)
    console.error(error.message)

    return {
      inputUrl: url,
      error: error.message,
      crawledAt: new Date().toISOString(),
    }
  } finally {
    await page.close()
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  validateOptions(options)

  const browser = await chromium.launch({
    headless: options.headless,
  })

  const context = await browser.newContext({
    viewport: {
      width: options.width,
      height: options.height,
    },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })

  try {
    const detailUrls = await collectDetailUrls(context, options)
    const urls = [...new Set([...options.urls, ...detailUrls])]
    const results = []

    for (const url of urls) {
      results.push(await crawlPage(context, url, options))
    }

    const outputPath = path.resolve(process.cwd(), options.output)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8')

    console.log(`全部爬取完成，结果已保存到 ${outputPath}`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error('程序执行失败：')
  console.error(error)
  process.exit(1)
})
