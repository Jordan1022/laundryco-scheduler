import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, eq, gte, isNull, lt, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assignments, shiftSwapRequests, shifts, timeOffRequests, users } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import SignOutButton from '@/components/SignOutButton'
import { Input } from '@/components/ui/input'

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const monthDayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const shortDateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const shortTimeLabel = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

type DashboardView = 'week' | 'month'

type DashboardPageProps = {
  searchParams?: {
    view?: string | string[]
    date?: string | string[]
    status?: string | string[]
    error?: string | string[]
  }
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

function parseViewParam(rawView: string | undefined): DashboardView {
  return rawView === 'month' ? 'month' : 'week'
}

function parseDateParam(rawDate: string | undefined) {
  if (!rawDate) return new Date()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate)
  if (!match) return new Date()

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return new Date()

  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== (month - 1) ||
    parsed.getDate() !== day
  ) {
    return new Date()
  }

  return parsed
}

function formatDateParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildDashboardLink(view: DashboardView, date: Date) {
  return `/dashboard?view=${view}&date=${formatDateParam(date)}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toStartOfDay(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function getMondayWeekBounds(baseDate: Date) {
  const start = toStartOfDay(baseDate)
  const diffToMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - diffToMonday)
  const end = addDays(start, 7)
  return { start, end }
}

function getCalendarBounds(monthStart: Date) {
  const calendarStart = toStartOfDay(monthStart)
  const diffToMonday = (calendarStart.getDay() + 6) % 7
  calendarStart.setDate(calendarStart.getDate() - diffToMonday)
  const calendarEnd = addDays(calendarStart, 42)
  return { calendarStart, calendarEnd }
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function shiftHours(startTime: Date, endTime: Date) {
  return Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1)
}

async function requireAuthenticatedSession() {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/login')
  }
  return session
}

function parseISODateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function buildDashboardReturnUrl(
  view: DashboardView,
  date: Date,
  options?: {
    status?: string
    error?: string
    hash?: string
  },
) {
  const params = new URLSearchParams({
    view,
    date: formatDateParam(date),
  })

  if (options?.status) params.set('status', options.status)
  if (options?.error) params.set('error', options.error)

  const hash = options?.hash ? `#${options.hash}` : ''
  return `/dashboard?${params.toString()}${hash}`
}

function getReturnContext(formData: FormData) {
  const returnView = parseViewParam(String(formData.get('returnView') ?? ''))
  const returnDate = toStartOfDay(parseDateParam(String(formData.get('returnDate') ?? '')))
  return { returnView, returnDate }
}

async function requestTimeOffAction(formData: FormData) {
  'use server'

  const session = await requireAuthenticatedSession()
  const { returnView, returnDate } = getReturnContext(formData)
  const startDateRaw = String(formData.get('startDate') ?? '')
  const endDateRaw = String(formData.get('endDate') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()

  const startDate = parseISODateOnly(startDateRaw)
  const endDate = parseISODateOnly(endDateRaw)
  if (!startDate || !endDate || endDate < startDate) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'invalid-timeoff-dates', hash: 'request-time-off' }))
  }

  await db.insert(timeOffRequests).values({
    userId: session.user.id,
    startDate,
    endDate,
    reason: reason || null,
    status: 'pending',
  })

  redirect(buildDashboardReturnUrl(returnView, returnDate, { status: 'timeoff-submitted', hash: 'request-time-off' }))
}

