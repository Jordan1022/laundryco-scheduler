export type ShiftFilter =
  | 'unfilled-first'
  | 'unfilled-only'
  | 'all-chronological'
  | 'drafts'
  | 'cancelled'

export const DEFAULT_SHIFT_FILTER: ShiftFilter = 'unfilled-first'

const SHIFT_FILTERS: readonly ShiftFilter[] = [
  'unfilled-first',
  'unfilled-only',
  'all-chronological',
  'drafts',
  'cancelled',
]

export function isShiftFilter(value: string | undefined): value is ShiftFilter {
  return !!value && (SHIFT_FILTERS as readonly string[]).includes(value)
}
