'use client'

import { CalendarDays, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const pickerInputClassName = [
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
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
    <div className={cn('relative', className)}>
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
        className={cn(pickerInputClassName, '[color-scheme:light] dark:[color-scheme:dark]')}
      />
      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
    <div className={cn('relative', className)}>
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
        className={cn(pickerInputClassName, '[color-scheme:light] dark:[color-scheme:dark]')}
      />
      <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