async function requestSwapAction(formData: FormData) {
  'use server'

  const session = await requireAuthenticatedSession()
  const { returnView, returnDate } = getReturnContext(formData)
  const assignmentId = String(formData.get('assignmentId') ?? '')
  const requestedUserId = String(formData.get('requestedUserId') ?? '')

  if (!assignmentId || !requestedUserId || requestedUserId === session.user.id) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'invalid-swap-request', hash: 'swap-shift' }))
  }

  const [assignmentRow] = await db.select({
    assignmentId: assignments.id,
    assignmentStatus: assignments.status,
    assignmentUserId: assignments.userId,
    shiftId: shifts.id,
    shiftStatus: shifts.status,
    shiftStart: shifts.startTime,
  })
    .from(assignments)
    .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
    .where(eq(assignments.id, assignmentId))
    .limit(1)

  if (
    !assignmentRow ||
    assignmentRow.assignmentUserId !== session.user.id ||
    assignmentRow.assignmentStatus !== 'assigned' ||
    assignmentRow.shiftStatus === 'cancelled' ||
    assignmentRow.shiftStart < new Date()
  ) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'invalid-swap-request', hash: 'swap-shift' }))
  }

  const [targetUser] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.id, requestedUserId))
    .limit(1)
  if (!targetUser) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'invalid-swap-target', hash: 'swap-shift' }))
  }

  const existingPendingSwap = await db.select({ id: shiftSwapRequests.id })
    .from(shiftSwapRequests)
    .where(and(
      eq(shiftSwapRequests.originalAssignmentId, assignmentId),
      eq(shiftSwapRequests.status, 'pending'),
    ))
    .limit(1)
  if (existingPendingSwap.length > 0) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'swap-already-pending', hash: 'swap-shift' }))
  }

  const conflictingAssignment = await db.select({ id: assignments.id })
    .from(assignments)
    .where(and(
      eq(assignments.shiftId, assignmentRow.shiftId),
      eq(assignments.userId, requestedUserId),
      eq(assignments.status, 'assigned'),
    ))
    .limit(1)
  if (conflictingAssignment.length > 0) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'swap-target-assigned', hash: 'swap-shift' }))
  }

  await db.insert(shiftSwapRequests).values({
    originalAssignmentId: assignmentId,
    requestedUserId,
    status: 'pending',
  })

  redirect(buildDashboardReturnUrl(returnView, returnDate, { status: 'swap-submitted', hash: 'swap-shift' }))
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireAuthenticatedSession()

  const { name, role } = session.user
  const selectedView = parseViewParam(getQueryValue(searchParams?.view))
  const anchorDate = toStartOfDay(parseDateParam(getQueryValue(searchParams?.date)))
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
  const { start: selectedWeekStart, end: selectedWeekEnd } = getMondayWeekBounds(anchorDate)
  const { calendarStart, calendarEnd } = getCalendarBounds(monthStart)
  const now = new Date()
  const nextSevenDays = addDays(now, 7)
  const { start: thisWeekStart, end: thisWeekEnd } = getMondayWeekBounds(now)

  const scheduleRangeStart = selectedView === 'month' ? calendarStart : selectedWeekStart
  const scheduleRangeEnd = selectedView === 'month' ? calendarEnd : selectedWeekEnd

  const [scheduledShiftRows, upcomingShiftRows, thisWeekShiftRows, swapEligibleRows, coworkerRows, teamRows] = await Promise.all([
    db.select({
      shiftId: shifts.id,
      title: shifts.title,
      location: shifts.location,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
      .from(assignments)
      .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(and(
        eq(assignments.userId, session.user.id),
        eq(assignments.status, 'assigned'),
        gte(shifts.startTime, scheduleRangeStart),
        lt(shifts.startTime, scheduleRangeEnd),
        or(isNull(shifts.status), ne(shifts.status, 'cancelled')),
      ))
      .orderBy(shifts.startTime),
    db.select({
      shiftId: shifts.id,
      title: shifts.title,
      location: shifts.location,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
      .from(assignments)
      .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(and(
        eq(assignments.userId, session.user.id),
        eq(assignments.status, 'assigned'),
        gte(shifts.startTime, now),
        lt(shifts.startTime, nextSevenDays),
        or(isNull(shifts.status), ne(shifts.status, 'cancelled')),
      ))
      .orderBy(shifts.startTime),
    db.select({
      shiftId: shifts.id,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
      .from(assignments)
      .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(and(
        eq(assignments.userId, session.user.id),
        eq(assignments.status, 'assigned'),
        gte(shifts.startTime, thisWeekStart),
        lt(shifts.startTime, thisWeekEnd),
        or(isNull(shifts.status), ne(shifts.status, 'cancelled')),
      )),
    db.select({
      assignmentId: assignments.id,
      shiftId: shifts.id,
      title: shifts.title,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      location: shifts.location,
    })
      .from(assignments)
      .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(and(
        eq(assignments.userId, session.user.id),
        eq(assignments.status, 'assigned'),
        gte(shifts.startTime, now),
        or(isNull(shifts.status), ne(shifts.status, 'cancelled')),
      ))
      .orderBy(shifts.startTime),
    db.select({
      id: users.id,
      name: users.name,
      role: users.role,
    })
      .from(users)
      .where(and(ne(users.id, session.user.id), ne(users.role, 'inactive')))
      .orderBy(users.name),
    db.select({ id: users.id }).from(users),
  ])

  const shiftsByDay = new Map<string, typeof scheduledShiftRows>()
  for (const shift of scheduledShiftRows) {
    const key = dateKey(shift.startTime)
    const dayShifts = shiftsByDay.get(key)
    if (dayShifts) {
      dayShifts.push(shift)
    } else {
      shiftsByDay.set(key, [shift])
    }
  }

  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index))
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(selectedWeekStart, index))
  const visibleDays = selectedView === 'month' ? monthDays : weekDays

  const todayKey = dateKey(now)
  const upcomingShiftCount = upcomingShiftRows.length
  const thisWeekHours = thisWeekShiftRows.reduce((sum, shift) => sum + shiftHours(shift.startTime, shift.endTime), 0)
  const teamCount = teamRows.length
  const formStatus = getQueryValue(searchParams?.status)
  const formError = getQueryValue(searchParams?.error)

  const prevAnchor = selectedView === 'month'
    ? new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
    : addDays(anchorDate, -7)
  const nextAnchor = selectedView === 'month'
    ? new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    : addDays(anchorDate, 7)
  const viewTitle = selectedView === 'month'
    ? monthLabel.format(monthStart)
    : `${monthDayLabel.format(selectedWeekStart)} - ${monthDayLabel.format(addDays(selectedWeekEnd, -1))}`

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1e3a8a] flex items-center justify-center">
              <span className="text-white font-bold">LC</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Laundry Co. Scheduler</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">
              {role}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{upcomingShiftCount}</div>
              <p className="text-sm text-muted-foreground">Next 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatHours(thisWeekHours)}</div>
              <p className="text-sm text-muted-foreground">Scheduled this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teamCount}</div>
              <p className="text-sm text-muted-foreground">Active users</p>
            </CardContent>
          </Card>
        </div>

        <div className={cn('grid grid-cols-1 gap-8', selectedView === 'week' ? 'lg:grid-cols-1' : 'lg:grid-cols-3')}>
          <div className={cn(selectedView === 'week' ? 'lg:col-span-1' : 'lg:col-span-2')}>
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Your Schedule</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant={selectedView === 'week' ? 'default' : 'outline'}>
                      <Link href={buildDashboardLink('week', anchorDate)}>Week</Link>
                    </Button>
                    <Button asChild size="sm" variant={selectedView === 'month' ? 'default' : 'outline'}>
                      <Link href={buildDashboardLink('month', anchorDate)}>Month</Link>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={buildDashboardLink(selectedView, prevAnchor)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={buildDashboardLink(selectedView, nextAnchor)}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <span className="text-sm font-medium text-center">{viewTitle}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className={cn(selectedView === 'week' ? 'min-w-0' : 'min-w-[720px]')}>
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {weekdayLabels.map((label) => (
                        <div key={label} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center py-1">
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {visibleDays.map((day) => {
                        const key = dateKey(day)
                        const dayShifts = shiftsByDay.get(key) ?? []
                        const isToday = key === todayKey
                        const isCurrentMonth = day.getMonth() === monthStart.getMonth() && day.getFullYear() === monthStart.getFullYear()

                        return (
                          <div
                            key={key}
                            className={cn(
                              selectedView === 'week' ? 'min-h-44 rounded-md border p-3 bg-white' : 'min-h-28 rounded-md border p-2 bg-white',
                              selectedView === 'month' && !isCurrentMonth && 'bg-slate-50 text-slate-400',
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  'text-xs font-semibold',
                                  isToday && 'bg-[#1e3a8a] text-white rounded-full h-6 w-6 inline-flex items-center justify-center',
                                )}
                              >
                                {day.getDate()}
                              </span>
                              {dayShifts.length > 0 ? (
                                <span className="text-[10px] text-slate-500">{dayShifts.length} shift{dayShifts.length === 1 ? '' : 's'}</span>
                              ) : null}
                            </div>
                            <div className="mt-2 space-y-1">
                              {dayShifts.slice(0, selectedView === 'month' ? 2 : 4).map((shift) => (
                                <div key={shift.shiftId} className="rounded bg-blue-50 border border-blue-100 px-1.5 py-1 text-[11px] leading-tight">
                                  <p className="font-medium text-blue-900">
                                    {shortTimeLabel.format(shift.startTime)}-{shortTimeLabel.format(shift.endTime)}
                                  </p>
                                  <p className="text-blue-800 truncate">{shift.title}</p>
                                </div>
                              ))}
                              {dayShifts.length > (selectedView === 'month' ? 2 : 4) ? (
                                <p className="text-[11px] text-muted-foreground">
                                  +{dayShifts.length - (selectedView === 'month' ? 2 : 4)} more
                                </p>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full" variant="outline">
                  <Link href="#request-time-off">Request Time Off</Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="#swap-shift">Swap a Shift</Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href={buildDashboardLink('week', now)}>
                    Go To Today
                  </Link>
                </Button>
                {role === 'manager' || role === 'admin' ? (
                  <Button asChild className="w-full bg-[#1e3a8a] hover:bg-[#172b6d]">
                    <Link href="/admin#create-shift">Create New Shift</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card id="request-time-off">
              <CardHeader>
                <CardTitle>Request Time Off</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formStatus === 'timeoff-submitted' ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
                    Time-off request submitted for review.
                  </div>
                ) : null}
                {formError === 'invalid-timeoff-dates' ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                    End date must be on or after start date.
                  </div>
                ) : null}
                <form action={requestTimeOffAction} className="space-y-3">
                  <input type="hidden" name="returnView" value={selectedView} />
                  <input type="hidden" name="returnDate" value={formatDateParam(anchorDate)} />
                  <div className="space-y-1">
                    <label htmlFor="startDate" className="text-sm font-medium">Start Date</label>
                    <Input id="startDate" name="startDate" type="date" defaultValue={formatDateParam(now)} required />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="endDate" className="text-sm font-medium">End Date</label>
                    <Input id="endDate" name="endDate" type="date" defaultValue={formatDateParam(now)} required />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reason" className="text-sm font-medium">Reason (Optional)</label>
                    <textarea
                      id="reason"
                      name="reason"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Vacation, appointment, personal day..."
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-[#172b6d]">
                    Submit Time-Off Request
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card id="swap-shift">
              <CardHeader>
                <CardTitle>Swap a Shift</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formStatus === 'swap-submitted' ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
                    Swap request submitted for manager approval.
                  </div>
                ) : null}
                {formError === 'invalid-swap-request' ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                    Choose a valid future shift and teammate.
                  </div>
                ) : null}
                {formError === 'invalid-swap-target' ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                    The requested teammate could not be found.
                  </div>
                ) : null}
                {formError === 'swap-already-pending' ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                    A pending swap request already exists for that shift.
                  </div>
                ) : null}
                {formError === 'swap-target-assigned' ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                    That teammate is already assigned to the selected shift.
                  </div>
                ) : null}

                {swapEligibleRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming assigned shifts available to swap.</p>
                ) : coworkerRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teammates available to request a swap with.</p>
                ) : (
                  <form action={requestSwapAction} className="space-y-3">
                    <input type="hidden" name="returnView" value={selectedView} />
                    <input type="hidden" name="returnDate" value={formatDateParam(anchorDate)} />
                    <div className="space-y-1">
                      <label htmlFor="assignmentId" className="text-sm font-medium">Your Shift</label>
                      <select
                        id="assignmentId"
                        name="assignmentId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        {swapEligibleRows.map((assignment) => (
                          <option key={assignment.assignmentId} value={assignment.assignmentId}>
                            {shortDateLabel.format(assignment.startTime)} {shortTimeLabel.format(assignment.startTime)}-{shortTimeLabel.format(assignment.endTime)} · {assignment.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="requestedUserId" className="text-sm font-medium">Swap With</label>
                      <select
                        id="requestedUserId"
                        name="requestedUserId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        {coworkerRows.map((coworker) => (
                          <option key={coworker.id} value={coworker.id}>
                            {coworker.name} ({coworker.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-[#172b6d]">
                      Submit Swap Request
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingShiftRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assigned shifts in the next 7 days.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingShiftRows.map((shift) => (
                      <div key={shift.shiftId} className="rounded-md border p-3 bg-white">
                        <p className="font-medium">{shift.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {shortDateLabel.format(shift.startTime)} · {shortTimeLabel.format(shift.startTime)} - {shortTimeLabel.format(shift.endTime)}
                        </p>
                        {shift.location ? <p className="text-xs text-muted-foreground mt-1">{shift.location}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
