<!-- Calendar.vue -->
<template>
  <div class="calendar-container">
    <div class="dark-calendar">
      <div class="calendar-header">
        <div class="navigation">
          <button class="nav-btn" @click="goToLastYear">«</button>
          <button class="nav-btn" @click="goToLastMonth">‹</button>
          <div class="current-date">{{ currentYear }} {{ monthNames[currentMonth] }}</div>
          <button class="nav-btn" @click="goToNextMonth">›</button>
          <button class="nav-btn" @click="goToNextYear">»</button>
        </div>
        <button class="expand-btn" @click="toggleExpand">
          {{ isExpanded ? '收起' : '展开' }}
        </button>
      </div>

      <div class="weekdays">
        <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
      </div>

      <div class="days-grid" :class="{ 'collapsed': !isExpanded }">
        <template v-for="(week, weekIndex) in weeks" :key="weekIndex">
          <div
            v-for="day in week"
            :key="day.date"
            class="day"
            :class="{
              'other-month': !day.isCurrentMonth,
              'today': day.isToday,
              'selected': isSelected(day.date),
              'hidden': !isExpanded && !isCurrentWeek(weekIndex),
              'has-events': hasEvents(day.date)
            }"
            @click="selectDate(day.date)"
          >
            {{ day.dayNumber }}
          </div>
        </template>
      </div>
    </div>

    <div class="events-list">
      <div class="events-header">
        <h3>Events for {{ formatDate(selectedDate) }}</h3>
        <button class="add-event-btn" @click="showAddEventModal">+ Add Event</button>
      </div>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="events.length === 0" class="no-events">No events for this day</div>
      <div v-else class="events">
        <div v-for="event in events" :key="event.id" class="event-item">
          <div class="event-time">{{ formatTime(event.time) }}</div>
          <div class="event-content">
            <div class="event-title">{{ event.title }}</div>
            <div class="event-description">{{ event.description }}</div>
          </div>
          <div class="event-actions">
            <button @click="deleteEvent(event.id)" class="delete-btn">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Event Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h3>Add New Event</h3>
        <form @submit.prevent="addNewEvent">
          <div class="form-group">
            <label>Time:</label>
            <input type="time" v-model="newEvent.time" required>
          </div>
          <div class="form-group">
            <label>Title:</label>
            <input type="text" v-model="newEvent.title" required>
          </div>
          <div class="form-group">
            <label>Description:</label>
            <textarea v-model="newEvent.description" required></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn">Add Event</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'

const currentDate = ref(new Date())
const selectedDate = ref(new Date())
const currentMonth = ref(currentDate.value.getMonth())
const currentYear = ref(currentDate.value.getFullYear())
const isExpanded = ref(false)
const loading = ref(false)
const events = ref([])
const showModal = ref(false)

const newEvent = ref({
  time: '',
  title: '',
  description: ''
})

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const days = computed(() => {
  const daysArray = []
  
  const firstDayOfMonth = new Date(currentYear.value, currentMonth.value, 1)
  const lastDayOfMonth = new Date(currentYear.value, currentMonth.value + 1, 0)
  
  const firstDayWeekday = firstDayOfMonth.getDay()
  const prevMonthDays = new Date(currentYear.value, currentMonth.value, 0).getDate()
  
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const date = new Date(currentYear.value, currentMonth.value - 1, prevMonthDays - i)
    daysArray.push({
      date,
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date())
    })
  }
  
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const date = new Date(currentYear.value, currentMonth.value, i)
    daysArray.push({
      date,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: isSameDay(date, new Date())
    })
  }
  
  const remainingDays = 42 - daysArray.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, i)
    daysArray.push({
      date,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date())
    })
  }
  
  return daysArray
})

const weeks = computed(() => {
  const weeksArray = []
  for (let i = 0; i < days.value.length; i += 7) {
    weeksArray.push(days.value.slice(i, i + 7))
  }
  return weeksArray
})

const currentWeekIndex = computed(() => {
  const today = new Date()
  return weeks.value.findIndex(week => 
    week.some(day => isSameDay(day.date, today))
  )
})

