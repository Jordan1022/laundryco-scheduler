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

function applyTime(day: Date, hhmm: string): Date | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null
  const [hoursRaw, minutesRaw] = hhmm.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  const result = new Date(day)
  result.setHours(hours, minutes, 0, 0)
  return result
}

export function buildStandardShiftInputs({
  startDate,
  horizonDays,
  weekdayBlocks,
  weekendBlocks,
}: BuildStandardShiftInputsArgs): StandardShiftInput[] {
  const out: StandardShiftInput[] = []
  const base = new Date(startDate)
  base.setHours(0, 0, 0, 0)

  for (let offset = 0; offset < horizonDays; offset++) {
    const day = new Date(base)
    day.setDate(day.getDate() + offset)
    const dow = day.getDay()
    const isWeekend = dow === 0 || dow === 6
    const blocks = isWeekend ? weekendBlocks : weekdayBlocks

    for (const block of blocks) {
      const startTime = applyTime(day, block.start)
      const endTime = applyTime(day, block.end)
      if (!startTime || !endTime || endTime <= startTime) continue
      out.push({ startTime, endTime })
    }
  }

  return out
}

export function shiftKey(startTime: Date, endTime: Date): string {
  return `${startTime.getTime()}|${endTime.getTime()}`
}
