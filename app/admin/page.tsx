import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assignments, shiftSwapRequests, shifts, timeOffRequests, users } from '@/lib/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CalendarDays, CalendarPlus, CheckSquare, UserPlus, Users } from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'

const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const timeLabel = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const dateTimeLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const CLOSING_TIME_MINUTES = 20 * 60 // 8:00 PM

function getWeekBounds(base: Date) {
  const start = new Date(base)
  start.setHours(0, 0, 0, 0)
  const diffToMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - diffToMonday)

  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1)
}

function rolePill(role: string) {
  if (role === 'admin') return 'bg-violet-100 text-violet-800'
  if (role === 'manager') return 'bg-blue-100 text-blue-800'
  return 'bg-slate-100 text-slate-700'
}

function shiftStatusPill(status: string | null) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-800'
  if (status === 'draft') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function parseLocalDateTime(dateValue: string, timeValue: string) {
  const dateTime = new Date(`${dateValue}T${timeValue}`)
  if (Number.isNaN(dateTime.getTime())) return null
  return dateTime
}

function parseTimeToMinutes(timeValue: string) {
  const [hourRaw, minuteRaw] = timeValue.split(':')
  const hours = Number(hourRaw)
  const minutes = Number(minuteRaw)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return (hours * 60) + minutes
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

async function requireManagerSession() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'manager' && session.user.role !== 'admin')) {
    redirect('/dashboard')
  }
  return session
}

async function createShiftAction(formData: FormData) {
  'use server'

  const session = await requireManagerSession()

  const title = String(formData.get('title') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()
  const shiftDate = String(formData.get('shiftDate') ?? '')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const assignedUserId = String(formData.get('assignedUserId') ?? '')
  const requestedStatus = String(formData.get('status') ?? 'published')
  const status = requestedStatus === 'draft' ? 'draft' : 'published'

  if (!title || !shiftDate || !startTime || !endTime) {
    redirect('/admin?error=missing-fields#create-shift')
  }

  const startDateTime = parseLocalDateTime(shiftDate, startTime)
  const endDateTime = parseLocalDateTime(shiftDate, endTime)
  if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
    redirect('/admin?error=invalid-time#create-shift')
  }
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  if (startMinutes === null || endMinutes === null || startMinutes >= CLOSING_TIME_MINUTES || endMinutes > CLOSING_TIME_MINUTES) {
    redirect('/admin?error=after-hours#create-shift')
  }

  const [newShift] = await db.insert(shifts).values({
    title,
    location: location || null,
    notes: notes || null,
    startTime: startDateTime,
    endTime: endDateTime,
    status,
    createdBy: session.user.id,
  }).returning({ id: shifts.id })

  if (assignedUserId) {
    const userExists = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, assignedUserId))
      .limit(1)

    if (userExists.length > 0) {
      await db.insert(assignments).values({
        shiftId: newShift.id,
        userId: assignedUserId,
        status: 'assigned',
      })
    }
  }

  redirect('/admin?status=shift-created#create-shift')
}

async function reviewTimeOffAction(formData: FormData) {
  'use server'

  const session = await requireManagerSession()
  const requestId = String(formData.get('requestId') ?? '')
  const decision = String(formData.get('decision') ?? '')
  const nextStatus = decision === 'approve' ? 'approved' : decision === 'deny' ? 'denied' : null

  if (!requestId || !nextStatus) {
    redirect('/admin?error=invalid-review#requests')
  }

  const reviewed = await db.update(timeOffRequests).set({
    status: nextStatus,
    reviewedBy: session.user.id,
    reviewedAt: new Date(),
  })
    .where(and(eq(timeOffRequests.id, requestId), eq(timeOffRequests.status, 'pending')))
    .returning({ id: timeOffRequests.id })

  if (reviewed.length === 0) {
    redirect('/admin?error=request-not-found#requests')
  }

  redirect(`/admin?status=timeoff-${nextStatus}#requests`)
}

