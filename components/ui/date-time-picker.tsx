'use client'

import { useEffect, useMemo, useState } from 'react'
import DatePicker from 'react-datepicker'
import { CalendarDays, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const pickerInputClassName = [
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm',
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

type DatePickerFieldProps = {
  id: string
  name: string
  defaultValue?: string
  required?: boolean
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

function parseISODateOnly(value?: string) {
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

function parseTimeValue(value?: string) {
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

function timeBoundary(value: string | undefined, fallback: string) {
  const fallbackTime = parseTimeValue(fallback)
  return parseTimeValue(value) ?? fallbackTime ?? new Date()
}

function useMobilePortal() {
  const [usePortal, setUsePortal] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const smallScreen = window.matchMedia('(max-width: 768px)')
    const coarsePointer = window.matchMedia('(pointer: coarse)')
    const legacySmall = smallScreen as MediaQueryList & {
      addListener?: (callback: (event: MediaQueryListEvent) => void) => void
      removeListener?: (callback: (event: MediaQueryListEvent) => void) => void
    }
    const legacyCoarse = coarsePointer as MediaQueryList & {
      addListener?: (callback: (event: MediaQueryListEvent) => void) => void
      removeListener?: (callback: (event: MediaQueryListEvent) => void) => void
    }
    const update = () => {
      setUsePortal(smallScreen.matches || coarsePointer.matches)
    }

    update()
    if (typeof smallScreen.addEventListener === 'function') {
      smallScreen.addEventListener('change', update)
      coarsePointer.addEventListener('change', update)
    } else {
      legacySmall.addListener?.(update)
      legacyCoarse.addListener?.(update)
    }
    return () => {
      if (typeof smallScreen.removeEventListener === 'function') {
        smallScreen.removeEventListener('change', update)
        coarsePointer.removeEventListener('change', update)
      } else {
        legacySmall.removeListener?.(update)
        legacyCoarse.removeListener?.(update)
      }
    }
  }, [])

  return usePortal
}

export function DatePickerField({
  id,
  name,
  defaultValue,
  required,
  className,
  min,
  max,
}: DatePickerFieldProps) {
  const [selected, setSelected] = useState<Date | null>(() => parseISODateOnly(defaultValue))
  const minDate = useMemo(() => parseISODateOnly(min), [min])
  const maxDate = useMemo(() => parseISODateOnly(max), [max])
  const withMobilePortal = useMobilePortal()

  return (
    <div className={cn('relative', className)}>
      <DatePicker
        id={id}
        name={name}
        selected={selected}
        onChange={(nextDate: Date | null) => setSelected(nextDate)}
        required={required}
        minDate={minDate ?? undefined}
        maxDate={maxDate ?? undefined}
        dateFormat="yyyy-MM-dd"
        placeholderText="YYYY-MM-DD"
        autoComplete="off"
        readOnly
        preventOpenOnFocus
        showPopperArrow={false}
        withPortal={withMobilePortal}
        className={pickerInputClassName}
        wrapperClassName="w-full app-datepicker-wrapper"
        popperClassName="app-datepicker-popper"
        calendarClassName="app-datepicker-calendar"
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
  const [selected, setSelected] = useState<Date | null>(() => parseTimeValue(defaultValue))
  const minTime = useMemo(() => timeBoundary(min, '00:00'), [min])
  const maxTime = useMemo(() => timeBoundary(max, '23:59'), [max])
  const withMobilePortal = useMobilePortal()

  return (
    <div className={cn('relative', className)}>
      <DatePicker
        id={id}
        name={name}
        selected={selected}
        onChange={(nextTime: Date | null) => setSelected(nextTime)}
        required={required}
        minTime={minTime}
        maxTime={maxTime}
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={timeIntervals}
        dateFormat="HH:mm"
        placeholderText="HH:MM"
        autoComplete="off"
        readOnly
        preventOpenOnFocus
        showPopperArrow={false}
        withPortal={withMobilePortal}
        className={pickerInputClassName}
        wrapperClassName="w-full app-datepicker-wrapper"
        popperClassName="app-datepicker-popper"
        calendarClassName="app-datepicker-calendar"
      />
      <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
