import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, eq, gte, isNull, lt, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assignments, shifts, users } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import SignOutButton from '@/components/SignOutButton'

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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/login')
  }

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

  const [scheduledShiftRows, upcomingShiftRows, thisWeekShiftRows, teamRows] = await Promise.all([
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
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
                  <div className="min-w-[720px]">
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
                              'min-h-28 rounded-md border p-2 bg-white',
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
                <Button className="w-full" variant="outline">
                  Request Time Off
                </Button>
                <Button className="w-full" variant="outline">
                  Swap a Shift
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
