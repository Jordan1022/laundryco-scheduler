'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DayShift = {
  shiftId: string
  title: string
  location: string
  startLabel: string
  endLabel: string
  dateTimeLabel: string
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

  return (
    <>
      <div className="-mx-2 overflow-x-auto px-2">
        <div className={cn(selectedView === 'week' ? 'min-w-[720px]' : 'min-w-[760px]')}>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekdayLabels.map((label) => (
              <div key={label} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center py-1">
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
                    <div key={shift.shiftId} className="rounded bg-blue-50 border border-blue-100 px-1.5 py-1 text-[11px] leading-tight">
                      <p className="font-medium text-blue-900">
                        {shift.startLabel}-{shift.endLabel}
                      </p>
                      <p className="text-blue-800 truncate">{shift.title}</p>
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
                  <div key={shift.shiftId} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{shift.title}</p>
                        <p className="text-sm text-muted-foreground">{shift.dateTimeLabel}</p>
                        {shift.location ? <p className="text-xs text-muted-foreground mt-1">{shift.location}</p> : null}
                      </div>
                      {canManageStaff ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin?openShiftId=${shift.shiftId}#shift-${shift.shiftId}`}>
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

                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="calendar-shift-title" className="text-sm font-medium">Shift Title</label>
                    <input
                      id="calendar-shift-title"
                      name="title"
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Evening Front Desk"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="calendar-shift-start" className="text-sm font-medium">Start Time</label>
                    <input
                      id="calendar-shift-start"
                      name="startTime"
                      type="time"
                      max="19:59"
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="calendar-shift-end" className="text-sm font-medium">End Time</label>
                    <input
                      id="calendar-shift-end"
                      name="endTime"
                      type="time"
                      max="20:00"
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="calendar-shift-location" className="text-sm font-medium">Location</label>
                    <input
                      id="calendar-shift-location"
                      name="location"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Main Store"
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
