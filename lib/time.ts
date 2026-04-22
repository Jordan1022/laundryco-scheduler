export const BUSINESS_TZ = 'America/Chicago'

type DateTimeParts = { year: number; month: number; day: number; hour: number; minute: number }

function getTzWallAsUtc(date: Date, timeZone: string): DateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => {
    const found = parts.find((p) => p.type === type)
    return found ? Number(found.value) : 0
  }
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
  }
}

/**
 * Given walltime components in `timeZone`, return the real UTC instant.
 * Handles DST. Ambiguous times (fall-back) resolve to the first occurrence;
 * non-existent times (spring-forward gap) resolve to the adjusted instant.
 */
export function zonedWalltimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute)
  const wallAtNaiveUtc = getTzWallAsUtc(new Date(naiveUtc), timeZone)
  const wallAsUtc = Date.UTC(
    wallAtNaiveUtc.year,
    wallAtNaiveUtc.month - 1,
    wallAtNaiveUtc.day,
    wallAtNaiveUtc.hour,
    wallAtNaiveUtc.minute,
  )
  const offsetMs = naiveUtc - wallAsUtc
  return new Date(naiveUtc + offsetMs)
}

/**
 * Parse form inputs of shape "YYYY-MM-DD" + "HH:MM" as Chicago walltime
 * and return the real UTC instant.
 */
export function parseChicagoWalltime(dateValue: string, timeValue: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue)
  if (!dateMatch || !timeMatch) return null
  const [, yr, mo, dy] = dateMatch
  const [, hr, mn] = timeMatch
  const year = Number(yr)
  const month = Number(mo)
  const day = Number(dy)
  const hour = Number(hr)
  const minute = Number(mn)
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return zonedWalltimeToUtc(year, month, day, hour, minute, BUSINESS_TZ)
}

export const shortTimeLabel = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: BUSINESS_TZ,
})

export const shortDateLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: BUSINESS_TZ,
})

export const monthLabel = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: BUSINESS_TZ,
})

export const monthDayLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: BUSINESS_TZ,
})

export const dateTimeLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: BUSINESS_TZ,
})

export function formatShiftDateTime(start: Date, end: Date): string {
  return `${dateTimeLabel.format(start)} - ${shortTimeLabel.format(end)}`
}

/** "YYYY-MM-DD" in Chicago walltime — suitable for <input type="date"> defaults. */
export function chicagoDateInputValue(date: Date): string {
  const { year, month, day } = getTzWallAsUtc(date, BUSINESS_TZ)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "HH:MM" (24h) in Chicago walltime — suitable for <input type="time"> defaults. */
export function chicagoTimeInputValue(date: Date): string {
  const { hour, minute } = getTzWallAsUtc(date, BUSINESS_TZ)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
