import { describe, expect, it } from 'vitest'
import {
  STANDARD_SCHEDULE_DEFAULTS,
  STANDARD_SCHEDULE_HORIZON_DAYS,
  buildStandardShiftInputs,
  shiftKey,
} from '@/lib/standardSchedule'

const chicagoParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: false,
})

function chicago(d: Date) {
  const parts = Object.fromEntries(
    chicagoParts.formatToParts(d).map((p) => [p.type, p.value]),
  ) as Record<string, string>
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  }
}

describe('buildStandardShiftInputs', () => {
  const weekdayBlocks = STANDARD_SCHEDULE_DEFAULTS.weekday.map((b) => ({ ...b }))
  const weekendBlocks = STANDARD_SCHEDULE_DEFAULTS.weekend.map((b) => ({ ...b }))

  it('generates weekday blocks Mon–Fri and weekend blocks Sat–Sun across one week', () => {
    // Jan 6 2025 is a Monday in Chicago. Pass in midnight UTC to match what
    // parseDateOnly would produce for "2025-01-06" input.
    const start = new Date('2025-01-06T06:00:00.000Z') // midnight Chicago CST
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: 7,
      weekdayBlocks,
      weekendBlocks,
    })

    expect(shifts).toHaveLength(14)

    const mondayMorning = shifts.find((s) => {
      const c = chicago(s.startTime)
      return c.day === 6 && c.hour === 10
    })
    expect(mondayMorning).toBeDefined()
    expect(chicago(mondayMorning!.endTime).hour).toBe(16)

    const saturdayMorning = shifts.find((s) => {
      const c = chicago(s.startTime)
      return c.day === 11 && c.hour === 12
    })
    expect(saturdayMorning).toBeDefined()

    const sundayEvening = shifts.find((s) => {
      const c = chicago(s.startTime)
      return c.day === 12 && c.hour === 16
    })
    expect(sundayEvening).toBeDefined()
    expect(chicago(sundayEvening!.endTime).hour).toBe(20)
  })

  it('treats horizon as an exclusive upper bound (day count = horizonDays)', () => {
    const start = new Date('2025-01-06T06:00:00.000Z')
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: 1,
      weekdayBlocks: [{ start: '09:00', end: '17:00' }],
      weekendBlocks: [],
    })
    expect(shifts).toHaveLength(1)
    expect(chicago(shifts[0].startTime).day).toBe(6)
  })

  it('skips blocks where end <= start', () => {
    const start = new Date('2025-01-06T06:00:00.000Z')
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
    const start = new Date('2025-01-30T06:00:00.000Z')
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: 5,
      weekdayBlocks: [{ start: '10:00', end: '11:00' }],
      weekendBlocks: [{ start: '12:00', end: '13:00' }],
    })

    expect(shifts.map((s) => {
      const c = chicago(s.startTime)
      return [c.month - 1, c.day, c.hour]
    })).toEqual([
      [0, 30, 10],
      [0, 31, 10],
      [1, 1, 12],
      [1, 2, 12],
      [1, 3, 10],
    ])
  })

  it('handles the full 5-year horizon without blowing up', () => {
    const start = new Date('2025-01-06T06:00:00.000Z')
    const shifts = buildStandardShiftInputs({
      startDate: start,
      horizonDays: STANDARD_SCHEDULE_HORIZON_DAYS,
      weekdayBlocks,
      weekendBlocks,
    })
    expect(shifts.length).toBe(STANDARD_SCHEDULE_HORIZON_DAYS * 2)
  })

  it('rejects invalid time strings by skipping those blocks', () => {
    const start = new Date('2025-01-06T06:00:00.000Z')
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
    expect(chicago(shifts[0].startTime).hour).toBe(9)
  })
})

describe('shiftKey', () => {
  it('is stable and unique per (start, end) pair', () => {
    const s = new Date('2025-01-06T16:00:00.000Z')
    const e = new Date('2025-01-06T22:00:00.000Z')
    const k1 = shiftKey(s, e)
    const k2 = shiftKey(new Date('2025-01-06T16:00:00.000Z'), new Date('2025-01-06T22:00:00.000Z'))
    expect(k1).toEqual(k2)

    const differentEnd = shiftKey(s, new Date('2025-01-06T21:00:00.000Z'))
    expect(differentEnd).not.toEqual(k1)
  })
})
