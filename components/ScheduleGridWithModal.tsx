'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TimePickerField } from '@/components/ui/date-time-picker'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import { cn } from '@/lib/utils'
import { serverActionFormProps } from '@/lib/serverActionForm'

type DayShift = {
  shiftId: string
  title: string
  location: string
  startLabel: string
  endLabel: string
  dateTimeLabel: string
  assigneeLabel: string
  assignedUserId: string | null
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
  assignShiftAction?: (formData: FormData) => void | Promise<void>
  cancelShiftAction?: (formData: FormData) => void | Promise<void>
}

type ActiveShift = { dayKey: string; shiftId: string }

export default function ScheduleGridWithModal({
  weekdayLabels,
  selectedView,
  dayEntries,
  canManageStaff,
  staffOptions,
  returnView,
  returnDate,
  createShiftAction,
  assignShiftAction,
  cancelShiftAction,
}: ScheduleGridWithModalProps) {
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null)
  const [createDayKey, setCreateDayKey] = useState<string | null>(null)
  const [overflowDayKey, setOverflowDayKey] = useState<string | null>(null)

  const activeShiftContext = useMemo(() => {
    if (!activeShift) return null
    const day = dayEntries.find((d) => d.key === activeShift.dayKey)
    if (!day) return null
    const shift = day.shifts.find((s) => s.shiftId === activeShift.shiftId)
    if (!shift) return null
    return { day, shift }
  }, [activeShift, dayEntries])

  const createDay = useMemo(
    () => (createDayKey ? dayEntries.find((day) => day.key === createDayKey) ?? null : null),
    [createDayKey, dayEntries],
  )

  const overflowDay = useMemo(
    () => (overflowDayKey ? dayEntries.find((day) => day.key === overflowDayKey) ?? null : null),
    [overflowDayKey, dayEntries],
  )

  const mobileDayEntries = useMemo(
    () => (selectedView === 'month' ? dayEntries.filter((day) => day.isCurrentMonth) : dayEntries),
    [dayEntries, selectedView],
  )

  const openShift = (dayKey: string, shiftId: string) => {
    setOverflowDayKey(null)
    setActiveShift({ dayKey, shiftId })
  }

  return (
    <>
      {/* Mobile: day-by-day agenda */}
      <div className="space-y-4 md:hidden">
        <div className="rounded-xl border border-dashed border-ink/20 bg-bleach px-4 py-3 text-sm text-ink-muted">
          Tap a shift to open it. {canManageStaff ? 'Use “Add shift” on a day to schedule a new one.' : ''}
        </div>
        <div className="space-y-3">
          {mobileDayEntries.map((day) => (
            <section
              key={day.key}
              className={cn(
                'rounded-xl border bg-card p-4 shadow-sm',
                day.isToday && 'border-ink/40 bg-paper',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{day.dateLabel}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {day.shiftCount === 0 ? 'No shifts scheduled' : `${day.shiftCount} shift${day.shiftCount === 1 ? '' : 's'} scheduled`}
                  </p>
                </div>
                {day.isToday ? (
                  <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-paper">Today</span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {day.shifts.length === 0 ? (
                  <p className="text-sm text-ink-muted">No shifts scheduled.</p>
                ) : (
                  day.shifts.map((shift) => (
                    <ShiftTile
                      key={shift.shiftId}
                      shift={shift}
                      variant="mobile"
                      onClick={() => openShift(day.key, shift.shiftId)}
                    />
                  ))
                )}
              </div>

              {canManageStaff && createShiftAction ? (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setCreateDayKey(day.key)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add shift
                  </Button>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>

      {/* Desktop: 7-column grid */}
      <div className="-mx-2 hidden overflow-x-auto px-2 md:block">
        <div className={cn(selectedView === 'week' ? 'min-w-[720px]' : 'min-w-[760px]')}>
          <div className="mb-2 grid grid-cols-7 gap-2">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {dayEntries.map((day) => (
              <div
                key={day.key}
                className={cn(
                  'flex flex-col',
                  selectedView === 'week' ? 'min-h-44 rounded-md border p-3 bg-card' : 'min-h-28 rounded-md border p-2 bg-card',
                  selectedView === 'month' && !day.isCurrentMonth && 'bg-muted/40 text-ink-muted',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center text-xs font-semibold leading-none',
                      day.isToday && 'rounded-full bg-ink text-paper',
                    )}
                  >
                    {day.dayNumber}
                  </span>
                  <div className="flex items-center gap-1 pt-1">
                    {day.shiftCount > 0 ? (
                      <span className="text-[10px] text-ink-muted">{day.shiftCount} shift{day.shiftCount === 1 ? '' : 's'}</span>
                    ) : null}
                    {canManageStaff && createShiftAction && (selectedView === 'week' || day.isCurrentMonth) ? (
                      <button
                        type="button"
                        aria-label={`Add shift on ${day.dateLabel}`}
                        title="Add shift"
                        onClick={() => setCreateDayKey(day.key)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-ink/15 bg-ink/5 text-ink/70 hover:bg-ink/10 hover:text-ink"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex-1 space-y-1">
                  {day.visibleShifts.map((shift) => (
                    <ShiftTile
                      key={shift.shiftId}
                      shift={shift}
                      variant="desktop"
                      onClick={() => openShift(day.key, shift.shiftId)}
                    />
                  ))}
                  {day.hiddenShiftCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setOverflowDayKey(day.key)}
                      className="text-[11px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                    >
                      +{day.hiddenShiftCount} more
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Single-shift popup */}
      {activeShiftContext ? (
        <Modal onClose={() => setActiveShift(null)} ariaLabel="Close shift details">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="stamp text-ink/60">{activeShiftContext.day.dateLabel}</p>
              <h3 className="font-serif text-2xl leading-tight text-ink">
                {activeShiftContext.shift.isOpen ? (
                  <span className="text-cherry">Open shift · needs staff</span>
                ) : (
                  activeShiftContext.shift.assigneeLabel + (activeShiftContext.shift.isMine ? ' (you)' : '')
                )}
              </h3>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveShift(null)}>
              Close
            </Button>
          </div>

          <div className="mt-4 space-y-1 rounded-sm border border-ink/20 bg-bleach p-3">
            <p className="font-mono text-base tabular text-ink">
              {activeShiftContext.shift.startLabel} – {activeShiftContext.shift.endLabel}
            </p>
            {activeShiftContext.shift.location ? (
              <p className="text-xs text-ink-muted">{activeShiftContext.shift.location}</p>
            ) : null}
            {activeShiftContext.shift.title ? (
              <p className="text-xs text-ink-muted">{activeShiftContext.shift.title}</p>
            ) : null}
          </div>

          {canManageStaff && assignShiftAction && staffOptions.length > 0 ? (
            <form
              {...serverActionFormProps(assignShiftAction)}
              onSubmit={() => setActiveShift(null)}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-dashed border-ink/20 pt-4"
            >
              <input type="hidden" name="returnView" value={returnView} />
              <input type="hidden" name="returnDate" value={returnDate} />
              <input type="hidden" name="shiftId" value={activeShiftContext.shift.shiftId} />
              <div className="min-w-[10rem] flex-1 space-y-1">
                <label htmlFor={`assign-${activeShiftContext.shift.shiftId}`} className="stamp text-ink/60">
                  {activeShiftContext.shift.isOpen ? 'Assign to' : 'Reassign to'}
                </label>
                <select
                  id={`assign-${activeShiftContext.shift.shiftId}`}
                  name="assignedUserId"
                  defaultValue={activeShiftContext.shift.assignedUserId ?? ''}
                  className="flex h-9 w-full rounded-sm border border-input bg-background px-2 text-sm text-ink"
                >
                  {activeShiftContext.shift.isOpen ? (
                    <option value="">Unassigned</option>
                  ) : null}
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role})
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm">
                {activeShiftContext.shift.isOpen ? 'Fill' : 'Save'}
              </Button>
            </form>
          ) : null}

          {canManageStaff && assignShiftAction && !activeShiftContext.shift.isOpen ? (
            <form
              {...serverActionFormProps(assignShiftAction)}
              onSubmit={() => setActiveShift(null)}
              className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-dashed border-ink/20 bg-paper-dim px-3 py-2"
            >
              <input type="hidden" name="returnView" value={returnView} />
              <input type="hidden" name="returnDate" value={returnDate} />
              <input type="hidden" name="shiftId" value={activeShiftContext.shift.shiftId} />
              <input type="hidden" name="assignedUserId" value="" />
              <p className="text-xs text-ink-muted">
                Remove <span className="font-medium text-ink">{activeShiftContext.shift.assigneeLabel}</span> but keep the slot open for someone else.
              </p>
              <ConfirmSubmitButton
                type="submit"
                size="sm"
                variant="outline"
                confirmTitle="Remove person from this shift?"
                confirmMessage={`Remove ${activeShiftContext.shift.assigneeLabel} from the ${activeShiftContext.shift.startLabel} – ${activeShiftContext.shift.endLabel} shift on ${activeShiftContext.day.dateLabel}? They'll be notified. The slot stays open.`}
                confirmLabel="Remove"
              >
                Remove {activeShiftContext.shift.assigneeLabel}
              </ConfirmSubmitButton>
            </form>
          ) : null}

          {canManageStaff && cancelShiftAction ? (
            <form
              {...serverActionFormProps(cancelShiftAction)}
              onSubmit={() => setActiveShift(null)}
              className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-ink/20 pt-4"
            >
              <input type="hidden" name="returnView" value={returnView} />
              <input type="hidden" name="returnDate" value={returnDate} />
              <input type="hidden" name="shiftId" value={activeShiftContext.shift.shiftId} />
              <input type="hidden" name="mode" value="cancel" />
              <p className="text-xs text-ink-muted">
                Cancels this one shift. Other shifts at the same time aren&rsquo;t affected.
              </p>
              <ConfirmSubmitButton
                type="submit"
                size="sm"
                variant="destructive"
                tone="destructive"
                confirmTitle="Cancel this shift?"
                confirmMessage={
                  activeShiftContext.shift.isOpen
                    ? `Cancel this open ${activeShiftContext.shift.startLabel} – ${activeShiftContext.shift.endLabel} shift on ${activeShiftContext.day.dateLabel}? Other shifts at the same time aren't affected.`
                    : `Cancel ${activeShiftContext.shift.assigneeLabel}'s ${activeShiftContext.shift.startLabel} – ${activeShiftContext.shift.endLabel} shift on ${activeShiftContext.day.dateLabel}? ${activeShiftContext.shift.assigneeLabel} will be notified. Other shifts at the same time aren't affected.`
                }
                confirmLabel="Cancel shift"
                cancelLabel="Keep shift"
              >
                Cancel this shift
              </ConfirmSubmitButton>
            </form>
          ) : null}

          {canManageStaff ? (
            <div className="mt-4 border-t border-dashed border-ink/20 pt-3 text-right">
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin?openShiftId=${activeShiftContext.shift.shiftId}#upcoming-shifts`}>
                  Edit time or notes →
                </Link>
              </Button>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {/* Create-shift popup */}
      {createDay && canManageStaff && createShiftAction ? (
        <Modal onClose={() => setCreateDayKey(null)} ariaLabel="Close add shift">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="stamp text-ink/60">{createDay.dateLabel}</p>
              <h3 className="font-serif text-2xl leading-tight text-ink">Add a shift</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Shift type and location are fixed. Choose someone to assign, or leave it unassigned.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateDayKey(null)}>
              Close
            </Button>
          </div>

          <form
            {...serverActionFormProps(createShiftAction)}
            onSubmit={() => setCreateDayKey(null)}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="returnView" value={returnView} />
            <input type="hidden" name="returnDate" value={returnDate} />
            <input type="hidden" name="shiftDate" value={createDay.dateIso} />
            <div className="space-y-1">
              <label htmlFor="calendar-shift-start" className="text-sm font-medium">Start time</label>
              <TimePickerField
                id="calendar-shift-start"
                name="startTime"
                defaultValue="16:00"
                max="19:59"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="calendar-shift-end" className="text-sm font-medium">End time</label>
              <TimePickerField
                id="calendar-shift-end"
                name="endTime"
                defaultValue="20:00"
                max="20:00"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="calendar-shift-assignee" className="text-sm font-medium">Assign to</label>
              <select
                id="calendar-shift-assignee"
                name="assignedUserId"
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned (leave open)</option>
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
              <label htmlFor="calendar-shift-notes" className="text-sm font-medium">Notes (optional)</label>
              <textarea
                id="calendar-shift-notes"
                name="notes"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Special tasks or notes…"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Add shift</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Overflow list popup (for "+N more" on crowded day cells) */}
      {overflowDay ? (
        <Modal onClose={() => setOverflowDayKey(null)} ariaLabel="Close day list">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="stamp text-ink/60">{overflowDay.dateLabel}</p>
              <h3 className="font-serif text-2xl leading-tight text-ink">All shifts</h3>
              <p className="mt-1 text-xs text-ink-muted">
                {overflowDay.shiftCount} shift{overflowDay.shiftCount === 1 ? '' : 's'} on this day.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setOverflowDayKey(null)}>
              Close
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {overflowDay.shifts.map((shift) => (
              <ShiftTile
                key={shift.shiftId}
                shift={shift}
                variant="mobile"
                onClick={() => openShift(overflowDay.key, shift.shiftId)}
              />
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  )
}

type ShiftTileProps = {
  shift: DayShift
  variant: 'mobile' | 'desktop'
  onClick: () => void
}

function ShiftTile({ shift, variant, onClick }: ShiftTileProps) {
  const isDesktop = variant === 'desktop'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full rounded-sm border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ink/40',
        isDesktop ? 'px-1.5 py-1 text-[11px] leading-tight' : 'px-3 py-2',
        shift.isOpen
          ? 'border-cherry/40 bg-cherry-soft text-cherry hover:border-cherry/60'
          : shift.isMine
            ? 'border-ink bg-ink text-paper hover:bg-ink-dim'
            : 'border-ink/20 bg-paper text-ink hover:border-ink/40',
      )}
    >
      <p className={cn('truncate font-bold', isDesktop ? '' : 'text-sm')}>
        {shift.isOpen ? 'Open · needs staff' : shift.assigneeLabel}
      </p>
      <p className={cn('font-mono tabular', isDesktop ? '' : 'mt-0.5 text-xs', shift.isMine && !isDesktop ? 'text-paper/80' : '')}>
        {shift.startLabel}{isDesktop ? '–' : ' – '}{shift.endLabel}
      </p>
    </button>
  )
}

type ModalProps = {
  onClose: () => void
  ariaLabel: string
  children: React.ReactNode
}

function Modal({ onClose, ariaLabel, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClose}
        className="absolute inset-0 bg-ink/45"
      />
      <div className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-xl border bg-card p-4 shadow-xl sm:max-w-lg sm:rounded-xl sm:p-5">
        {children}
      </div>
    </div>
  )
}
