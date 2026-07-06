/// <reference types="vite/client" />

// 格式信息類型
interface VideoFormat {
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
}

// 定義 window.electron API 的類型
interface Window {
  electron: {
    startDownload: (params: { url: string; cookiePath?: string; formatId?: string; downloadPath?: string }) => Promise<{ status: string; path: string }>
    getFormats: (params: { url: string }) => Promise<{ formats: VideoFormat[]; rawOutput: string }>
    selectDirectory: () => Promise<string | null>
    onProgress: (callback: (progress: number) => void) => void
    onLog: (callback: (log: string) => void) => void
    removeListeners: () => void
  }
}
