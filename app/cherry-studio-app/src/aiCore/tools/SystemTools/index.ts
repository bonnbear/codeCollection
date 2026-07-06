import { calendarTools } from './CalendarTools'
import { fetchTools } from './FetchTools'
import { reminderTools } from './ReminderTools'
import { timeTools } from './TimeTools'

export const SystemTool = {
  ...calendarTools,
  ...timeTools,
  ...fetchTools,
  ...reminderTools
}

export type SystemToolKeys = keyof typeof SystemTool
