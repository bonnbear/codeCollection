import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

import { loggerService } from '@/services/LoggerService'
const logger = loggerService.withContext('Fallback Favicon')

// 记录失败的URL的缓存键前缀
const FAILED_FAVICON_CACHE_PREFIX = 'failed_favicon_'
// 失败URL的缓存时间 (24小时)
const FAILED_FAVICON_CACHE_DURATION = 24 * 60 * 60 * 1000

// 检查URL是否在失败缓存中 (异步)
const isUrlFailedRecently = async (url: string): Promise<boolean> => {
  const cacheKey = `${FAILED_FAVICON_CACHE_PREFIX}${url}`
  const cachedTimestamp = await AsyncStorage.getItem(cacheKey)

  if (!cachedTimestamp) return false

  const timestamp = parseInt(cachedTimestamp, 10)
  const now = Date.now()

  // 如果时间戳在缓存期内，则认为URL仍处于失败状态
  if (now - timestamp < FAILED_FAVICON_CACHE_DURATION) {
    return true
  }

  // 清除过期的缓存
  await AsyncStorage.removeItem(cacheKey)
  return false
}

// 记录失败的URL到缓存 (异步)
const markUrlAsFailed = async (url: string): Promise<void> => {
  const cacheKey = `${FAILED_FAVICON_CACHE_PREFIX}${url}`
  await AsyncStorage.setItem(cacheKey, Date.now().toString())
}

// FallbackFavicon component that tries multiple favicon sources
interface FallbackFaviconProps {
  hostname: string
  alt: string
}

const FallbackFavicon: React.FC<FallbackFaviconProps> = ({ hostname }) => {
  type FaviconState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'failed' }
    | { status: 'loaded'; src: string }

  const [faviconState, setFaviconState] = useState<FaviconState>({ status: 'idle' })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const findBestFavicon = async () => {
      setFaviconState({ status: 'loading' })

      const faviconUrls = [
        `https://icon.horse/icon/${hostname}`,
        `https://favicon.splitbee.io/?url=${hostname}`,
        `https://favicon.im/${hostname}`,
        `https://${hostname}/favicon.ico`
      ]

      const urlStatuses = await Promise.all(
        faviconUrls.map(async url => ({ url, failed: await isUrlFailedRecently(url) }))
      )
      const validFaviconUrls = urlStatuses.filter(item => !item.failed).map(item => item.url)

      const urlsToTry = validFaviconUrls.length > 0 ? validFaviconUrls : [faviconUrls[0]]

      const faviconPromises = urlsToTry.map(url =>
        fetch(url, { method: 'HEAD', signal, credentials: 'omit' })
          .then(response => {
            if (response.ok) return url
            if (response.status >= 400) markUrlAsFailed(url)
            throw new Error(`Failed to fetch ${url}`)
          })
          .catch(error => {
            if (error.name === 'AbortError') throw error
            return null
          })
      )

      const timeoutPromise = new Promise<string>(resolve => {
        const timer = setTimeout(() => resolve(faviconUrls[0]), 2000)
        signal.addEventListener('abort', () => clearTimeout(timer))
      })

      try {
        const bestUrl = await Promise.race([
          Promise.any(faviconPromises.filter(p => p !== null)).then(result => result || faviconUrls[0]),
          timeoutPromise
        ])
        setFaviconState({ status: 'loaded', src: bestUrl })
      } catch (error) {
        // Logger.log('All favicon requests failed:', error)
        logger.error('All favicon requests failed:', error)
        setFaviconState({ status: 'loaded', src: faviconUrls[0] })
      }
    }

    findBestFavicon()

    return () => {
      controller.abort()
    }
  }, [hostname])

  const handleError = () => {
    if (faviconState.status === 'loaded') {
      markUrlAsFailed(faviconState.src)
    }

    setFaviconState({ status: 'failed' })
  }

  if (faviconState.status === 'failed') {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>{hostname.charAt(0).toUpperCase()}</Text>
      </View>
    )
  }

  if (faviconState.status === 'loaded') {
    return <Image source={{ uri: faviconState.src }} style={styles.favicon} onError={handleError} />
  }

  return <View style={styles.loading} />
}

const styles = StyleSheet.create({
  loading: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E5E7EB'
  },
  placeholder: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: 'bold'
  },
  favicon: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#F3F4F6'
  }
})

export default FallbackFavicon
