import { describe, expect, it } from 'vitest'
import { parseISODateOnly, parseTimeValue } from '@/components/ui/date-time-picker'

describe('date-time picker parsing helpers', () => {
  it('parses a valid ISO date string at local midnight', () => {
    const parsed = parseISODateOnly('2026-04-16')

    expect(parsed).not.toBeNull()
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(3)
    expect(parsed?.getDate()).toBe(16)
    expect(parsed?.getHours()).toBe(0)
    expect(parsed?.getMinutes()).toBe(0)
  })

  it('rejects an invalid ISO date string', () => {
    expect(parseISODateOnly('2026-02-30')).toBeNull()
    expect(parseISODateOnly('not-a-date')).toBeNull()
  })

  it('parses a valid 24-hour time string', () => {
    const parsed = parseTimeValue('08:15')

    expect(parsed).not.toBeNull()
    expect(parsed?.getHours()).toBe(8)
    expect(parsed?.getMinutes()).toBe(15)
    expect(parsed?.getSeconds()).toBe(0)
  })

  it('rejects malformed time values', () => {
    expect(parseTimeValue('24:00')).toBeNull()
    expect(parseTimeValue('8:15')).toBeNull()
    expect(parseTimeValue('08:75')).toBeNull()
  })
})