async function reviewSwapAction(formData: FormData) {
  'use server'

  await requireManagerSession()
  const swapId = String(formData.get('swapId') ?? '')
  const decision = String(formData.get('decision') ?? '')

  if (!swapId || (decision !== 'approve' && decision !== 'deny')) {
    redirect('/admin?error=invalid-review#requests')
  }

  if (decision === 'deny') {
    const denied = await db.update(shiftSwapRequests).set({ status: 'denied' })
      .where(and(eq(shiftSwapRequests.id, swapId), eq(shiftSwapRequests.status, 'pending')))
      .returning({ id: shiftSwapRequests.id })

    if (denied.length === 0) {
      redirect('/admin?error=swap-not-found#requests')
    }

    redirect('/admin?status=swap-denied#requests')
  }

  let swapApproveResult: 'approved' | 'swap-not-found' | 'assignment-not-found' | 'swap-conflict' = 'approved'

  try {
    await db.transaction(async (tx) => {
      const [swap] = await tx.select({
        id: shiftSwapRequests.id,
        assignmentId: shiftSwapRequests.originalAssignmentId,
        requestedUserId: shiftSwapRequests.requestedUserId,
      })
        .from(shiftSwapRequests)
        .where(and(eq(shiftSwapRequests.id, swapId), eq(shiftSwapRequests.status, 'pending')))
        .limit(1)

      if (!swap) throw new Error('swap-not-found')

      const [assignment] = await tx.select({
        id: assignments.id,
        shiftId: assignments.shiftId,
        userId: assignments.userId,
      })
        .from(assignments)
        .where(eq(assignments.id, swap.assignmentId))
        .limit(1)

      if (!assignment) throw new Error('assignment-not-found')

      if (assignment.userId !== swap.requestedUserId) {
        const conflictingAssignment = await tx.select({ id: assignments.id })
          .from(assignments)
          .where(and(
            eq(assignments.shiftId, assignment.shiftId),
            eq(assignments.userId, swap.requestedUserId),
          ))
          .limit(1)

        if (conflictingAssignment.length > 0) throw new Error('swap-conflict')

        await tx.update(assignments).set({
          userId: swap.requestedUserId,
          status: 'assigned',
        }).where(eq(assignments.id, assignment.id))
      }

      await tx.update(shiftSwapRequests).set({ status: 'approved' })
        .where(eq(shiftSwapRequests.id, swap.id))
    })
  } catch (error) {
    if (error instanceof Error && (
      error.message === 'swap-not-found' ||
      error.message === 'assignment-not-found' ||
      error.message === 'swap-conflict'
    )) {
      swapApproveResult = error.message
    } else {
      throw error
    }
  }

  if (swapApproveResult !== 'approved') {
    redirect(`/admin?error=${swapApproveResult}#requests`)
  }

  redirect('/admin?status=swap-approved#requests')
}

