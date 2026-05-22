'use client'

import { CalendarDays, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const pickerWrapperClassName =
  'group relative rounded-sm'

const pickerInputClassName = [
  'peer flex h-11 w-full rounded-sm border border-ink/20 bg-bleach py-2.5 pl-14 pr-3 font-mono text-sm font-medium tabular-nums text-ink shadow-stamp',
  'transition-[border-color,box-shadow,background-color,transform] duration-150 ease-out',
  'hover:-translate-y-px hover:border-ink/35 hover:bg-paper hover:shadow-ticket',
  'focus-visible:outline-none focus-visible:border-ink/50 focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-cherry/15 focus-visible:shadow-ticket',
  'disabled:cursor-not-allowed disabled:border-ink/10 disabled:bg-paper-dim disabled:text-ink-muted disabled:opacity-60 disabled:shadow-none',
].join(' ')

const iconFrameClassName = [
  'pointer-events-none absolute inset-y-1 left-1 flex w-10 items-center justify-center rounded-[2px]',
  'border-r border-dashed border-ink/20 bg-paper-dim text-ink-muted',
  'transition-colors duration-150 group-hover:text-ink peer-focus-visible:border-cherry/30 peer-focus-visible:text-cherry',
].join(' ')

const iconClassName = [
  'h-4 w-4',
].join(' ')

type DatePickerFieldProps = {
  id: string
  name: string
  value?: string
  defaultValue?: string
  required?: boolean
  disabled?: boolean
  className?: string
  min?: string
  max?: string
  ariaLabel?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

type TimePickerFieldProps = {
  id: string
  name: string
  value?: string
  defaultValue?: string
  required?: boolean
  className?: string
  min?: string
  max?: string
  ariaLabel?: string
  timeIntervals?: number
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Validate a "YYYY-MM-DD" string and return a Date at midnight in the JS
 * runtime's LOCAL time zone. On the server (TZ=UTC) that's UTC midnight; in a
 * browser it's the user's local midnight. Use this only for input-format
 * validation and component-internal bounds — NOT for storing or comparing to
 * shift timestamps. For business-zone parsing, use `parseChicagoWalltime`
 * from `lib/time.ts`.
 */
export function parseISODateOnlyAsLocal(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [yearRaw, monthRaw, dayRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  const parsed = new Date(year, month - 1, day)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export function parseTimeValue(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null
  const [hourRaw, minuteRaw] = value.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  const parsed = new Date()
  parsed.setHours(hour, minute, 0, 0)
  return parsed
}

function normalizeDateValue(value?: string) {
  return parseISODateOnlyAsLocal(value) ? value : undefined
}

function normalizeTimeValue(value?: string) {
  return parseTimeValue(value) ? value : undefined
}

function openNativePicker(event: React.MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void }
  if (typeof input.showPicker !== 'function' || input.disabled || input.readOnly) return

  try {
    input.showPicker()
  } catch {
    // Ignore browsers that reject programmatic picker opening.
  }
}

export function DatePickerField({
  id,
  name,
  value,
  defaultValue,
  required,
  disabled,
  className,
  min,
  max,
  ariaLabel = 'Date picker',
  onChange,
}: DatePickerFieldProps) {
  const hasControlledValue = value !== undefined

  return (
    <div className={cn(pickerWrapperClassName, className)}>
      <input
        id={id}
        name={name}
        type="date"
        aria-label={ariaLabel}
        value={hasControlledValue ? normalizeDateValue(value) ?? '' : undefined}
        defaultValue={hasControlledValue ? undefined : normalizeDateValue(defaultValue)}
        required={required}
        disabled={disabled}
        min={normalizeDateValue(min)}
        max={normalizeDateValue(max)}
        onClick={openNativePicker}
        onChange={onChange}
        className={cn(pickerInputClassName, 'app-native-picker-input [color-scheme:light] dark:[color-scheme:dark]')}
      />
      <span className={iconFrameClassName} aria-hidden="true">
        <CalendarDays className={iconClassName} />
      </span>
    </div>
  )
}

export function TimePickerField({
  id,
  name,
  value,
  defaultValue,
  required,
  className,
  min,
  max,
  ariaLabel = 'Time picker',
  timeIntervals = 15,
  onChange,
}: TimePickerFieldProps) {
  const step = Math.max(1, timeIntervals) * 60
  const hasControlledValue = value !== undefined

  return (
    <div className={cn(pickerWrapperClassName, className)}>
      <input
        id={id}
        name={name}
        type="time"
        aria-label={ariaLabel}
        value={hasControlledValue ? normalizeTimeValue(value) ?? '' : undefined}
        defaultValue={hasControlledValue ? undefined : normalizeTimeValue(defaultValue)}
        required={required}
        min={normalizeTimeValue(min)}
        max={normalizeTimeValue(max)}
        step={step}
        onClick={openNativePicker}
        onChange={onChange}
        className={cn(pickerInputClassName, 'app-native-picker-input [color-scheme:light] dark:[color-scheme:dark]')}
      />
      <span className={iconFrameClassName} aria-hidden="true">
        <Clock3 className={iconClassName} />
      </span>
    </div>
  )
}
