/**
 * 定义了日期分组的键。
 */
export type DateGroupKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'lastMonth' | 'older'

/**
 * 定义了时间显示的格式。
 */
export type TimeFormat = 'time' | 'date'

// 帮助函数：获取给定日期所在周的开始（周日）
const getStartOfWeek = (date: Date): Date => {
  const dt = new Date(date)
  const day = dt.getDay() // 0 for Sunday, 1 for Monday, etc.
  dt.setDate(dt.getDate() - day)
  dt.setHours(0, 0, 0, 0)
  return dt
}

/**
 * 将一个项目数组按日期分组。
 * @param items - 要分组的项目数组。
 * @param getDate - 一个函数，用于从每个项目中提取 Date 对象。
 * @returns 一个记录，其中键是 DateGroupKey，值是该组的项目数组。
 */
export const groupItemsByDate = <T>(items: T[], getDate: (item: T) => Date): Record<DateGroupKey, T[]> => {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(todayStart.getDate() - 1)

  const thisWeekStart = getStartOfWeek(now)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const initialGroups: Record<DateGroupKey, T[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    lastWeek: [],
    lastMonth: [],
    older: []
  }

  // 先按日期降序排序
  const sortedItems = [...items].sort((a, b) => getDate(b).getTime() - getDate(a).getTime())

  return sortedItems.reduce((acc, item) => {
    const itemDate = getDate(item)
    if (itemDate >= todayStart) acc.today.push(item)
    else if (itemDate >= yesterdayStart) acc.yesterday.push(item)
    else if (itemDate >= thisWeekStart) acc.thisWeek.push(item)
    else if (itemDate >= lastWeekStart) acc.lastWeek.push(item)
    else if (itemDate >= lastMonthStart) acc.lastMonth.push(item)
    else acc.older.push(item)
    return acc
  }, initialGroups)
}

/**
 * 根据日期分组的键获取相应的时间显示格式。
 * @param groupKey - 日期分组的键。
 * @returns 对应的时间格式 ('time' 或 'date')。
 */
export const getTimeFormatForGroup = (groupKey: DateGroupKey): TimeFormat => {
  return groupKey === 'today' || groupKey === 'yesterday' ? 'time' : 'date'
}
