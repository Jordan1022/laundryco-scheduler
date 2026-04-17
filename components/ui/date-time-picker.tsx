'use client'

import { CalendarDays, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const pickerWrapperClassName =
  'group relative rounded-xl bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-800/80'

const pickerInputClassName = [
  'peer flex h-12 w-full rounded-xl border border-slate-200/80 bg-transparent px-4 py-2.5 pr-11 text-sm font-medium text-foreground',
  'shadow-[0_1px_2px_rgb(0_0_0/0.04),inset_0_1px_0_rgb(255_255_255/0.6)]',
  'dark:border-slate-700/60 dark:shadow-[0_1px_2px_rgb(0_0_0/0.2),inset_0_1px_0_rgb(255_255_255/0.04)]',
  'transition-all duration-200 ease-out',
  'hover:border-slate-300 hover:shadow-[0_2px_6px_rgb(0_0_0/0.06),inset_0_1px_0_rgb(255_255_255/0.6)]',
  'dark:hover:border-slate-600 dark:hover:shadow-[0_2px_6px_rgb(0_0_0/0.3)]',
  'focus-visible:outline-none focus-visible:border-blue-500/50 focus-visible:ring-[3px] focus-visible:ring-blue-500/10 focus-visible:shadow-[0_0_0_1px_rgb(59_130_246/0.3),0_2px_8px_rgb(59_130_246/0.08)]',
  'dark:focus-visible:border-blue-400/50 dark:focus-visible:ring-blue-400/10 dark:focus-visible:shadow-[0_0_0_1px_rgb(96_165_250/0.3),0_2px_8px_rgb(96_165_250/0.08)]',
  'disabled:cursor-not-allowed disabled:border-slate-200/50 disabled:bg-slate-50/50 disabled:text-muted-foreground disabled:opacity-60 disabled:shadow-none',
  'dark:disabled:border-slate-700/30 dark:disabled:bg-slate-800/30',
].join(' ')

const iconClassName = [
  'pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2',
  'text-slate-400 transition-colors duration-200',
  'group-hover:text-slate-500 peer-focus-visible:text-blue-500',
  'dark:text-slate-500 dark:group-hover:text-slate-400 dark:peer-focus-visible:text-blue-400',
].join(' ')

type DatePickerFieldProps = {
  id: string
  name: string
  defaultValue?: string
  required?: boolean
  disabled?: boolean
  className?: string
  min?: string
  max?: string
}

type TimePickerFieldProps = {
  id: string
  name: string
  defaultValue?: string
  required?: boolean
  className?: string
  min?: string
  max?: string
  timeIntervals?: number
}

export function parseISODateOnly(value?: string) {
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
  return parseISODateOnly(value) ? value : undefined
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
  defaultValue,
  required,
  disabled,
  className,
  min,
  max,
}: DatePickerFieldProps) {
  return (
    <div className={cn(pickerWrapperClassName, className)}>
      <input
        id={id}
        name={name}
        type="date"
        aria-label="Date picker"
        defaultValue={normalizeDateValue(defaultValue)}
        required={required}
        disabled={disabled}
        min={normalizeDateValue(min)}
        max={normalizeDateValue(max)}
        onClick={openNativePicker}
        className={cn(pickerInputClassName, 'app-native-picker-input [color-scheme:light] dark:[color-scheme:dark]')}
      />
      <CalendarDays className={iconClassName} />
    </div>
  )
}

export function TimePickerField({
  id,
  name,
  defaultValue,
  required,
  className,
  min,
  max,
  timeIntervals = 15,
}: TimePickerFieldProps) {
  const step = Math.max(1, timeIntervals) * 60

  return (
    <div className={cn(pickerWrapperClassName, className)}>
      <input
        id={id}
        name={name}
        type="time"
        aria-label="Time picker"
        defaultValue={normalizeTimeValue(defaultValue)}
        required={required}
        min={normalizeTimeValue(min)}
        max={normalizeTimeValue(max)}
        step={step}
        onClick={openNativePicker}
        className={cn(pickerInputClassName, 'app-native-picker-input [color-scheme:light] dark:[color-scheme:dark]')}
      />
      <Clock3 className={iconClassName} />
    </div>
  )
}