// Calendar Navigation Functions
const isCurrentWeek = (weekIndex) => {
  return weekIndex === currentWeekIndex.value
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const goToLastMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const goToNextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const goToLastYear = () => {
  currentYear.value--
}

const goToNextYear = () => {
  currentYear.value++
}

// Date Utilities
const isSameDay = (date1, date2) => {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear()
}

const isSelected = (date) => {
  return isSameDay(date, selectedDate.value)
}

const selectDate = (date) => {
  selectedDate.value = date
}

// Events Management
const fetchEvents = async (date) => {
  loading.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Generate mock data
    const mockEvents = [
      {
        id: Date.now(),
        time: '09:00',
        title: 'Morning Meeting',
        description: 'Team sync-up meeting'
      },
      {
        id: Date.now() + 1,
        time: '14:30',
        title: 'Project Review',
        description: 'Q4 project status review'
      },
      {
        id: Date.now() + 2,
        time: '16:00',
        title: 'Client Call',
        description: 'Discussion about new requirements'
      }
    ].filter(() => Math.random() > 0.5)
    
    events.value = mockEvents
  } catch (error) {
    console.error('Error fetching events:', error)
    events.value = []
  } finally {
    loading.value = false
  }
}

const hasEvents = (date) => {
  return Math.random() > 0.7
}

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (time) => {
  return time
}

// Modal Management
const showAddEventModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  newEvent.value = {
    time: '',
    title: '',
    description: ''
  }
}

const addNewEvent = () => {
  const event = {
    id: Date.now(),
    ...newEvent.value
  }
  events.value.push(event)
  closeModal()
}

const deleteEvent = (eventId) => {
  events.value = events.value.filter(event => event.id !== eventId)
}

// Watch for selected date changes
watch(selectedDate, (newDate) => {
  fetchEvents(newDate)
})

// Initial fetch
fetchEvents(selectedDate.value)
</script>

<style scoped>
.calendar-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.dark-calendar {
  width: 300px;
  background: #1c1c1c;
  border-radius: 8px;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
}

.calendar-header {
  margin-bottom: 16px;
}

.navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #ffffff;
  margin-bottom: 8px;
}

.nav-btn {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  transition: background-color 0.2s;
}

.nav-btn:hover {
  background-color: #333333;
  border-radius: 4px;
}

.expand-btn {
  width: 100%;
  background: #333333;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.expand-btn:hover {
  background-color: #444444;
}

.current-date {
  font-size: 16px;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.weekday {
  color: #666666;
  font-size: 14px;
  text-align: center;
  padding: 4px 0;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  transition: all 0.3s ease-in-out;
}

.days-grid.collapsed {
  grid-template-rows: 1fr;
}

.day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
  transition: all 0.2s;
  position: relative;
}

.day.hidden {
  display: none;
}

.day:hover {
  background-color: #333333;
}

.day.has-events::before {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 4px;
  height: 4px;
  background-color: #00ff00;
  border-radius: 50%;
}

.other-month {
  color: #666666;
}

.today {
  color: #0066ff;
  font-weight: bold;
  position: relative;
}

.today::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background-color: #0066ff;
  border-radius: 50%;
}

.selected {
  background-color: #2a2a2a;
  border: 1px solid #0066ff;
  color: #ffffff;
}

.today.selected {
  background-color: #2a2a2a;
  color: #0066ff;
}

.events-list {
  background: #1c1c1c;
  border-radius: 8px;
  padding: 16px;
  min-height: 200px;
}

.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.events-header h3 {
  color: #ffffff;
  margin: 0;
  font-size: 16px;
}

.add-event-btn {
  background: #0066ff;
  border: none;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-event-btn:hover {
  background: #0052cc;
}

.loading, .no-events {
  color: #666666;
  text-align: center;
  padding: 20px;
}

.events {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #2a2a2a;
  border-radius: 6px;
}

.event-time {
  color: #0066ff;
  font-weight: bold;
  min-width: 60px;
}

.event-content {
  flex: 1;
}

.event-title {
  color: #ffffff;
  font-weight: bold;
  margin-bottom: 4px;
}

.event-description {
  color: #999999;
  font-size: 14px;
}

.event-actions {
  display: flex;
  align-items: center;
}

.delete-btn {
  background: #ff4444;
  border: none;
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background: #cc0000;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #1c1c1c;
  padding: 24px;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
}

.modal-content h3 {
  color: #ffffff;
  margin: 0 0 20px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: #ffffff;
  margin-bottom: 8px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #333333;
  border-radius: 4px;
  background: #2a2a2a;
  color: #ffffff;
}

.form-group textarea {
  height: 100px;
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.cancel-btn {
  background: #333333;
  border: none;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  background: #0066ff;
  border: none;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #444444;
}

.submit-btn:hover {
  background: #0052cc;
}
</style>
