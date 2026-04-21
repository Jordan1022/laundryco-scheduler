'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TimePickerField } from '@/components/ui/date-time-picker'
import { cn } from '@/lib/utils'

type DayShift = {
  shiftId: string
  title: string
  location: string
  startLabel: string
  endLabel: string
  dateTimeLabel: string
  assigneeLabel: string
  isMine: boolean
  isOpen: boolean
}

type DayEntry = {
  key: string
  dateIso: string
  dayNumber: number
  isToday: boolean
  isCurrentMonth: boolean
  shiftCount: number
  visibleShifts: DayShift[]
  hiddenShiftCount: number
  shifts: DayShift[]
  dateLabel: string
}

type StaffOption = {
  id: string
  name: string
  role: string
}

type ScheduleGridWithModalProps = {
  weekdayLabels: string[]
  selectedView: 'week' | 'month'
  dayEntries: DayEntry[]
  canManageStaff: boolean
  staffOptions: StaffOption[]
  returnView: 'week' | 'month'
  returnDate: string
  createShiftAction?: (formData: FormData) => void | Promise<void>
}

export default function ScheduleGridWithModal({
  weekdayLabels,
  selectedView,
  dayEntries,
  canManageStaff,
  staffOptions,
  returnView,
  returnDate,
  createShiftAction,
}: ScheduleGridWithModalProps) {
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null)
  const activeDay = useMemo(() => dayEntries.find((day) => day.key === activeDayKey) ?? null, [activeDayKey, dayEntries])
  const mobileDayEntries = useMemo(
    () => (selectedView === 'month' ? dayEntries.filter((day) => day.isCurrentMonth) : dayEntries),
    [dayEntries, selectedView],
  )

  return (
    <>
      <div className="space-y-4 md:hidden">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-muted-foreground">
          {selectedView === 'month'
            ? 'Month view switches to a day-by-day agenda on phones so you can scan shifts without sideways scrolling.'
            : 'Week view is shown as a day-by-day agenda on phones. Tap any day to open full shift details.'}
        </div>
        <div className="space-y-3">
          {mobileDayEntries.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => setActiveDayKey(day.key)}
              className={cn(
                'w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-blue-300',
                day.isToday && 'border-blue-200 bg-blue-50/40',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{day.dateLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {day.shiftCount === 0 ? 'No shifts scheduled' : `${day.shiftCount} shift${day.shiftCount === 1 ? '' : 's'} scheduled`}
                  </p>
                </div>
                {day.isToday ? (
                  <span className="rounded-full bg-[#1e3a8a] px-2.5 py-1 text-[11px] font-semibold text-white">
                    Today
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {day.visibleShifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shifts scheduled.</p>
                ) : (
                  day.visibleShifts.map((shift) => (
                    <div
                      key={shift.shiftId}
                      className={cn(
                        'rounded-sm border px-3 py-2 transition-colors',
                        shift.isOpen
                          ? 'border-cherry/40 bg-cherry-soft'
                          : shift.isMine
                            ? 'border-ink bg-ink text-paper'
                            : 'border-ink/20 bg-bleach',
                      )}
                    >
                      <p className={cn('font-mono text-xs tabular', shift.isMine ? 'text-paper/80' : 'text-ink/70')}>
                        {shift.startLabel}–{shift.endLabel}
                      </p>
                      <p className={cn('mt-0.5 text-sm font-medium', shift.isMine && 'text-paper')}>
                        {shift.isOpen ? (
                          <span className="text-cherry">Open · needs staff</span>
                        ) : (
                          shift.assigneeLabel
                        )}
                      </p>
                    </div>
                  ))
                )}
                {day.hiddenShiftCount > 0 ? (
                  <p className="text-xs font-medium text-muted-foreground">+{day.hiddenShiftCount} more on this day</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-2 hidden overflow-x-auto px-2 md:block">
        <div className={cn(selectedView === 'week' ? 'min-w-[720px]' : 'min-w-[760px]')}>
          <div className="mb-2 grid grid-cols-7 gap-2">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {dayEntries.map((day) => (
              <button
                key={day.key}
                type="button"
                onClick={() => setActiveDayKey(day.key)}
                className={cn(
                  'text-left transition-colors hover:border-blue-300',
                  selectedView === 'week' ? 'min-h-44 rounded-md border p-3 bg-card' : 'min-h-28 rounded-md border p-2 bg-card',
                  selectedView === 'month' && !day.isCurrentMonth && 'bg-slate-50 text-slate-400',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      day.isToday && 'bg-[#1e3a8a] text-white rounded-full h-6 w-6 inline-flex items-center justify-center',
                    )}
                  >
                    {day.dayNumber}
                  </span>
                  {day.shiftCount > 0 ? (
                    <span className="text-[10px] text-muted-foreground">{day.shiftCount} shift{day.shiftCount === 1 ? '' : 's'}</span>
                  ) : null}
                </div>
                <div className="mt-2 space-y-1">
                  {day.visibleShifts.map((shift) => (
                    <div
                      key={shift.shiftId}
                      className={cn(
                        'rounded-sm border px-1.5 py-1 text-[11px] leading-tight',
                        shift.isOpen
                          ? 'border-cherry/40 bg-cherry-soft text-cherry'
                          : shift.isMine
                            ? 'border-ink bg-ink text-paper'
                            : 'border-ink/20 bg-bleach text-ink',
                      )}
                    >
                      <p className="font-mono tabular">
                        {shift.startLabel}–{shift.endLabel}
                      </p>
                      <p className="truncate">
                        {shift.isOpen ? 'Open' : shift.assigneeLabel}
                      </p>
                    </div>
                  ))}
                  {day.hiddenShiftCount > 0 ? (
                    <p className="text-[11px] text-muted-foreground">+{day.hiddenShiftCount} more</p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeDay ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            aria-label="Close day details"
            onClick={() => setActiveDayKey(null)}
            className="absolute inset-0 bg-slate-900/45"
          />
          <div className="relative w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-card shadow-xl border p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{activeDay.dateLabel}</h3>
                <p className="text-sm text-muted-foreground">
                  {activeDay.shiftCount === 0 ? 'No shifts scheduled.' : `${activeDay.shiftCount} shift${activeDay.shiftCount === 1 ? '' : 's'} scheduled`}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveDayKey(null)}>
                Close
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {activeDay.shifts.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No shifts for this day yet.
                </div>
              ) : (
                activeDay.shifts.map((shift) => (
                  <div
                    key={shift.shiftId}
                    className={cn(
                      'rounded-sm border p-3',
                      shift.isOpen
                        ? 'border-cherry/40 bg-cherry-soft'
                        : shift.isMine
                          ? 'border-ink bg-ink/95 text-paper'
                          : 'border-ink/20 bg-bleach',
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className={cn('font-mono text-sm tabular', shift.isMine ? 'text-paper' : 'text-ink')}>
                          {shift.startLabel} – {shift.endLabel}
                        </p>
                        <p className={cn('mt-1 text-sm font-medium', shift.isMine && 'text-paper')}>
                          {shift.isOpen ? (
                            <span className="text-cherry">Open · needs staff</span>
                          ) : (
                            shift.assigneeLabel + (shift.isMine ? ' (you)' : '')
                          )}
                        </p>
                        {shift.location ? (
                          <p className={cn('mt-1 text-xs', shift.isMine ? 'text-paper/70' : 'text-ink-muted')}>
                            {shift.location}
                          </p>
                        ) : null}
                      </div>
                      {canManageStaff ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin?openShiftId=${shift.shiftId}#upcoming-shifts`}>
                            View / Edit
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {canManageStaff && createShiftAction ? (
              <div className="mt-5 border-t pt-4">
                <h4 className="font-medium">Add Shift For {activeDay.dateLabel}</h4>
                <form action={createShiftAction} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="hidden" name="returnView" value={returnView} />
                  <input type="hidden" name="returnDate" value={returnDate} />
                  <input type="hidden" name="shiftDate" value={activeDay.dateIso} />
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    Shift type and location are fixed for all new shifts.
                  </p>
                  <div className="space-y-1">
                    <label htmlFor="calendar-shift-start" className="text-sm font-medium">Start Time</label>
                    <TimePickerField
                      id="calendar-shift-start"
                      name="startTime"
                      defaultValue="16:00"
                      max="19:59"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="calendar-shift-end" className="text-sm font-medium">End Time</label>
                    <TimePickerField
                      id="calendar-shift-end"
                      name="endTime"
                      defaultValue="20:00"
                      max="20:00"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="calendar-shift-assignee" className="text-sm font-medium">Assign To (Optional)</label>
                    <select
                      id="calendar-shift-assignee"
                      name="assignedUserId"
                      defaultValue=""
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {staffOptions.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="calendar-shift-status" className="text-sm font-medium">Status</label>
                    <select
                      id="calendar-shift-status"
                      name="status"
                      defaultValue="published"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="calendar-shift-notes" className="text-sm font-medium">Notes (Optional)</label>
                    <textarea
                      id="calendar-shift-notes"
                      name="notes"
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Special tasks or notes..."
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">
                      Add Shift
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
