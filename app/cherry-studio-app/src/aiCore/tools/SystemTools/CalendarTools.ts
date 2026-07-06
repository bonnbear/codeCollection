import { tool } from 'ai'
import * as Calendar from 'expo-calendar'
import { z } from 'zod'

/**
 * Get all Calendars
 */
export const getAllCalendars = tool({
  description: 'Get all calendars',
  inputSchema: z.object({}),
  execute: async () => {
    await Calendar.requestCalendarPermissionsAsync()

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)

    const events = calendars.map(c => {
      return {
        id: c.id,
        title: c.title
      }
    })

    return { events }
  }
})

export const getCalendarEvents = tool({
  description: 'Get calendar events within a specific time period',
  inputSchema: z.object({
    calendarIds: z.array(z.string()).describe('Array of IDs of calendars to search for events in'),
    startDate: z.string().describe('Beginning of time period to search for events in (ISO 8601 date string)'),
    endDate: z.string().describe('End of time period to search for events in (ISO 8601 date string)')
  }),
  execute: async ({ calendarIds, startDate, endDate }) => {
    await Calendar.requestCalendarPermissionsAsync()

    const events = await Calendar.getEventsAsync(calendarIds, new Date(startDate), new Date(endDate))

    return {
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location || undefined,
        notes: event.notes || undefined,
        calendarId: event.calendarId
      }))
    }
  }
})

/**
 * Creates a new calendar event with specified title, date, time and duration
 */
export const createCalendarEvent = tool({
  description: 'Create a new calendar event',
  inputSchema: z.object({
    calendarId: z.string().describe('Calendar ID'),
    title: z.string().describe('Event title'),
    date: z.string().describe('Event date (YYYY-MM-DD)'),
    time: z.string().optional().describe('Event time (HH:MM)'),
    duration: z.number().optional().describe('Duration in minutes')
  }),
  execute: async ({ calendarId, title, date, time, duration = 60 }) => {
    await Calendar.requestCalendarPermissionsAsync()

    const eventDate = new Date(date)
    if (time) {
      const [hours, minutes] = time.split(':').map(Number)
      eventDate.setHours(hours, minutes)
    }

    await Calendar.createEventAsync(calendarId, {
      title,
      startDate: eventDate,
      endDate: new Date(eventDate.getTime() + duration * 60 * 1000)
    })

    return { message: `Created "${title}"` }
  }
})

/**
 * Combined export of all calendar tools as a ToolSet
 */
export const calendarTools = {
  GetAllCalendars: getAllCalendars,
  CreateCalendarEvent: createCalendarEvent,
  GetCalendarEvents: getCalendarEvents
}
