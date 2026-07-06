import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn } from 'cross-spawn'
import fs from 'fs-extra'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

// 1. 获取 yt-dlp 二进制路径
const getBinaryPath = () => {
  const platform = process.platform
  const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'

  // 在开发环境中，二进制文件在 resources/yt-dlp
  if (VITE_DEV_SERVER_URL) {
      return path.join(process.env.APP_ROOT, 'resources', binaryName)
  }
  // 生产环境
  return path.join(process.resourcesPath, binaryName)
}

// 获取 ffmpeg 路径
const getFfmpegPath = () => {
  const platform = process.platform
  const binaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  
  // 1. 优先检查 resources 目录 (打包后或开发环境)
  let bundledPath
  if (VITE_DEV_SERVER_URL) {
      bundledPath = path.join(process.env.APP_ROOT, 'resources', binaryName)
  } else {
      bundledPath = path.join(process.resourcesPath, binaryName)
  }
  
  if (fs.existsSync(bundledPath)) {
    return bundledPath
  }

  // 2. 检查常见的系统路径 (macOS/Linux)
  if (platform === 'darwin' || platform === 'linux') {
      const commonPaths = [
          '/opt/homebrew/bin/ffmpeg', // Apple Silicon Mac
          '/usr/local/bin/ffmpeg',    // Intel Mac
          '/usr/bin/ffmpeg'
      ]
      for (const p of commonPaths) {
          if (fs.existsSync(p)) return p
      }
  }

  // 3. 默认尝试从 PATH 环境变量中查找
  return binaryName
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 670,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      sandbox: false
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })
  
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
    // Self-check yt-dlp execution
    const binaryPath = getBinaryPath()
    console.log('[Self-Check] Testing binary at:', binaryPath)
    if (fs.existsSync(binaryPath)) {
        const check = spawn(binaryPath, ['--version'])
        check.stdout.on('data', (d) => console.log('[Self-Check] stdout:', d.toString().trim()))
        check.stderr.on('data', (d) => console.error('[Self-Check] stderr:', d.toString().trim()))
        check.on('error', (e) => console.error('[Self-Check] error:', e))
        check.on('close', (c) => console.log('[Self-Check] exit code:', c))
    } else {
        console.error('[Self-Check] Binary not found!')
    }
})

// 選擇下載目錄
ipcMain.handle('select-directory', async () => {
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  })
  if (result.canceled) {
    return null
  }
  return result.filePaths[0]
})

// 獲取可用格式列表
ipcMain.handle('get-formats', async (event, { url }) => {
  const binaryPath = getBinaryPath()
  
  console.log('[get-formats] Fetching formats for URL:', url)
  win?.webContents.send('download-log', `[格式查詢] 正在獲取可用格式...`)
  
  // 檢查二進制文件是否存在
  if (!fs.existsSync(binaryPath)) {
    const errorMsg = `Binary not found at: ${binaryPath}`
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  const args = [
    url,
    '-F', // 列出所有可用格式
    '--no-warnings'
  ]

  console.log('[get-formats] Running command:', binaryPath, args.join(' '))

  return new Promise((resolve, reject) => {
    const worker = spawn(binaryPath, args)
    let output = ''
    let errorOutput = ''

    worker.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      console.log('[get-formats] stdout:', text)
    })

    worker.stderr.on('data', (data) => {
      const text = data.toString()
      errorOutput += text
      console.error('[get-formats] stderr:', text)
    })

    worker.on('close', (code) => {
      console.log('[get-formats] Process exited with code:', code)
      
      if (code === 0) {
        // 解析格式列表
        const formats = parseFormats(output)
        console.log('[get-formats] Parsed formats:', formats.length)
        win?.webContents.send('download-log', `[格式查詢] 找到 ${formats.length} 個可用格式`)
        resolve({ formats, rawOutput: output })
      } else {
        const error = new Error(`Failed to get formats: ${errorOutput || 'Unknown error'}`)
        console.error('[get-formats] Error:', error)
        reject(error)
      }
    })
    
    worker.on('error', (err) => {
      console.error('[get-formats] Spawn error:', err)
      reject(err)
    })
  })
})

// 解析 yt-dlp -F 輸出的格式列表
function parseFormats(output: string): Array<{
  id: string
  ext: string
  resolution: string
  fps: string
  filesize: string
  tbr: string
  proto: string
  vcodec: string
  acodec: string
  note: string
}> {
  const formats: Array<any> = []
  const lines = output.split('\n')
  
  // 找到格式列表開始的位置 (通常在 "ID" 開頭的行之後)
  let startIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^ID\s+EXT\s+RESOLUTION/i)) {
      startIndex = i + 1
      break
    }
  }
  
  if (startIndex === -1) {
    console.warn('[parseFormats] Could not find format table header')
    return formats
  }
  
  // 解析每一行格式信息
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('---')) continue
    
    // 格式行通常以格式ID開頭 (數字或數字+字母組合)
    const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)?\s*(.*)/)
    if (match) {
      const [, id, ext, resolution, rest] = match
      
      // 跳過非格式行 (如 "audio only" 等描述性文字開頭的行)
      if (!/^\d/.test(id)) continue
      
      // 解析剩餘部分
      const parts = rest ? rest.trim().split(/\s+/) : []
      
      formats.push({
        id,
        ext,
        resolution: resolution || 'audio only',
        fps: extractFps(rest || ''),
        filesize: extractFilesize(rest || ''),
        tbr: extractTbr(rest || ''),
        proto: extractProto(rest || ''),
        vcodec: extractCodec(rest || '', 'v'),
        acodec: extractCodec(rest || '', 'a'),
        note: extractNote(line)
      })
    }
  }
  
  console.log('[parseFormats] Parsed formats count:', formats.length)
  return formats
}

