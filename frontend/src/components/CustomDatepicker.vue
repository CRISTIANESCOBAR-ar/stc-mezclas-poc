<template>
  <div class="fecha-controls inline-flex items-center gap-2">
    <label v-if="label" class="text-sm text-slate-600 font-medium">{{ label }}</label>

    <div class="custom-datepicker relative" ref="datepickerRef">
      <input
        type="text"
        :value="displayDate"
        class="datepicker-input w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all cursor-pointer bg-white"
        :placeholder="placeholder"
        @click="toggleCalendar"
        @keydown.left.prevent="cambiarFecha(-1)"
        @keydown.right.prevent="cambiarFecha(1)"
        dir="ltr"
        readonly
      />
      <span class="calendar-icon absolute right-3 top-1/2 -translate-y-1/2 text-sm cursor-pointer select-none" @click="toggleCalendar">📅</span>

      <div
        v-if="showCalendar"
        ref="dropdownRef"
        :class="[
          'calendar-dropdown absolute top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 min-w-72',
          alignRight ? 'right-0' : 'left-0'
        ]"
      >
        <div class="calendar-header flex justify-between items-center mb-3">
          <button class="calendar-nav-btn w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors" @click.stop="changeMonth(-1)">&lt;</button>
          <div class="calendar-selects flex gap-1">
            <select
              :value="currentMonth.getMonth()"
              @change="updateMonth"
              @click.stop
              class="calendar-select text-sm font-semibold text-slate-700 bg-transparent border-none cursor-pointer hover:bg-slate-100 rounded px-1 focus:ring-0"
            >
              <option v-for="(month, index) in monthNames" :key="index" :value="index">
                {{ month }}
              </option>
            </select>
            <select
              :value="currentMonth.getFullYear()"
              @change="updateYear"
              @click.stop
              class="calendar-select text-sm font-semibold text-slate-700 bg-transparent border-none cursor-pointer hover:bg-slate-100 rounded px-1 focus:ring-0"
            >
              <option v-for="year in years" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
          </div>
          <button class="calendar-nav-btn w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors" @click.stop="changeMonth(1)">&gt;</button>
        </div>
        <div class="calendar-weekdays grid grid-cols-7 gap-1 mb-2">
          <span v-for="day in ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']" :key="day" class="text-center text-[11px] font-semibold text-slate-500">{{ day }}</span>
        </div>
        <div class="calendar-days grid grid-cols-7 gap-1">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            :class="['calendar-day aspect-square flex items-center justify-center text-[13px] rounded-lg border transition-colors', {
              'text-slate-300 bg-slate-50 border-transparent cursor-default': day.otherMonth,
              'bg-indigo-600 text-white border-indigo-600 font-semibold': day.selected,
              'border-indigo-500 font-semibold text-slate-700': day.today && !day.selected,
              'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-500': !day.selected && !day.otherMonth && !day.today
            }]"
            @click.stop="selectDate(day)"
            :disabled="day.otherMonth"
          >
            {{ day.day }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showButtons" class="flex gap-1">
      <button class="inline-flex items-center justify-center px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm h-8.5" @click="cambiarMes(-1)" @mousedown.prevent tabindex="-1">&lt;&lt;</button>
      <button class="inline-flex items-center justify-center px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm h-8.5" @click="cambiarFecha(-1)" @mousedown.prevent tabindex="-1">&lt;</button>
      <button class="inline-flex items-center justify-center px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm h-8.5" @click="cambiarFecha(1)" @mousedown.prevent tabindex="-1">&gt;</button>
      <button class="inline-flex items-center justify-center px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm h-8.5" @click="cambiarMes(1)" @mousedown.prevent tabindex="-1">&gt;&gt;</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Selecciona una fecha'
  },
  showButtons: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const showCalendar = ref(false)
const calendarMonth = ref(new Date().getMonth())
const calendarYear = ref(new Date().getFullYear())
const datepickerRef = ref(null)
const dropdownRef = ref(null)
const alignRight = ref(false)

const handleClickOutside = (event) => {
  if (datepickerRef.value && !datepickerRef.value.contains(event.target)) {
    showCalendar.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', updateDropdownAlignment)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', updateDropdownAlignment)
})

