import { describe, expect, it } from 'vitest'
import { parseChicagoWalltime } from '@/lib/time'

/**
 * Chicago observes DST. These tests pin the documented behavior at the
 * transition boundaries, so any future refactor that quietly drifts the
 * offset math fails loudly.
 */
describe('parseChicagoWalltime', () => {
  it('treats Chicago midnight as the wall-clock midnight, not UTC midnight', () => {
    // During CDT (UTC-5) Chicago midnight on 2026-05-15 = 2026-05-15T05:00Z.
    const parsed = parseChicagoWalltime('2026-05-15', '00:00')
    expect(parsed).not.toBeNull()
    expect(parsed?.toISOString()).toBe('2026-05-15T05:00:00.000Z')
  })

  it('uses CST offset (UTC-6) before the spring-forward transition', () => {
    // 2026-03-08 spring-forward in Chicago: 02:00 CST → 03:00 CDT.
    // 01:30 CST is unambiguous: 2026-03-08T07:30Z.
    const parsed = parseChicagoWalltime('2026-03-08', '01:30')
    expect(parsed).not.toBeNull()
    expect(parsed?.toISOString()).toBe('2026-03-08T07:30:00.000Z')
  })

  it('resolves a non-existent spring-forward wall time without throwing', () => {
    // 02:30 on the spring-forward day does not exist in Chicago wall-clock
    // (the hour from 02:00 to 03:00 is skipped). The function must still
    // return a Date — we don't pin the exact instant, only that it's a
    // valid Date inside the surrounding hour window so callers don't crash.
    const parsed = parseChicagoWalltime('2026-03-08', '02:30')
    expect(parsed).not.toBeNull()
    expect(Number.isFinite(parsed!.getTime())).toBe(true)

    const before = Date.UTC(2026, 2, 8, 7, 0)  // 01:00 CST
    const after = Date.UTC(2026, 2, 8, 9, 0)   // 04:00 CDT
    expect(parsed!.getTime()).toBeGreaterThan(before)
    expect(parsed!.getTime()).toBeLessThan(after)
  })

  it('resolves an ambiguous fall-back wall time deterministically', () => {
    // 2026-11-01 fall-back: 02:00 CDT → 01:00 CST. 01:30 occurs twice.
    // The function should return one of them consistently, not throw or
    // return null. We assert it lands in the surrounding hour window.
    const parsed = parseChicagoWalltime('2026-11-01', '01:30')
    expect(parsed).not.toBeNull()
    expect(Number.isFinite(parsed!.getTime())).toBe(true)

    const firstOccurrence = Date.UTC(2026, 10, 1, 6, 30)  // 01:30 CDT
    const secondOccurrence = Date.UTC(2026, 10, 1, 7, 30) // 01:30 CST
    expect([firstOccurrence, secondOccurrence]).toContain(parsed!.getTime())
  })
})
