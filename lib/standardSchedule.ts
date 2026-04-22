import { BUSINESS_TZ, zonedWalltimeToUtc } from './time'

export type StandardShiftBlock = { start: string; end: string }

export const STANDARD_SCHEDULE_HORIZON_DAYS = 1825

export const STANDARD_SCHEDULE_DEFAULTS = {
  weekday: [
    { start: '10:00', end: '16:00' },
    { start: '16:00', end: '20:00' },
  ],
  weekend: [
    { start: '12:00', end: '16:00' },
    { start: '16:00', end: '20:00' },
  ],
} as const satisfies { weekday: StandardShiftBlock[]; weekend: StandardShiftBlock[] }

export type BuildStandardShiftInputsArgs = {
  startDate: Date
  horizonDays: number
  weekdayBlocks: StandardShiftBlock[]
  weekendBlocks: StandardShiftBlock[]
}

export type StandardShiftInput = {
  startTime: Date
  endTime: Date
}

function parseHhmm(hhmm: string): { hours: number; minutes: number } | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null
  const [hoursRaw, minutesRaw] = hhmm.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

function getBusinessDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

function addCalendarDays(year: number, month: number, day: number, n: number) {
  const d = new Date(Date.UTC(year, month - 1, day + n))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

function businessDayOfWeek(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function buildStandardShiftInputs({
  startDate,
  horizonDays,
  weekdayBlocks,
  weekendBlocks,
}: BuildStandardShiftInputsArgs): StandardShiftInput[] {
  const out: StandardShiftInput[] = []
  const start = getBusinessDateParts(startDate)

  for (let offset = 0; offset < horizonDays; offset++) {
    const { year, month, day } = addCalendarDays(start.year, start.month, start.day, offset)
    const dow = businessDayOfWeek(year, month, day)
    const isWeekend = dow === 0 || dow === 6
    const blocks = isWeekend ? weekendBlocks : weekdayBlocks

    for (const block of blocks) {
      const startHm = parseHhmm(block.start)
      const endHm = parseHhmm(block.end)
      if (!startHm || !endHm) continue
      const startTime = zonedWalltimeToUtc(year, month, day, startHm.hours, startHm.minutes, BUSINESS_TZ)
      const endTime = zonedWalltimeToUtc(year, month, day, endHm.hours, endHm.minutes, BUSINESS_TZ)
      if (endTime <= startTime) continue
      out.push({ startTime, endTime })
    }
  }

  return out
}

export function shiftKey(startTime: Date, endTime: Date): string {
  return `${startTime.getTime()}|${endTime.getTime()}`
}
