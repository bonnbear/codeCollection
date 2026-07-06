import { File } from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'

import { loggerService } from '@/services/LoggerService'

const logger = loggerService.withContext('ImageSaveService')

export interface SaveImageResult {
  success: boolean
  message: string
}

/**
 * 保存图片到系统相册
 * @param imageUri 图片的 URI 地址
 * @returns Promise<SaveImageResult> 保存结果
 */
export async function saveImageToGallery(imageUri: string): Promise<SaveImageResult> {
  try {
    // 请求媒体库权限
    const { status } = await MediaLibrary.requestPermissionsAsync()

    if (status !== 'granted') {
      logger.warn('Media library permission denied')
      return {
        success: false,
        message: 'Permission denied. Please allow photo library access in Settings.'
      }
    }

    // 检查文件是否存在
    const fileInfo = new File(imageUri).info()

    if (!fileInfo.exists) {
      logger.error('Image file not found:', imageUri)
      return {
        success: false,
        message: 'Image file not found.'
      }
    }

    // 保存图片到相册
    await MediaLibrary.saveToLibraryAsync(imageUri)

    logger.info('Image saved to gallery successfully')
    return {
      success: true,
      message: 'Image saved to gallery successfully.'
    }
  } catch (error) {
    logger.error('Error saving image to gallery:', error)
    return {
      success: false,
      message: 'Failed to save image. Please try again.'
    }
  }
}

/**
 * 检查是否有媒体库访问权限
 * @returns Promise<boolean> 是否有权限
 */
export async function hasMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.getPermissionsAsync()
    return status === 'granted'
  } catch (error) {
    logger.error('Error checking media library permission:', error)
    return false
  }
}