const displayDate = computed(() => {
  if (!props.modelValue) return ''
  const [year, month, day] = props.modelValue.split('-').map(Number)
  const fecha = new Date(year, month - 1, day)
  const diaNum = fecha.getDate().toString().padStart(2, '0')
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const anio = fecha.getFullYear()
  return `${diaNum}/${mes}/${anio}`
})

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  const yearList = []
  for (let y = 2020; y <= currentYear + 1; y += 1) {
    yearList.push(y)
  }
  return yearList
})

const currentMonth = computed(() => new Date(calendarYear.value, calendarMonth.value))

watch(() => showCalendar.value, (newVal) => {
  if (newVal && props.modelValue) {
    const [year, month] = props.modelValue.split('-').map(Number)
    calendarMonth.value = month - 1
    calendarYear.value = year
  }
})

function updateMonth(event) {
  calendarMonth.value = parseInt(event.target.value)
}

function updateYear(event) {
  calendarYear.value = parseInt(event.target.value)
}

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(calendarYear.value, calendarMonth.value, 1)
  const lastDay = new Date(calendarYear.value, calendarMonth.value + 1, 0)
  const prevLastDay = new Date(calendarYear.value, calendarMonth.value, 0)

  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const prevDaysInMonth = prevLastDay.getDate()

  for (let i = startDayOfWeek - 1; i >= 0; i -= 1) {
    days.push({ day: prevDaysInMonth - i, otherMonth: true, key: `prev-${prevDaysInMonth - i}` })
  }

  const today = new Date()
  const selectedDate = props.modelValue ? new Date(`${props.modelValue}T00:00:00`) : null

  for (let i = 1; i <= daysInMonth; i += 1) {
    const currentDate = new Date(calendarYear.value, calendarMonth.value, i)
    days.push({
      day: i,
      otherMonth: false,
      selected: selectedDate && selectedDate.getDate() === i && selectedDate.getMonth() === calendarMonth.value && selectedDate.getFullYear() === calendarYear.value,
      today: today.getDate() === i && today.getMonth() === calendarMonth.value && today.getFullYear() === calendarYear.value,
      key: `current-${i}`,
      date: currentDate
    })
  }

  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i += 1) {
    days.push({ day: i, otherMonth: true, key: `next-${i}` })
  }

  return days
})

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value) nextTick(updateDropdownAlignment)
}

function updateDropdownAlignment() {
  const dropdownEl = dropdownRef.value
  if (!dropdownEl) return
  const rect = dropdownEl.getBoundingClientRect()
  const spaceRight = window.innerWidth - rect.left
  const spaceLeft = rect.right
  alignRight.value = spaceRight < rect.width && spaceLeft >= rect.width
}

function changeMonth(offset) {
  calendarMonth.value += offset
  if (calendarMonth.value > 11) {
    calendarMonth.value = 0
    calendarYear.value += 1
  } else if (calendarMonth.value < 0) {
    calendarMonth.value = 11
    calendarYear.value -= 1
  }
}

function selectDate(day) {
  if (day.otherMonth) return
  const y = calendarYear.value
  const m = String(calendarMonth.value + 1).padStart(2, '0')
  const d = String(day.day).padStart(2, '0')
  const newDate = `${y}-${m}-${d}`
  emit('update:modelValue', newDate)
  emit('change', newDate)
  showCalendar.value = false
}

function cambiarFecha(dias) {
  if (!props.modelValue) return
  const [year, month, day] = props.modelValue.split('-').map(Number)
  const fecha = new Date(year, month - 1, day)
  fecha.setDate(fecha.getDate() + dias)
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  const newDate = `${y}-${m}-${d}`
  emit('update:modelValue', newDate)
  emit('change', newDate)
}

function cambiarMes(meses) {
  if (!props.modelValue) return
  const [year, month] = props.modelValue.split('-').map(Number)
  const fecha = new Date(year, month - 1, 1)
  fecha.setMonth(fecha.getMonth() + meses)

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const esMesActual = fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth()

  let diaFinal
  if (esMesActual) {
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)
    diaFinal = ayer.getDate()
  } else {
    diaFinal = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate()
  }

  fecha.setDate(diaFinal)
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  const newDate = `${y}-${m}-${d}`
  emit('update:modelValue', newDate)
  emit('change', newDate)
}
</script>

<style scoped>
</style>