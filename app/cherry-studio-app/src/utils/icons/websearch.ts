const iconCache = new Map<string, any>()

const WEB_SEARCH_PROVIDER_ICONS = {
  google: require('@/assets/images/websearchIcons/google.png'),
  bing: require('@/assets/images/websearchIcons/bing.png'),
  baidu: require('@/assets/images/websearchIcons/baidu.png'),
  exa: require('@/assets/images/websearchIcons/exa.png'),
  bocha: require('@/assets/images/websearchIcons/bocha.png'),
  searxng: require('@/assets/images/websearchIcons/searxng.png'),
  tavily: require('@/assets/images/websearchIcons/tavily.png'),
  zhipu: require('@/assets/images/websearchIcons/zhipu.png')
}

export function getWebSearchProviderIcon(providerId: string, isDark: boolean): any {
  const cacheKey = `${providerId}-${isDark}`

  // 检查缓存
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)
  }

  const webSearchIcons = WEB_SEARCH_PROVIDER_ICONS
  let result = null

  for (const key in webSearchIcons) {
    const regex = new RegExp(key, 'i')

    if (regex.test(providerId)) {
      result = webSearchIcons[key as keyof typeof webSearchIcons]
      break
    }
  }

  // 缓存结果
  iconCache.set(cacheKey, result)
  return result
}
