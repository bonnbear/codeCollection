import type { FileSchema } from '@mistralai/mistralai/models/components'

export enum FileTypes {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
  DOCUMENT = 'document',
  OTHER = 'other'
}

/**
 * @interface
 * @description 文件元数据接口
 */
export interface FileMetadata {
  /**
   * 文件的唯一标识符
   */
  id: string
  /**
   * 文件名
   */
  name: string
  /**
   * 文件的原始名称（展示名称）
   */
  origin_name: string
  /**
   * 文件路径
   */
  path: string
  /**
   * 文件大小，单位为字节
   */
  size: number
  /**
   * 文件扩展名（包含.）
   */
  ext: string
  /**
   * 文件类型
   */
  type: FileTypes
  /**
   * 文件创建时间的ISO字符串
   */
  created_at: number
  /**
   * 文件计数
   */
  count: number
  /**
   * 该文件预计的token大小 (可选)
   */
  tokens?: number
}

export interface RemoteFile {
  type: 'gemini' | 'mistral'
  file: File | FileSchema
}

export type FileStatus = 'success' | 'processing' | 'failed' | 'unknown'

export interface FileUploadResponse {
  fileId: string
  displayName: string
  status: FileStatus
  originalFile?: RemoteFile
}
