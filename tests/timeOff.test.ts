import { describe, expect, it } from 'vitest'
import { timeOffRequestCoversShiftWindow } from '@/lib/timeOff'

describe('timeOffRequestCoversShiftWindow', () => {
  const request = {
    startDate: '2026-04-16',
    endDate: '2026-04-18',
    unavailableStartMinute: 16 * 60,
    unavailableEndMinute: 20 * 60,
  }

  it('matches a shift on an included date with overlapping minutes', () => {
    expect(timeOffRequestCoversShiftWindow(request, {
      date: '2026-04-17',
      startMinute: 17 * 60,
      endMinute: 19 * 60,
    })).toBe(true)
  })

  it('does not match outside the date range or minute window', () => {
    expect(timeOffRequestCoversShiftWindow(request, {
      date: '2026-04-19',
      startMinute: 17 * 60,
      endMinute: 19 * 60,
    })).toBe(false)

    expect(timeOffRequestCoversShiftWindow(request, {
      date: '2026-04-17',
      startMinute: 10 * 60,
      endMinute: 16 * 60,
    })).toBe(false)
  })
})
