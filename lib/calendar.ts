import { BUSINESS_TZ, chicagoDateInputValue, zonedWalltimeToUtc } from '@/lib/time'

export type CalendarDate = {
  year: number
  month: number
  day: number
}

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/

const calendarDayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const calendarMonthLabel = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const calendarMonthDayLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function utcDateForCalendarDate(date: CalendarDate) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day))
}

function isValidCalendarDate(date: CalendarDate) {
  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day)) {
    return false
  }
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) {
    return false
  }

  const parsed = utcDateForCalendarDate(date)
  return (
    parsed.getUTCFullYear() === date.year &&
    parsed.getUTCMonth() === date.month - 1 &&
    parsed.getUTCDate() === date.day
  )
}

export function calendarDateFromIso(value: string | undefined): CalendarDate | null {
  if (!value) return null

  const match = isoDatePattern.exec(value)
  if (!match) return null

  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }

  return isValidCalendarDate(date) ? date : null
}

export function calendarDateFromChicagoDate(date: Date): CalendarDate {
  const parsed = calendarDateFromIso(chicagoDateInputValue(date))
  if (!parsed) {
    throw new Error('Could not derive a Chicago calendar date')
  }
  return parsed
}

export function calendarDateToIso(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

export function calendarDateToChicagoDate(date: CalendarDate): Date {
  return zonedWalltimeToUtc(date.year, date.month, date.day, 0, 0, BUSINESS_TZ)
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

export function addCalendarMonths(date: CalendarDate, months: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1 + months, 1))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: 1,
  }
}

export function startOfCalendarMonth(date: CalendarDate): CalendarDate {
  return {
    year: date.year,
    month: date.month,
    day: 1,
  }
}

export function calendarDayOfWeek(date: CalendarDate): number {
  return utcDateForCalendarDate(date).getUTCDay()
}

export function getMondayWeekStart(date: CalendarDate): CalendarDate {
  const diffToMonday = (calendarDayOfWeek(date) + 6) % 7
  return addCalendarDays(date, -diffToMonday)
}

export function getMondayWeekBounds(date: CalendarDate): { start: CalendarDate; endExclusive: CalendarDate } {
  const start = getMondayWeekStart(date)
  return {
    start,
    endExclusive: addCalendarDays(start, 7),
  }
}

export function getMonthCalendarBounds(date: CalendarDate): { start: CalendarDate; endExclusive: CalendarDate } {
  const start = getMondayWeekStart(startOfCalendarMonth(date))
  return {
    start,
    endExclusive: addCalendarDays(start, 42),
  }
}

export function getMonthCalendarDays(date: CalendarDate): CalendarDate[] {
  const { start } = getMonthCalendarBounds(date)
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index))
}

export function isSameCalendarMonth(date: CalendarDate, month: CalendarDate): boolean {
  return date.year === month.year && date.month === month.month
}

export function formatCalendarDay(date: CalendarDate): string {
  return calendarDayLabel.format(utcDateForCalendarDate(date))
}

export function formatCalendarMonth(date: CalendarDate): string {
  return calendarMonthLabel.format(utcDateForCalendarDate(startOfCalendarMonth(date)))
}

export function formatCalendarMonthDay(date: CalendarDate): string {
  return calendarMonthDayLabel.format(utcDateForCalendarDate(date))
}
