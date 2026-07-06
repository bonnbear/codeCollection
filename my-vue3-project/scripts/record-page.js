#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { chromium } = require('playwright')

const DEFAULT_VIEWPORT = { width: 1440, height: 900 }
const DEFAULT_DURATION_MS = 5000
const DEFAULT_SCROLL_STEP = 720
const DEFAULT_SCROLL_INTERVAL_MS = 800
const VALID_WAIT_UNTIL = new Set(['load', 'domcontentloaded', 'networkidle', 'commit'])

function printHelp() {
  console.log(`
Playwright page recorder

Usage:
  npm run record:page -- --url <url> [options]

Options:
  --url <url>                 Page url to record. Required.
  --output <path>             Output .webm path. Default: output/playwright/<timestamp>.webm
  --duration <ms>             Recording duration in ms. Default: 5000
  --wait-until <event>        One of: load, domcontentloaded, networkidle, commit
  --width <px>                Video viewport width. Default: 1440
  --height <px>               Video viewport height. Default: 900
  --headed                    Launch a visible browser window
  --headless                  Force headless mode
  --manual                    Stop recording after pressing Enter
  --scroll                    Auto-scroll during timed recording
  --scroll-step <px>          Scroll distance per tick. Default: 720
  --scroll-interval <ms>      Delay between scroll steps. Default: 800
  --help                      Show this help

Examples:
  npm run record:page -- --url https://playwright.dev --duration 8000
  npm run record:page -- --url http://localhost:8081 --headed --manual --output output/playwright/local-demo.webm
  npm run record:page -- --url https://example.com --scroll --duration 12000
`)
}

function parsePositiveInt(value, flagName) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer`)
  }
  return parsed
}

function timestampLabel() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`
}

function normalizeOutputPath(rawPath) {
  const defaultOutput = path.resolve(process.cwd(), `output/playwright/page-recording-${timestampLabel()}.webm`)
  if (!rawPath) {
    return defaultOutput
  }

  const resolvedPath = path.resolve(process.cwd(), rawPath)
  const extension = path.extname(resolvedPath)

  if (!extension) {
    return `${resolvedPath}.webm`
  }

  if (extension !== '.webm') {
    throw new Error('Playwright video recording only supports .webm output files')
  }

  return resolvedPath
}

function parseArgs(argv) {
  const options = {
    url: '',
    output: '',
    duration: DEFAULT_DURATION_MS,
    waitUntil: 'load',
    width: DEFAULT_VIEWPORT.width,
    height: DEFAULT_VIEWPORT.height,
    headless: true,
    manual: false,
    scroll: false,
    scrollStep: DEFAULT_SCROLL_STEP,
    scrollInterval: DEFAULT_SCROLL_INTERVAL_MS,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    switch (arg) {
      case '--url':
        options.url = argv[++i] ?? ''
        break
      case '--output':
        options.output = argv[++i] ?? ''
        break
      case '--duration':
        options.duration = parsePositiveInt(argv[++i], '--duration')
        break
      case '--wait-until':
        options.waitUntil = argv[++i] ?? ''
        break
      case '--width':
        options.width = parsePositiveInt(argv[++i], '--width')
        break
      case '--height':
        options.height = parsePositiveInt(argv[++i], '--height')
        break
      case '--scroll-step':
        options.scrollStep = parsePositiveInt(argv[++i], '--scroll-step')
        break
      case '--scroll-interval':
        options.scrollInterval = parsePositiveInt(argv[++i], '--scroll-interval')
        break
      case '--headed':
        options.headless = false
        break
      case '--headless':
        options.headless = true
        break
      case '--manual':
        options.manual = true
        break
      case '--scroll':
        options.scroll = true
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

function validateOptions(options) {
  if (!options.url) {
    throw new Error('--url is required')
  }

  try {
    // eslint-disable-next-line no-new
    new URL(options.url)
  } catch {
    throw new Error(`Invalid url: ${options.url}`)
  }

  if (!VALID_WAIT_UNTIL.has(options.waitUntil)) {
    throw new Error(`--wait-until must be one of: ${Array.from(VALID_WAIT_UNTIL).join(', ')}`)
  }

  if (options.manual) {
    options.headless = false
  }

  options.output = normalizeOutputPath(options.output)
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question('Recording in progress. Press Enter to stop...\n', () => {
      rl.close()
      resolve()
    })
  })
}

async function autoScroll(page, duration, interval, step) {
  const endTime = Date.now() + duration

  while (Date.now() < endTime) {
    await page.evaluate((scrollStep) => {
      const scrollTop = window.scrollY
      const maxScrollTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
      const nextScrollTop = scrollTop >= maxScrollTop ? 0 : Math.min(scrollTop + scrollStep, maxScrollTop)
      window.scrollTo({ top: nextScrollTop, behavior: 'smooth' })
    }, step)

    await wait(interval)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  validateOptions(options)

  fs.mkdirSync(path.dirname(options.output), { recursive: true })

  let browser
  let context
  let page
  let video
  let shuttingDown = false

  const finish = async (exitCode) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true

    try {
      if (context) {
        await context.close()
      }

      if (video) {
        fs.rmSync(options.output, { force: true })
        await video.saveAs(options.output)
      }

      if (browser) {
        await browser.close()
      }

      console.log(`Saved recording to ${options.output}`)
    } catch (error) {
      console.error('Failed to finalize recording.')
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    } finally {
      process.exitCode = process.exitCode ?? exitCode
    }
  }

  process.on('SIGINT', async () => {
    console.log('\nStopping recorder...')
    await finish(130)
  })

  try {
    browser = await chromium.launch({ headless: options.headless })
    context = await browser.newContext({
      viewport: {
        width: options.width,
        height: options.height,
      },
      recordVideo: {
        dir: path.dirname(options.output),
        size: {
          width: options.width,
          height: options.height,
        },
      },
    })

    page = await context.newPage()
    video = page.video()

    console.log(`Opening ${options.url}`)
    await page.goto(options.url, {
      waitUntil: options.waitUntil,
      timeout: 120000,
    })

    if (options.manual) {
      console.log('Manual mode enabled; browser will stay open for interaction.')
      await waitForEnter()
    } else if (options.scroll) {
      await autoScroll(page, options.duration, options.scrollInterval, options.scrollStep)
    } else {
      await wait(options.duration)
    }

    await finish(0)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    await finish(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
