const iconCache = new Map<string, any>()

const DATA_BACKUP_ICONS = {
  joplin: require('@/assets/images/dataIcons/joplin.png'),
  notion: require('@/assets/images/dataIcons/notion.png'),
  nutstore: require('@/assets/images/dataIcons/nutstore.png'),
  obsidian: require('@/assets/images/dataIcons/obsidian.png'),
  siyuan: require('@/assets/images/dataIcons/siyuan.png'),
  yuque: require('@/assets/images/dataIcons/yuque.png')
}

export function getDataBackupIcon(providerId: string, isDark: boolean): any {
  const cacheKey = `${providerId}-${isDark}`

  // 检查缓存
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)
  }

  const dataBackupIcons = DATA_BACKUP_ICONS
  let result = null

  for (const key in dataBackupIcons) {
    const regex = new RegExp(key, 'i')

    if (regex.test(providerId)) {
      result = dataBackupIcons[key as keyof typeof dataBackupIcons]
      break
    }
  }

  // 缓存结果
  iconCache.set(cacheKey, result)
  return result
}
