/**
 * Time-off request domain model.
 *
 * Storage uses an unavailable-window-per-day shape:
 *   `unavailableStartMinute` / `unavailableEndMinute` are minutes-of-day on
 *   the half-open interval [start, end). A shift on a covered date is
 *   considered to conflict when its own minute window overlaps that range.
 *
 * Date bounds (`startDate` / `endDate`) are INCLUSIVE: `endDate = May 15`
 * means "May 15 is off." Conflict queries against shifts must use
 * `shiftStart < endDate + 1 day`, NOT `<= endDate`.
 *
 * The UI surfaces three named presets — All shifts / Early shift only /
 * Late shift only — that map onto this model. The presets assume a 2-block
 * standard day split at 16:00 (`DEFAULT_SHIFT_SPLIT_MINUTE`). If the
 * scheduler ever produces shift shapes that straddle the split, the model
 * still works at the minute level; only the named presets become a
 * lossy summary of what was actually selected.
 */

export const MINUTES_PER_DAY = 1440

/** Wall-clock split between the early and late half of a standard shift day. */
export const DEFAULT_SHIFT_SPLIT_MINUTE = 16 * 60 // 16:00 / 4 PM

export type TimeOffWindow = {
  /** Inclusive minute-of-day the unavailability begins (0..MINUTES_PER_DAY). */
  unavailableStartMinute: number
  /** Exclusive minute-of-day the unavailability ends (0..MINUTES_PER_DAY). */
  unavailableEndMinute: number
}

export type TimeOffPresetKey = 'all_day' | 'early' | 'late'

type Preset = TimeOffWindow & { label: string }

export const TIME_OFF_PRESETS: Record<TimeOffPresetKey, Preset> = {
  all_day: {
    label: 'All shifts',
    unavailableStartMinute: 0,
    unavailableEndMinute: MINUTES_PER_DAY,
  },
  early: {
    label: 'Early shift only',
    unavailableStartMinute: 0,
    unavailableEndMinute: DEFAULT_SHIFT_SPLIT_MINUTE,
  },
  late: {
    label: 'Late shift only',
    unavailableStartMinute: DEFAULT_SHIFT_SPLIT_MINUTE,
    unavailableEndMinute: MINUTES_PER_DAY,
  },
}

const PRESET_ORDER: readonly TimeOffPresetKey[] = ['all_day', 'early', 'late']

export function listTimeOffPresets(): Array<{ key: TimeOffPresetKey; label: string }> {
  return PRESET_ORDER.map((key) => ({ key, label: TIME_OFF_PRESETS[key].label }))
}

export function normalizeTimeOffPresetKey(value: string): TimeOffPresetKey | null {
  return (PRESET_ORDER as readonly string[]).includes(value)
    ? (value as TimeOffPresetKey)
    : null
}

/** Map a named preset to its minute window. */
export function timeOffWindowForPreset(key: TimeOffPresetKey): TimeOffWindow {
  const preset = TIME_OFF_PRESETS[key]
  return {
    unavailableStartMinute: preset.unavailableStartMinute,
    unavailableEndMinute: preset.unavailableEndMinute,
  }
}

/** If a window matches a named preset exactly, return its key; otherwise null. */
export function matchTimeOffPreset(window: TimeOffWindow): TimeOffPresetKey | null {
  for (const key of PRESET_ORDER) {
    const preset = TIME_OFF_PRESETS[key]
    if (
      preset.unavailableStartMinute === window.unavailableStartMinute &&
      preset.unavailableEndMinute === window.unavailableEndMinute
    ) {
      return key
    }
  }
  return null
}

function formatMinuteOfDay(minute: number): string {
  const safe = Math.max(0, Math.min(MINUTES_PER_DAY, Math.round(minute)))
  const hour24 = Math.floor(safe / 60) % 24
  const min = safe % 60
  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${String(min).padStart(2, '0')} ${meridiem}`
}

/**
 * Human label for an unavailability window. Returns a preset label when the
 * window matches one of the named presets, otherwise the time range.
 */
export function formatTimeOffWindow(window: TimeOffWindow): string {
  const preset = matchTimeOffPreset(window)
  if (preset) return TIME_OFF_PRESETS[preset].label
  return `${formatMinuteOfDay(window.unavailableStartMinute)} – ${formatMinuteOfDay(window.unavailableEndMinute)}`
}

/** Half-open minute windows overlap iff each starts before the other ends. */
export function timeOffWindowsOverlap(a: TimeOffWindow, b: TimeOffWindow): boolean {
  return a.unavailableStartMinute < b.unavailableEndMinute && b.unavailableStartMinute < a.unavailableEndMinute
}

/** Inclusive date ranges overlap iff each starts on or before the other ends. */
export function timeOffDateRangesOverlap(
  a: { startDate: Date; endDate: Date },
  b: { startDate: Date; endDate: Date },
): boolean {
  return a.startDate.getTime() <= b.endDate.getTime() && b.startDate.getTime() <= a.endDate.getTime()
}

/** True iff two requests cover any shared (date, minute) cell. */
export function timeOffRequestsConflict(
  a: TimeOffWindow & { startDate: Date; endDate: Date },
  b: TimeOffWindow & { startDate: Date; endDate: Date },
): boolean {
  return timeOffDateRangesOverlap(a, b) && timeOffWindowsOverlap(a, b)
}
