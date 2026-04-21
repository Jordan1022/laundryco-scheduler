import { describe, expect, it } from 'vitest'
import {
  STANDARD_SCHEDULE_DEFAULTS,
  STANDARD_SCHEDULE_HORIZON_DAYS,
  buildStandardShiftInputs,
  shiftKey,
} from '@/lib/standardSchedule'

describe('buildStandardShiftInputs', () => {
  const weekdayBlocks = STANDARD_SCHEDULE_DEFAULTS.weekday.map((b) => ({ ...b }))
  const weekendBlocks = STANDARD_SCHEDULE_DEFAULTS.weekend.map((b) => ({ ...b }))

  it('generates weekday blocks Mon–Fri and weekend blocks Sat–Sun across one week', () => {
    // Jan 6 2025 is a Monday.
    const start = new Date(2025, 0, 6)
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: 7,
      weekdayBlocks,
      weekendBlocks,
    })

    expect(shifts).toHaveLength(14)

    const mondayMorning = shifts.find(
      (s) => s.startTime.getDate() === 6 && s.startTime.getHours() === 10,
    )
    expect(mondayMorning).toBeDefined()
    expect(mondayMorning?.endTime.getHours()).toBe(16)

    const saturdayMorning = shifts.find(
      (s) => s.startTime.getDate() === 11 && s.startTime.getHours() === 12,
    )
    expect(saturdayMorning).toBeDefined()

    const sundayEvening = shifts.find(
      (s) => s.startTime.getDate() === 12 && s.startTime.getHours() === 16,
    )
    expect(sundayEvening).toBeDefined()
    expect(sundayEvening?.endTime.getHours()).toBe(20)
  })

  it('treats horizon as an exclusive upper bound (day count = horizonDays)', () => {
    const start = new Date(2025, 0, 6) // Monday
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: 1,
      weekdayBlocks: [{ start: '09:00', end: '17:00' }],
      weekendBlocks: [],
    })
    expect(shifts).toHaveLength(1)
    expect(shifts[0].startTime.getDate()).toBe(6)
  })

  it('skips blocks where end <= start', () => {
    const start = new Date(2025, 0, 6)
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: 1,
      weekdayBlocks: [
        { start: '10:00', end: '10:00' },
        { start: '12:00', end: '09:00' },
      ],
      weekendBlocks: [],
    })
    expect(shifts).toHaveLength(0)
  })

  it('crosses month boundaries correctly', () => {
    // Jan 30 2025 is a Thursday -> goes through Feb 3 (Mon).
    const start = new Date(2025, 0, 30)
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: 5,
      weekdayBlocks: [{ start: '10:00', end: '11:00' }],
      weekendBlocks: [{ start: '12:00', end: '13:00' }],
    })

    expect(shifts.map((s) => [s.startTime.getMonth(), s.startTime.getDate(), s.startTime.getHours()])).toEqual([
      [0, 30, 10],
      [0, 31, 10],
      [1, 1, 12],
      [1, 2, 12],
      [1, 3, 10],
    ])
  })

  it('handles the full 5-year horizon without blowing up', () => {
    const start = new Date(2025, 0, 6)
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: STANDARD_SCHEDULE_HORIZON_DAYS,
      weekdayBlocks,
      weekendBlocks,
    })
    expect(shifts.length).toBe(STANDARD_SCHEDULE_HORIZON_DAYS * 2)
  })

  it('rejects invalid time strings by skipping those blocks', () => {
    const start = new Date(2025, 0, 6)
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: 1,
      weekdayBlocks: [
        { start: 'bogus', end: '17:00' },
        { start: '10:00', end: '25:00' },
        { start: '09:00', end: '17:00' },
      ],
      weekendBlocks: [],
    })
    expect(shifts).toHaveLength(1)
    expect(shifts[0].startTime.getHours()).toBe(9)
  })
})

describe('shiftKey', () => {
  it('is stable and unique per (start, end) pair', () => {
    const s = new Date(2025, 0, 6, 10, 0, 0)
    const e = new Date(2025, 0, 6, 16, 0, 0)
    const k1 = shiftKey(s, e)
    const k2 = shiftKey(new Date(2025, 0, 6, 10, 0, 0), new Date(2025, 0, 6, 16, 0, 0))
    expect(k1).toEqual(k2)

    const differentEnd = shiftKey(s, new Date(2025, 0, 6, 15, 0, 0))
    expect(differentEnd).not.toEqual(k1)
  })
})
