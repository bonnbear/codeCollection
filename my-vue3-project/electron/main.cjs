const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs/promises')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { pathToFileURL } = require('url')

const execFileAsync = promisify(execFile)

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.ogg'])
const LOSSLESS_EXTENSIONS = new Set(['.wav', '.flac', '.aiff', '.alac'])
const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#0b1016',
    title: 'Electron FFmpeg Music Player',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:8081')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

async function findAudioFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await findAudioFiles(fullPath)))
      continue
    }

    if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath)
    }
  }

  return results
}

function inferLossless(filePath, codecName = '') {
  const ext = path.extname(filePath).toLowerCase()
  return LOSSLESS_EXTENSIONS.has(ext) || ['flac', 'pcm_s16le', 'pcm_s24le', 'alac'].includes(codecName)
}

function inferTitle(filePath) {
  return path.basename(filePath, path.extname(filePath))
}

async function checkFFprobe() {
  try {
    await execFileAsync('ffprobe', ['-version'])
    return { available: true, command: 'ffprobe' }
  } catch (error) {
    return {
      available: false,
      command: 'ffprobe',
      message: error.message,
    }
  }
}

async function probeTrack(filePath) {
  const fallback = {
    id: filePath,
    path: filePath,
    src: pathToFileURL(filePath).href,
    title: inferTitle(filePath),
    artist: '未知艺术家',
    album: '未知专辑',
    format: path.extname(filePath).slice(1).toUpperCase(),
    codec: 'unknown',
    duration: 0,
    bitrate: 0,
    sampleRate: 0,
    channels: 0,
    isLossless: inferLossless(filePath),
  }

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ])

    const payload = JSON.parse(stdout || '{}')
    const format = payload.format || {}
    const audioStream = (payload.streams || []).find((stream) => stream.codec_type === 'audio') || {}
    const tags = { ...(format.tags || {}), ...(audioStream.tags || {}) }
    const codec = audioStream.codec_name || 'unknown'

    return {
      ...fallback,
      title: tags.title || inferTitle(filePath),
      artist: tags.artist || tags.album_artist || '未知艺术家',
      album: tags.album || '未知专辑',
      format: (format.format_name || fallback.format).toUpperCase(),
      codec,
      duration: Number(format.duration || audioStream.duration || 0),
      bitrate: Number(format.bit_rate || 0),
      sampleRate: Number(audioStream.sample_rate || 0),
      channels: Number(audioStream.channels || 0),
      isLossless: inferLossless(filePath, codec),
    }
  } catch (error) {
    return {
      ...fallback,
      probeError: error.message,
    }
  }
}

ipcMain.handle('app:get-environment', async () => {
  const ffprobe = await checkFFprobe()
  return {
    platform: process.platform,
    ffprobe,
  }
})

ipcMain.handle('music:select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择音乐文件夹',
  })

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true }
  }

  return {
    canceled: false,
    folderPath: result.filePaths[0],
  }
})

ipcMain.handle('music:scan-folder', async (_event, folderPath) => {
  const filePaths = await findAudioFiles(folderPath)
  const tracks = await Promise.all(filePaths.map((filePath) => probeTrack(filePath)))

  return {
    folderPath,
    count: tracks.length,
    tracks,
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