// 輔助函數：提取幀率
function extractFps(text: string): string {
  const match = text.match(/(\d+)fps/)
  return match ? match[1] + 'fps' : ''
}

// 輔助函數：提取文件大小
function extractFilesize(text: string): string {
  const match = text.match(/(\d+\.?\d*[KMG]iB)/)
  return match ? match[1] : ''
}

// 輔助函數：提取比特率
function extractTbr(text: string): string {
  const match = text.match(/(\d+\.?\d*k)/)
  return match ? match[1] : ''
}

// 輔助函數：提取協議
function extractProto(text: string): string {
  const match = text.match(/(https?|m3u8|mhtml)/)
  return match ? match[1] : ''
}

// 輔助函數：提取編解碼器
function extractCodec(text: string, type: 'v' | 'a'): string {
  if (type === 'v') {
    const match = text.match(/vcodec:(\S+)/) || text.match(/(avc1|vp9|av01|h264)/)
    return match ? match[1] : ''
  } else {
    const match = text.match(/acodec:(\S+)/) || text.match(/(opus|mp4a|aac)/)
    return match ? match[1] : ''
  }
}

// 輔助函數：提取備註
function extractNote(line: string): string {
  const match = line.match(/\(([^)]+)\)$/)
  return match ? match[1] : ''
}

// 監聽下載請求
ipcMain.handle('start-download', async (event, { url, cookiePath, formatId, downloadPath }) => {
  const binaryPath = getBinaryPath()
  // 使用傳入的 downloadPath，如果沒有則使用預設的 Downloads 目錄
  const finalDownloadPath = downloadPath || app.getPath('downloads')
  console.log('[start-download] Final download path:', finalDownloadPath)
  const ffmpegPath = getFfmpegPath()

  console.log('Binary Path:', binaryPath)
  console.log('FFmpeg Path:', ffmpegPath)
  console.log('Format ID:', formatId || 'best (default)')
  win?.webContents.send('download-log', `Binary Path: ${binaryPath}`)
  win?.webContents.send('download-log', `FFmpeg Path: ${ffmpegPath}`)
  win?.webContents.send('download-log', `Format ID: ${formatId || 'best (default)'}`)
  win?.webContents.send('download-log', `Download Path: ${finalDownloadPath}`)
  
  // 检查二进制文件是否存在
  if (!fs.existsSync(binaryPath)) {
      const errorMsg = `Binary not found at: ${binaryPath}`
      console.error(errorMsg)
      win?.webContents.send('download-log', errorMsg)
      throw new Error(errorMsg)
  }

  const args = [
    url,
    '-o', path.join(finalDownloadPath, '%(title)s.%(ext)s'),
    '--newline', // 确保进度输出换行
    '--no-colors', // 禁用颜色代码，方便正则解析
    '--progress',
    '--verbose', // 开启详细日志
    '--ffmpeg-location', ffmpegPath // 指定 ffmpeg 路径
  ]

  // 如果指定了格式 ID，使用 -f 參數
  if (formatId) {
    args.push('-f', formatId)
    win?.webContents.send('download-log', `使用指定格式: ${formatId}`)
  }

  if (cookiePath && fs.existsSync(cookiePath)) {
    args.push('--cookies', cookiePath)
  }

  win?.webContents.send('download-log', `Starting download with args: ${args.join(' ')}`)

  return new Promise((resolve, reject) => {
    const worker = spawn(binaryPath, args)

    worker.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('yt-dlp output:', output)

      // 解析进度
      const progressMatch = output.match(/(\d{1,3}\.\d)%/)
      if (progressMatch) {
        const percent = parseFloat(progressMatch[1])
        win?.webContents.send('download-progress', percent)
      }
      
      // 发送原始日志给前端
      const lines = output.split('\n').filter((line: string) => line.trim() !== '')
      lines.forEach((line: string) => {
          win?.webContents.send('download-log', line)
      })
    })

    worker.stderr.on('data', (data) => {
      const errorOutput = data.toString()
      console.error(`stderr: ${errorOutput}`)
      win?.webContents.send('download-log', `STDERR: ${errorOutput}`)
    })

    worker.on('close', (code) => {
      console.log(`Process exited with code ${code}`)
      win?.webContents.send('download-log', `Process exited with code ${code}`)
      if (code === 0) {
        resolve({ status: 'success', path: finalDownloadPath })
      } else {
        reject(new Error(`Process exited with code ${code}`))
      }
    })
    
    worker.on('error', (err) => {
        console.error('Spawn error:', err)
        win?.webContents.send('download-log', `Spawn Error: ${err.message}`)
        reject(err)
    })
  })
})

app.whenReady().then(createWindow)