type AdminPageProps = {
  searchParams?: {
    status?: string | string[]
    error?: string | string[]
  }
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await requireManagerSession()

  const now = new Date()
  const { start: weekStart, end: weekEnd } = getWeekBounds(now)

  const [staffRows, upcomingShiftRows, weekShiftRows, pendingTimeOffRows, pendingSwapRows] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
    }).from(users).orderBy(users.name),
    db.select({
      id: shifts.id,
      title: shifts.title,
      location: shifts.location,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      status: shifts.status,
    }).from(shifts).where(gte(shifts.startTime, now)).orderBy(shifts.startTime).limit(8),
    db.select({
      id: shifts.id,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      status: shifts.status,
    }).from(shifts).where(and(gte(shifts.startTime, weekStart), lt(shifts.startTime, weekEnd))),
    db.select({
      id: timeOffRequests.id,
      userName: users.name,
      startDate: timeOffRequests.startDate,
      endDate: timeOffRequests.endDate,
      reason: timeOffRequests.reason,
      createdAt: timeOffRequests.createdAt,
    })
      .from(timeOffRequests)
      .leftJoin(users, eq(timeOffRequests.userId, users.id))
      .where(eq(timeOffRequests.status, 'pending'))
      .orderBy(timeOffRequests.startDate)
      .limit(8),
    db.select({
      id: shiftSwapRequests.id,
      assignmentId: shiftSwapRequests.originalAssignmentId,
      requestedUserId: shiftSwapRequests.requestedUserId,
      createdAt: shiftSwapRequests.createdAt,
    })
      .from(shiftSwapRequests)
      .where(eq(shiftSwapRequests.status, 'pending'))
      .orderBy(desc(shiftSwapRequests.createdAt))
      .limit(8),
  ])

  const shiftIds = [...new Set([...upcomingShiftRows.map((shift) => shift.id), ...weekShiftRows.map((shift) => shift.id)])]
  const swapAssignmentIds = pendingSwapRows.map((swap) => swap.assignmentId)

  const [assignmentRows, swapAssignments] = await Promise.all([
    shiftIds.length === 0
      ? Promise.resolve([])
      : db.select({
          id: assignments.id,
          shiftId: assignments.shiftId,
          userId: assignments.userId,
          status: assignments.status,
        }).from(assignments).where(inArray(assignments.shiftId, shiftIds)),
    swapAssignmentIds.length === 0
      ? Promise.resolve([])
      : db.select({
          id: assignments.id,
          shiftId: assignments.shiftId,
          userId: assignments.userId,
        }).from(assignments).where(inArray(assignments.id, swapAssignmentIds)),
  ])

  const existingShiftMap = new Map(upcomingShiftRows.map((shift) => [shift.id, shift]))
  const missingSwapShiftIds = [...new Set(swapAssignments.map((assignment) => assignment.shiftId))]
    .filter((shiftId) => !existingShiftMap.has(shiftId))
  const swapShiftRows = missingSwapShiftIds.length === 0
    ? []
    : await db.select({
        id: shifts.id,
        title: shifts.title,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        location: shifts.location,
        status: shifts.status,
      }).from(shifts).where(inArray(shifts.id, missingSwapShiftIds))

  const shiftMap = new Map([...upcomingShiftRows, ...swapShiftRows].map((shift) => [shift.id, shift]))
  const swapAssignmentMap = new Map(swapAssignments.map((assignment) => [assignment.id, assignment]))

  const userIdsToLookup = [...new Set([
    ...assignmentRows.map((row) => row.userId),
    ...pendingSwapRows.map((row) => row.requestedUserId),
    ...swapAssignments.map((row) => row.userId),
  ])]
  const extraUsers = userIdsToLookup.length === 0
    ? []
    : await db.select({
        id: users.id,
        name: users.name,
      }).from(users).where(inArray(users.id, userIdsToLookup))
  const userNameMap = new Map(extraUsers.map((row) => [row.id, row.name]))

  const assignedCountByShift = new Map<string, number>()
  for (const row of assignmentRows) {
    if (row.status !== 'assigned') continue
    assignedCountByShift.set(row.shiftId, (assignedCountByShift.get(row.shiftId) ?? 0) + 1)
  }

  const activeStaff = staffRows
  const formStatus = getQueryValue(searchParams?.status)
  const formError = getQueryValue(searchParams?.error)
  const pendingRequestsCount = pendingTimeOffRows.length + pendingSwapRows.length
  const unfilledUpcomingShifts = upcomingShiftRows.filter((shift) => {
    if (shift.status === 'cancelled') return false
    return (assignedCountByShift.get(shift.id) ?? 0) === 0
  })
  const weekHours = weekShiftRows.reduce((total, shift) => {
    if (shift.status === 'cancelled') return total
    const durationHours = Math.max(0, (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60))
    const assignedCount = assignedCountByShift.get(shift.id) ?? 0
    return total + (durationHours * assignedCount)
  }, 0)

  const coverageByDay = new Map<string, { label: string; total: number; open: number }>()
  for (const shift of upcomingShiftRows) {
    if (shift.status === 'cancelled') continue
    const key = shift.startTime.toDateString()
    const existing = coverageByDay.get(key)
    const isOpen = (assignedCountByShift.get(shift.id) ?? 0) === 0
    if (!existing) {
      coverageByDay.set(key, {
        label: dateLabel.format(shift.startTime),
        total: 1,
        open: isOpen ? 1 : 0,
      })
      continue
    }
    existing.total += 1
    if (isOpen) existing.open += 1
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1e3a8a] flex items-center justify-center">
              <span className="text-white font-bold">LC</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Scheduler Admin</h1>
              <p className="text-sm text-muted-foreground">
                Running operations for {session.user.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Team View</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingRequestsCount}</div>
              <p className="text-sm text-muted-foreground">Time off and swap approvals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unfilled Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{unfilledUpcomingShifts.length}</div>
              <p className="text-sm text-muted-foreground">In the next {upcomingShiftRows.length} shifts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeStaff.length}</div>
              <p className="text-sm text-muted-foreground">All schedulable users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatHours(weekHours)}</div>
              <p className="text-sm text-muted-foreground">Current week (assigned only)</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button asChild className="justify-start bg-[#1e3a8a] hover:bg-[#172b6d]">
              <Link href="#create-shift">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Create Shift
              </Link>
            </Button>
            <Button className="justify-start" variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="#requests">
                <CheckSquare className="mr-2 h-4 w-4" />
                Review Requests
              </Link>
            </Button>
            <Button className="justify-start" variant="outline">
              <CalendarDays className="mr-2 h-4 w-4" />
              Publish Schedule
            </Button>
          </CardContent>
        </Card>

        <Card id="create-shift">
          <CardHeader>
            <CardTitle className="text-lg">Create Shift</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formStatus === 'shift-created' ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Shift created successfully.
              </div>
            ) : null}
            {formError === 'missing-fields' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Title, date, start time, and end time are required.
              </div>
            ) : null}
            {formError === 'invalid-time' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                End time must be after start time.
              </div>
            ) : null}
            {formError === 'after-hours' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Store closes at 8:00 PM. Shifts must end by 8:00 PM.
              </div>
            ) : null}
            <form action={createShiftAction} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="space-y-2 xl:col-span-1">
                <label htmlFor="title" className="text-sm font-medium">Shift Title</label>
                <Input id="title" name="title" placeholder="Evening Front Desk" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">Location</label>
                <Input id="location" name="location" placeholder="Main Store" />
              </div>
              <div className="space-y-2">
                <label htmlFor="assignedUserId" className="text-sm font-medium">Assign To (Optional)</label>
                <select
                  id="assignedUserId"
                  name="assignedUserId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">Unassigned</option>
                  {staffRows.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="shiftDate" className="text-sm font-medium">Date</label>
                <Input id="shiftDate" name="shiftDate" type="date" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="startTime" className="text-sm font-medium">Start Time</label>
                <Input id="startTime" name="startTime" type="time" max="19:59" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="endTime" className="text-sm font-medium">End Time</label>
                <Input id="endTime" name="endTime" type="time" max="20:00" required />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Shift notes, special tasks, opening/closing checklist..."
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">Status</label>
                <select
                  id="status"
                  name="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="published"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="md:col-span-2 xl:col-span-3 flex justify-end">
                <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">
                  Save Shift
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingShiftRows.length === 0 ? (
                <div className="h-40 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-500">
                  No upcoming shifts yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingShiftRows.map((shift) => {
                    const assignedCount = assignedCountByShift.get(shift.id) ?? 0
                    const isOpen = assignedCount === 0 && shift.status !== 'cancelled'
                    return (
                      <div key={shift.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{shift.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {dateLabel.format(shift.startTime)} • {timeLabel.format(shift.startTime)} - {timeLabel.format(shift.endTime)}
                              {shift.location ? ` • ${shift.location}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', shiftStatusPill(shift.status))}>
                              {shift.status ?? 'unknown'}
                            </span>
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              isOpen ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
                            )}>
                              {isOpen ? 'Open' : `${assignedCount} assigned`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coverage Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...coverageByDay.values()].length === 0 ? (
                <p className="text-sm text-muted-foreground">No active shifts in this range.</p>
              ) : (
                [...coverageByDay.values()].map((day) => (
                  <div key={day.label} className="rounded-lg border p-3 bg-white">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{day.label}</span>
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full', day.open > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>
                        {day.open > 0 ? `${day.open} open` : 'Fully staffed'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{day.total} shifts scheduled</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div id="requests" className="space-y-4">
          {formStatus === 'timeoff-approved' ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Time-off request approved.
            </div>
          ) : null}
          {formStatus === 'timeoff-denied' ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Time-off request denied.
            </div>
          ) : null}
          {formStatus === 'swap-approved' ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Shift swap approved and assignment updated.
            </div>
          ) : null}
          {formStatus === 'swap-denied' ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Shift swap denied.
            </div>
          ) : null}
          {formError === 'invalid-review' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Invalid review action submitted.
            </div>
          ) : null}
          {formError === 'request-not-found' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              That time-off request is no longer pending.
            </div>
          ) : null}
          {formError === 'swap-not-found' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              That swap request is no longer pending.
            </div>
          ) : null}
          {formError === 'assignment-not-found' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              The original assignment for this swap no longer exists.
            </div>
          ) : null}
          {formError === 'swap-conflict' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Requested staff is already assigned to that shift.
            </div>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Time-Off Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingTimeOffRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending time-off requests.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingTimeOffRows.map((request) => (
                      <div key={request.id} className="rounded-lg border p-3 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{request.userName ?? 'Unknown user'}</p>
                            <p className="text-sm text-muted-foreground">
                              {dateLabel.format(request.startDate)} - {dateLabel.format(request.endDate)}
                            </p>
                            {request.reason ? <p className="text-sm mt-1">{request.reason}</p> : null}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {request.createdAt ? dateTimeLabel.format(request.createdAt) : 'recent'}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <form action={reviewTimeOffAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="decision" value="approve" />
                            <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                              Approve
                            </Button>
                          </form>
                          <form action={reviewTimeOffAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="decision" value="deny" />
                            <Button size="sm" type="submit" variant="outline">
                              Deny
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Shift Swaps</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingSwapRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending swap requests.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingSwapRows.map((swap) => {
                      const assignment = swapAssignmentMap.get(swap.assignmentId)
                      const shift = assignment ? shiftMap.get(assignment.shiftId) : undefined
                      const fromUserName = assignment ? userNameMap.get(assignment.userId) : undefined
                      const toUserName = userNameMap.get(swap.requestedUserId)

                      return (
                        <div key={swap.id} className="rounded-lg border p-3 bg-white">
                          <p className="font-medium">{shift?.title ?? 'Unknown shift'}</p>
                          <p className="text-sm text-muted-foreground">
                            {shift?.startTime ? `${dateLabel.format(shift.startTime)} • ${timeLabel.format(shift.startTime)} - ${timeLabel.format(shift.endTime)}` : 'Shift details unavailable'}
                          </p>
                          <p className="text-sm mt-1">
                            {fromUserName ?? 'Unassigned'} to {toUserName ?? 'Unknown employee'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested {swap.createdAt ? dateTimeLabel.format(swap.createdAt) : 'recently'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <form action={reviewSwapAction}>
                              <input type="hidden" name="swapId" value={swap.id} />
                              <input type="hidden" name="decision" value="approve" />
                              <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                                Approve
                              </Button>
                            </form>
                            <form action={reviewSwapAction}>
                              <input type="hidden" name="swapId" value={swap.id} />
                              <input type="hidden" name="decision" value="deny" />
                              <Button size="sm" type="submit" variant="outline">
                                Deny
                              </Button>
                            </form>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Staff Directory</CardTitle>
          </CardHeader>
          <CardContent>
            {staffRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff records found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {staffRows.map((staff) => (
                  <div key={staff.id} className="rounded-lg border p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{staff.name}</p>
                        <p className="text-sm text-muted-foreground">{staff.email}</p>
                      </div>
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', rolePill(staff.role))}>
                        {staff.role}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{staff.phone ?? 'No phone on file'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
