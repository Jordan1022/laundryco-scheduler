import { describe, expect, it } from 'vitest'
import {
  calendarDateFromIso,
  calendarDateToIso,
  formatCalendarDay,
  getMonthCalendarDays,
} from '@/lib/calendar'

describe('calendar month grid', () => {
  it('aligns June 2026 with Monday-first weekday columns', () => {
    const june = calendarDateFromIso('2026-06-16')
    expect(june).not.toBeNull()

    const days = getMonthCalendarDays(june!)
    expect(days.slice(0, 7).map(calendarDateToIso)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ])

    expect(calendarDateToIso(days[23])).toBe('2026-06-24')
    expect(formatCalendarDay(days[23])).toBe('Wed, Jun 24')
  })
})
