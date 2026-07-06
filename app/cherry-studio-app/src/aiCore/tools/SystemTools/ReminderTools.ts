import { tool } from 'ai'
import * as Calendar from 'expo-calendar'
import { z } from 'zod'

/**
 * Get all Reminders (iOS only)
 */
export const getAllReminders = tool({
  description: 'Get all reminders',
  inputSchema: z.object({}),
  execute: async () => {
    // Request reminders permissions (iOS) or fallback to calendar permissions
    if (Calendar.requestRemindersPermissionsAsync) {
      await Calendar.requestRemindersPermissionsAsync()
    } else {
      await Calendar.requestCalendarPermissionsAsync()
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER)

    const reminders = calendars.map(c => {
      return {
        id: c.id,
        title: c.title
      }
    })

    return { reminders }
  }
})

/**
 * Get reminders within a specific time period
 */
export const getReminders = tool({
  description: 'Get reminders within a specific time period',
  inputSchema: z.object({
    calendarIds: z.array(z.string()).describe('Array of IDs of calendars to search for reminders in'),
    startDate: z.string().describe('Beginning of time period to search for reminders in (ISO 8601 date string)'),
    endDate: z.string().describe('End of time period to search for reminders in (ISO 8601 date string)')
  }),
  execute: async ({ calendarIds, startDate, endDate }) => {
    // Request reminders permissions (iOS) or fallback to calendar permissions
    if (Calendar.requestRemindersPermissionsAsync) {
      await Calendar.requestRemindersPermissionsAsync()
    } else {
      await Calendar.requestCalendarPermissionsAsync()
    }

    const reminders = await Calendar.getRemindersAsync(calendarIds, null, new Date(startDate), new Date(endDate))

    return {
      reminders: reminders.map(reminder => ({
        id: reminder.id,
        title: reminder.title,
        startDate: reminder.startDate,
        dueDate: reminder.dueDate,
        completed: reminder.completed,
        completionDate: reminder.completionDate,
        location: reminder.location || undefined,
        notes: reminder.notes || undefined,
        calendarId: reminder.calendarId
      }))
    }
  }
})

/**
 * Create a new reminder
 */
export const createReminder = tool({
  description: 'Create a new reminder',
  inputSchema: z.object({
    calendarId: z.string().describe('Calendar ID'),
    title: z.string().describe('Reminder title'),
    dueDate: z.string().optional().describe('Due date (ISO 8601 date string)'),
    notes: z.string().optional().describe('Reminder notes'),
    location: z.string().optional().describe('Reminder location')
  }),
  execute: async ({ calendarId, title, dueDate, notes, location }) => {
    // Request reminders permissions (iOS) or fallback to calendar permissions
    if (Calendar.requestRemindersPermissionsAsync) {
      await Calendar.requestRemindersPermissionsAsync()
    } else {
      await Calendar.requestCalendarPermissionsAsync()
    }

    const reminderDetails: any = {
      title,
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(notes && { notes }),
      ...(location && { location })
    }

    await Calendar.createReminderAsync(calendarId, reminderDetails)

    return { message: `Created reminder "${title}"` }
  }
})

/**
 * Delete a reminder
 */
export const deleteReminder = tool({
  description: 'Delete a reminder',
  inputSchema: z.object({
    reminderId: z.string().describe('Reminder ID to delete')
  }),
  execute: async ({ reminderId }) => {
    // Request reminders permissions (iOS) or fallback to calendar permissions
    if (Calendar.requestRemindersPermissionsAsync) {
      await Calendar.requestRemindersPermissionsAsync()
    } else {
      await Calendar.requestCalendarPermissionsAsync()
    }

    await Calendar.deleteReminderAsync(reminderId)

    return { message: 'Reminder deleted successfully' }
  }
})

/**
 * Combined export of all reminder tools as a ToolSet
 */
export const reminderTools = {
  GetAllReminders: getAllReminders,
  GetReminders: getReminders,
  CreateReminder: createReminder,
  DeleteReminder: deleteReminder
}
