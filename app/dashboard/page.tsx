import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, count, desc, eq, gte, inArray, isNull, lt, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assignments, notifications, shiftSwapRequests, shifts, timeOffRequests, users } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import SignOutButton from '@/components/SignOutButton'
import BrowserAlertToggle from '@/components/BrowserAlertToggle'
import { DatePickerField } from '@/components/ui/date-time-picker'
import { Brandmark } from '@/components/ui/Brandmark'
import { TicketCard, TicketRow, Stamp } from '@/components/ui/TicketCard'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import { notifyRoles, notifyUsers } from '@/lib/notifications'
import ScheduleGridWithModal from '@/components/ScheduleGridWithModal'
import { DEFAULT_SHIFT_LOCATION, DEFAULT_SHIFT_TITLE } from '@/lib/scheduling'
import { BUSINESS_TZ, parseChicagoWalltime } from '@/lib/time'

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: BUSINESS_TZ })
const monthDayLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: BUSINESS_TZ })
const shortDateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: BUSINESS_TZ })
const shortTimeLabel = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: BUSINESS_TZ })
const dateTimeLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: BUSINESS_TZ })
const CLOSING_TIME_MINUTES = 20 * 60 // 8:00 PM

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

function formatShiftDateTime(start: Date, end: Date) {
  return `${dateTimeLabel.format(start)} - ${shortTimeLabel.format(end)}`
}

async function requireAuthenticatedSession() {
  const session = await auth()
  if (!session?.user || !session.user.id || session.user.role === 'inactive') {
    redirect('/auth/login')
  }
  return session
}

function parseISODateOnly(value: string) {
  return parseChicagoWalltime(value, '00:00')
}

function parseLocalDateTime(dateValue: string, timeValue: string) {
  return parseChicagoWalltime(dateValue, timeValue)
}

function parseTimeToMinutes(timeValue: string) {
  const [hourRaw, minuteRaw] = timeValue.split(':')
  const hours = Number(hourRaw)
  const minutes = Number(minuteRaw)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return (hours * 60) + minutes
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

  const requestedDateRange = `${shortDateLabel.format(startDate)} to ${shortDateLabel.format(endDate)}`
  await notifyRoles({
    roles: ['manager', 'admin'],
    title: `Time-off request from ${session.user.name}`,
    body: `${session.user.name} requested ${requestedDateRange}${reason ? ` (${reason})` : ''}.`,
    link: '/admin#requests',
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
    shiftTitle: shifts.title,
    shiftStatus: shifts.status,
    shiftStart: shifts.startTime,
    shiftEnd: shifts.endTime,
  })
    .from(assignments)
    .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
    .where(eq(assignments.id, assignmentId))
    .limit(1)

  if (
    !assignmentRow ||
    assignmentRow.assignmentUserId !== session.user.id ||
    assignmentRow.assignmentStatus !== 'assigned' ||
    (assignmentRow.shiftStatus !== 'published' && assignmentRow.shiftStatus !== null) ||
    assignmentRow.shiftStart < new Date()
  ) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'invalid-swap-request', hash: 'swap-shift' }))
  }

  const [targetUser] = await db.select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.id, requestedUserId), ne(users.role, 'inactive')))
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

  const shiftSummary = `${assignmentRow.shiftTitle} (${formatShiftDateTime(assignmentRow.shiftStart, assignmentRow.shiftEnd)})`
  await notifyUsers([
    {
      userId: requestedUserId,
      title: 'New swap request',
      body: `${session.user.name} requested to swap: ${shiftSummary}.`,
      link: '/dashboard#swap-shift',
    },
  ])

  await notifyRoles({
    roles: ['manager', 'admin'],
    title: `Swap request from ${session.user.name}`,
    body: `${session.user.name} requested a swap with ${targetUser.name} for ${shiftSummary}.`,
    link: '/admin#requests',
  })

  redirect(buildDashboardReturnUrl(returnView, returnDate, { status: 'swap-submitted', hash: 'swap-shift' }))
}

async function createShiftFromCalendarAction(formData: FormData) {
  'use server'

  const session = await requireAuthenticatedSession()
  const { returnView, returnDate } = getReturnContext(formData)

  if (session.user.role !== 'manager' && session.user.role !== 'admin') {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-not-authorized', hash: 'schedule' }))
  }

  const title = DEFAULT_SHIFT_TITLE
  const location = DEFAULT_SHIFT_LOCATION
  const notes = String(formData.get('notes') ?? '').trim()
  const shiftDate = String(formData.get('shiftDate') ?? '')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const assignedUserId = String(formData.get('assignedUserId') ?? '')
  const requestedStatus = String(formData.get('status') ?? 'published')
  const status = requestedStatus === 'draft' ? 'draft' : 'published'

  if (!shiftDate || !startTime || !endTime) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-missing-fields', hash: 'schedule' }))
  }

  const startDateTime = parseLocalDateTime(shiftDate, startTime)
  const endDateTime = parseLocalDateTime(shiftDate, endTime)
  if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-invalid-time', hash: 'schedule' }))
  }
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  if (startMinutes === null || endMinutes === null || startMinutes >= CLOSING_TIME_MINUTES || endMinutes > CLOSING_TIME_MINUTES) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-after-hours', hash: 'schedule' }))
  }

  const [newShift] = await db.insert(shifts).values({
    title,
    location,
    notes: notes || null,
    startTime: startDateTime,
    endTime: endDateTime,
    status,
    createdBy: session.user.id,
  }).returning({ id: shifts.id })

  let assignmentCreatedForUserId: string | null = null
  if (assignedUserId) {
    const [matchingUser] = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assignedUserId), ne(users.role, 'inactive')))
      .limit(1)

    if (!matchingUser) {
      redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-invalid-assignee', hash: 'schedule' }))
    }

    await db.insert(assignments).values({
      shiftId: newShift.id,
      userId: assignedUserId,
      status: 'assigned',
    })
    assignmentCreatedForUserId = assignedUserId
  }

  if (assignmentCreatedForUserId && status !== 'draft') {
    await notifyUsers([
      {
        userId: assignmentCreatedForUserId,
        title: 'New shift assigned',
        body: `${title} on ${formatShiftDateTime(startDateTime, endDateTime)}.`,
        link: '/dashboard',
      },
    ])
  }

  redirect(buildDashboardReturnUrl(returnView, returnDate, { status: 'calendar-shift-created', hash: 'schedule' }))
}

async function assignShiftFromCalendarAction(formData: FormData) {
  'use server'

  const session = await requireAuthenticatedSession()
  const { returnView, returnDate } = getReturnContext(formData)

  if (session.user.role !== 'manager' && session.user.role !== 'admin') {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-not-authorized', hash: 'schedule' }))
  }

  const shiftId = String(formData.get('shiftId') ?? '')
  const assignedUserId = String(formData.get('assignedUserId') ?? '')

  if (!shiftId) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-missing-fields', hash: 'schedule' }))
  }

  const [shiftRow] = await db.select({
    id: shifts.id,
    title: shifts.title,
    startTime: shifts.startTime,
    endTime: shifts.endTime,
    status: shifts.status,
  }).from(shifts).where(eq(shifts.id, shiftId)).limit(1)

  if (!shiftRow) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-invalid-shift', hash: 'schedule' }))
  }

  const existingAssignedRows = await db.select({
    id: assignments.id,
    userId: assignments.userId,
  })
    .from(assignments)
    .where(and(eq(assignments.shiftId, shiftId), eq(assignments.status, 'assigned')))
  const previousAssignedUserIds = [...new Set(existingAssignedRows.map((row) => row.userId))]

  if (assignedUserId) {
    const [matchingUser] = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assignedUserId), ne(users.role, 'inactive')))
      .limit(1)
    if (!matchingUser) {
      redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-invalid-assignee', hash: 'schedule' }))
    }

    const alreadyAssigned = existingAssignedRows.find((row) => row.userId === assignedUserId)
    if (alreadyAssigned) {
      const idsToRemove = existingAssignedRows
        .filter((row) => row.id !== alreadyAssigned.id)
        .map((row) => row.id)
      if (idsToRemove.length > 0) {
        await db.delete(assignments).where(inArray(assignments.id, idsToRemove))
      }
    } else if (existingAssignedRows.length > 0) {
      const [primary, ...rest] = existingAssignedRows
      await db.update(assignments).set({
        userId: assignedUserId,
        status: 'assigned',
      }).where(eq(assignments.id, primary.id))
      if (rest.length > 0) {
        await db.delete(assignments).where(inArray(assignments.id, rest.map((row) => row.id)))
      }
    } else {
      await db.insert(assignments).values({
        shiftId,
        userId: assignedUserId,
        status: 'assigned',
      })
    }
  } else if (existingAssignedRows.length > 0) {
    await db.delete(assignments).where(inArray(assignments.id, existingAssignedRows.map((row) => row.id)))
  }

  const currentAssignedRows = await db.select({ userId: assignments.userId })
    .from(assignments)
    .where(and(eq(assignments.shiftId, shiftId), eq(assignments.status, 'assigned')))
  const currentAssignedUserIds = [...new Set(currentAssignedRows.map((row) => row.userId))]

  if (shiftRow.status !== 'draft' && assignedUserId && !previousAssignedUserIds.includes(assignedUserId)) {
    await notifyUsers([{
      userId: assignedUserId,
      title: 'New shift assigned',
      body: `${shiftRow.title} on ${formatShiftDateTime(shiftRow.startTime, shiftRow.endTime)}.`,
      link: '/dashboard',
    }])
  }

  const removedUserIds = previousAssignedUserIds.filter((userId) => !currentAssignedUserIds.includes(userId))
  if (removedUserIds.length > 0) {
    await notifyUsers(removedUserIds.map((userId) => ({
      userId,
      title: 'Shift unassigned',
      body: `You were removed from ${shiftRow.title} on ${formatShiftDateTime(shiftRow.startTime, shiftRow.endTime)}.`,
      link: '/dashboard',
    })))
  }

  redirect(buildDashboardReturnUrl(returnView, returnDate, {
    status: assignedUserId ? 'calendar-shift-assigned' : 'calendar-shift-unassigned',
    hash: 'schedule',
  }))
}

async function cancelShiftFromCalendarAction(formData: FormData) {
  'use server'

  const session = await requireAuthenticatedSession()
  const { returnView, returnDate } = getReturnContext(formData)

  if (session.user.role !== 'manager' && session.user.role !== 'admin') {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-not-authorized', hash: 'schedule' }))
  }

  const shiftId = String(formData.get('shiftId') ?? '')
  const mode = String(formData.get('mode') ?? 'cancel')
  if (!shiftId || (mode !== 'cancel' && mode !== 'restore')) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-invalid-shift', hash: 'schedule' }))
  }

  const [shiftRow] = await db.select({
    id: shifts.id,
    title: shifts.title,
    startTime: shifts.startTime,
    endTime: shifts.endTime,
  }).from(shifts).where(eq(shifts.id, shiftId)).limit(1)

  if (!shiftRow) {
    redirect(buildDashboardReturnUrl(returnView, returnDate, { error: 'calendar-invalid-shift', hash: 'schedule' }))
  }

  const assignedRows = await db.select({ userId: assignments.userId })
    .from(assignments)
    .where(and(eq(assignments.shiftId, shiftId), eq(assignments.status, 'assigned')))

  const status = mode === 'cancel' ? 'cancelled' : 'published'
  await db.update(shifts).set({
    status,
    updatedAt: new Date(),
  }).where(eq(shifts.id, shiftId))

  if (assignedRows.length > 0) {
    await notifyUsers(assignedRows.map((row) => ({
      userId: row.userId,
      title: mode === 'cancel' ? 'Shift cancelled' : 'Shift restored',
      body: `${shiftRow.title} (${formatShiftDateTime(shiftRow.startTime, shiftRow.endTime)}) has been ${mode === 'cancel' ? 'cancelled' : 'restored'}.`,
      link: '/dashboard',
    })))
  }

  redirect(buildDashboardReturnUrl(returnView, returnDate, {
    status: mode === 'cancel' ? 'calendar-shift-cancelled' : 'calendar-shift-restored',
    hash: 'schedule',
  }))
}

async function dismissNotificationAction(formData: FormData) {
  'use server'

  const session = await requireAuthenticatedSession()
  const notificationId = String(formData.get('notificationId') ?? '')
  const { returnView, returnDate } = getReturnContext(formData)

  if (notificationId) {
    await db.delete(notifications).where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, session.user.id)),
    )
  }
  redirect(buildDashboardReturnUrl(returnView, returnDate, { hash: 'notifications' }))
}

async function dismissAllNotificationsAction(formData: FormData) {
  'use server'

  const session = await requireAuthenticatedSession()
  const { returnView, returnDate } = getReturnContext(formData)

  await db.delete(notifications).where(eq(notifications.userId, session.user.id))
  redirect(buildDashboardReturnUrl(returnView, returnDate, { hash: 'notifications' }))
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireAuthenticatedSession()

  const { name, role } = session.user
  const canManageStaff = role === 'manager' || role === 'admin'
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

  const [
    scheduledShiftRows,
    upcomingShiftRows,
    thisWeekShiftRows,
    swapEligibleRows,
    coworkerRows,
    teamRows,
    notificationRows,
    unreadNotificationsCountRow,
    schedulableStaffRows,
  ] = await Promise.all([
    db.select({
      shiftId: shifts.id,
      title: shifts.title,
      location: shifts.location,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      assigneeUserId: assignments.userId,
      assigneeName: users.name,
    })
      .from(shifts)
      .leftJoin(assignments, and(eq(assignments.shiftId, shifts.id), eq(assignments.status, 'assigned')))
      .leftJoin(users, eq(assignments.userId, users.id))
      .where(and(
        gte(shifts.startTime, scheduleRangeStart),
        lt(shifts.startTime, scheduleRangeEnd),
        or(isNull(shifts.status), eq(shifts.status, 'published')),
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
        or(isNull(shifts.status), eq(shifts.status, 'published')),
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
        or(isNull(shifts.status), eq(shifts.status, 'published')),
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
        or(isNull(shifts.status), eq(shifts.status, 'published')),
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
    db.select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(12),
    db.select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)))
      .then((rows) => rows[0]),
    canManageStaff
      ? db.select({
          id: users.id,
          name: users.name,
          role: users.role,
        })
          .from(users)
          .where(ne(users.role, 'inactive'))
          .orderBy(users.name)
      : Promise.resolve([]),
  ])

  type ShiftWithAssignees = {
    shiftId: string
    title: string
    location: string | null
    startTime: Date
    endTime: Date
    assignees: Array<{ userId: string; name: string }>
  }
  const shiftsById = new Map<string, ShiftWithAssignees>()
  for (const row of scheduledShiftRows) {
    let shift = shiftsById.get(row.shiftId)
    if (!shift) {
      shift = {
        shiftId: row.shiftId,
        title: row.title,
        location: row.location,
        startTime: row.startTime,
        endTime: row.endTime,
        assignees: [],
      }
      shiftsById.set(row.shiftId, shift)
    }
    if (row.assigneeUserId && row.assigneeName) {
      shift.assignees.push({ userId: row.assigneeUserId, name: row.assigneeName })
    }
  }

  const shiftsByDay = new Map<string, ShiftWithAssignees[]>()
  for (const shift of shiftsById.values()) {
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
  const unreadNotificationsCount = unreadNotificationsCountRow?.value ?? 0
  const formStatus = getQueryValue(searchParams?.status)
  const formError = getQueryValue(searchParams?.error)
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ''
  const maxDayShiftsVisible = selectedView === 'month' ? 2 : 4
  const firstName = (full: string) => full.split(' ')[0] || full
  const dayEntries = visibleDays.map((day) => {
    const key = dateKey(day)
    const dayShifts = shiftsByDay.get(key) ?? []
    const compactShifts = dayShifts.map((shift) => {
      const names = shift.assignees.map((a) => firstName(a.name))
      const isMine = shift.assignees.some((a) => a.userId === session.user.id)
      const isOpen = shift.assignees.length === 0
      const assigneeLabel = isOpen
        ? 'Open'
        : names.length === 1
          ? names[0]
          : `${names[0]} +${names.length - 1}`
      return {
        shiftId: shift.shiftId,
        title: shift.title,
        location: shift.location ?? '',
        startLabel: shortTimeLabel.format(shift.startTime),
        endLabel: shortTimeLabel.format(shift.endTime),
        dateTimeLabel: formatShiftDateTime(shift.startTime, shift.endTime),
        assigneeLabel,
        assignedUserId: shift.assignees[0]?.userId ?? null,
        isMine,
        isOpen,
      }
    })
    return {
      key,
      dateIso: formatDateParam(day),
      dayNumber: day.getDate(),
      isToday: key === todayKey,
      isCurrentMonth: day.getMonth() === monthStart.getMonth() && day.getFullYear() === monthStart.getFullYear(),
      shiftCount: compactShifts.length,
      visibleShifts: compactShifts.slice(0, maxDayShiftsVisible),
      hiddenShiftCount: Math.max(0, compactShifts.length - maxDayShiftsVisible),
      shifts: compactShifts,
      dateLabel: shortDateLabel.format(day),
    }
  })

  const prevAnchor = selectedView === 'month'
    ? new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
    : addDays(anchorDate, -7)
  const nextAnchor = selectedView === 'month'
    ? new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    : addDays(anchorDate, 7)
  const viewTitle = selectedView === 'month'
    ? monthLabel.format(monthStart)
    : `${monthDayLabel.format(selectedWeekStart)} - ${monthDayLabel.format(addDays(selectedWeekEnd, -1))}`

  const nextShift = upcomingShiftRows[0]
  const nextShiftDateParts = nextShift
    ? {
        weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: BUSINESS_TZ }).format(nextShift.startTime),
        month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: BUSINESS_TZ }).format(nextShift.startTime).toUpperCase(),
        day: nextShift.startTime.getDate(),
        year: nextShift.startTime.getFullYear(),
        startLabel: shortTimeLabel.format(nextShift.startTime),
        endLabel: shortTimeLabel.format(nextShift.endTime),
        ticketNo: String(nextShift.shiftId).slice(0, 6).toUpperCase(),
      }
    : null
  const todayLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: BUSINESS_TZ }).format(now)

  return (
    <div className="relative min-h-screen">
      <header className="relative border-b border-ink/15 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Brandmark variant="wordmark-leaguecity" size="md" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Stamp tone="muted">{role}</Stamp>
            {canManageStaff ? (
              <Button asChild size="sm">
                <Link href="/admin#requests">Admin office →</Link>
              </Button>
            ) : null}
            {role !== 'admin' ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/account/password">Change password</Link>
              </Button>
            ) : null}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-10 animate-reveal-up">
          <div className="flex items-center justify-between border-b border-ink/20 pb-2">
            <span className="stamp text-ink/70">{todayLong.toUpperCase()}</span>
            <span className="stamp text-ink/50">Ticket No. {String(session.user.id).slice(0, 6).toUpperCase()}</span>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-2">
              <h1 className="font-serif text-5xl leading-[0.95] tracking-tight text-ink md:text-6xl lg:text-7xl">
                Hello, <span className="italic">{(name ?? 'friend').split(' ')[0]}</span>.
              </h1>
              <p className="max-w-md text-sm text-ink-muted">
                {nextShift
                  ? 'Your next ticket is stamped below. Take it easy until the wash cycle starts.'
                  : 'No shifts on the books right now. Enjoy the dry spell — your manager will post more soon.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl tabular text-ink">{upcomingShiftCount}</span>
                  <span className="stamp text-ink/50">shifts · next 7 days</span>
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl tabular text-ink">{formatHours(thisWeekHours)}</span>
                  <span className="stamp text-ink/50">hrs this week</span>
                </span>
                {unreadNotificationsCount > 0 ? (
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl tabular text-cherry">{unreadNotificationsCount}</span>
                    <span className="stamp text-ink/50">unread notes</span>
                  </span>
                ) : null}
              </div>
            </div>

            {nextShiftDateParts ? (
              <TicketCard tone="bleach" className="relative overflow-hidden p-0 animate-stamp-in">
                <div className="flex items-stretch">
                  <div className="flex w-24 flex-col items-center justify-center border-r border-dashed border-ink/25 bg-paper/60 py-5">
                    <span className="stamp text-ink/60">{nextShiftDateParts.month}</span>
                    <span className="font-serif text-5xl leading-none text-ink">{nextShiftDateParts.day}</span>
                    <span className="stamp mt-1 text-ink/50">{nextShiftDateParts.year}</span>
                  </div>
                  <div className="flex-1 px-5 py-5">
                    <div className="flex items-center justify-between">
                      <span className="stamp text-ink/60">Your next shift</span>
                      <Stamp tone="sage">Assigned</Stamp>
                    </div>
                    <p className="mt-2 font-serif text-xl text-ink">{nextShiftDateParts.weekday}</p>
                    <p className="mt-1 font-mono text-2xl tabular text-ink">
                      {nextShiftDateParts.startLabel} – {nextShiftDateParts.endLabel}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{nextShift.location ?? 'Main store'}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href="#swap-shift">Request swap</Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href="#request-time-off">Request time off</Link>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-ink/25 bg-paper/60 px-5 py-2">
                  <span className="stamp text-ink/50">No. {nextShiftDateParts.ticketNo}</span>
                  <span className="stamp text-ink/50">Laundry Co. · Main Store</span>
                </div>
              </TicketCard>
            ) : (
              <TicketCard tone="bleach" className="flex items-center justify-center p-8 text-center">
                <div>
                  <Stamp tone="muted">All quiet</Stamp>
                  <p className="mt-3 font-serif text-2xl text-ink">No shifts booked.</p>
                  <p className="mt-1 text-xs text-ink-muted">Check back soon, or ask your manager.</p>
                </div>
              </TicketCard>
            )}
          </div>
        </section>

        <section id="schedule" className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="stamp text-ink/60">Your schedule</span>
              <p className="mt-1 font-serif text-2xl text-ink">{viewTitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-sm border border-ink/25">
                <Link
                  href={buildDashboardLink('week', anchorDate)}
                  className={cn(
                    'stamp px-3 py-2 transition-colors',
                    selectedView === 'week' ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-ink/5',
                  )}
                >
                  Week
                </Link>
                <Link
                  href={buildDashboardLink('month', anchorDate)}
                  className={cn(
                    'stamp px-3 py-2 border-l border-ink/25 transition-colors',
                    selectedView === 'month' ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-ink/5',
                  )}
                >
                  Month
                </Link>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={buildDashboardLink(selectedView, prevAnchor)}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={buildDashboardLink('week', now)}>Today</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={buildDashboardLink(selectedView, nextAnchor)}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {formStatus === 'calendar-shift-created' ? (
            <div className="mb-3 rounded-sm border border-sage/40 bg-sage-soft px-3 py-2 text-xs text-sage">
              Shift added from calendar.
            </div>
          ) : null}
          {formStatus === 'calendar-shift-assigned' ? (
            <div className="mb-3 rounded-sm border border-sage/40 bg-sage-soft px-3 py-2 text-xs text-sage">
              Shift assigned.
            </div>
          ) : null}
          {formStatus === 'calendar-shift-unassigned' ? (
            <div className="mb-3 rounded-sm border border-sage/40 bg-sage-soft px-3 py-2 text-xs text-sage">
              Shift unassigned.
            </div>
          ) : null}
          {formError && formError.startsWith('calendar-') ? (
            <div className="mb-3 rounded-sm border border-cherry/40 bg-cherry-soft px-3 py-2 text-xs text-cherry">
              {formError === 'calendar-missing-fields' && 'Date, start time, and end time are required.'}
              {formError === 'calendar-invalid-time' && 'Shift end time must be after start time.'}
              {formError === 'calendar-after-hours' && 'Store closes at 8:00 PM. Shifts must end by 8:00 PM.'}
              {formError === 'calendar-invalid-assignee' && 'The selected assignee does not exist.'}
              {formError === 'calendar-invalid-shift' && 'That shift no longer exists.'}
            </div>
          ) : null}

          <TicketCard tone="bleach" className="p-4 md:p-6">
            <ScheduleGridWithModal
              selectedView={selectedView}
              weekdayLabels={weekdayLabels}
              dayEntries={dayEntries}
              canManageStaff={canManageStaff}
              staffOptions={schedulableStaffRows}
              returnView={selectedView}
              returnDate={formatDateParam(anchorDate)}
              createShiftAction={canManageStaff ? createShiftFromCalendarAction : undefined}
              assignShiftAction={canManageStaff ? assignShiftFromCalendarAction : undefined}
              cancelShiftAction={canManageStaff ? cancelShiftFromCalendarAction : undefined}
            />
          </TicketCard>
        </section>

        <section id="notifications" className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="stamp text-ink/60">Notices</span>
              <p className="mt-1 font-serif text-2xl text-ink">The bulletin board</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {notificationRows.length > 0 ? (
                <Stamp tone={unreadNotificationsCount > 0 ? 'cherry' : 'muted'}>
                  {notificationRows.length} pinned
                </Stamp>
              ) : (
                <Stamp tone="sage">Empty</Stamp>
              )}
              {notificationRows.length > 0 ? (
                <form action={dismissAllNotificationsAction}>
                  <input type="hidden" name="returnView" value={selectedView} />
                  <input type="hidden" name="returnDate" value={formatDateParam(anchorDate)} />
                  <ConfirmSubmitButton
                    type="submit"
                    size="sm"
                    variant="outline"
                    confirmMessage="Clear the whole bulletin board? Dismissed notifications can’t be brought back."
                  >
                    Clear board
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </div>
          </div>

          <TicketCard tone="bleach" className="p-4 md:p-5">
            <div className="mb-3 border-b border-dashed border-ink/15 pb-3">
              <BrowserAlertToggle vapidPublicKey={vapidPublicKey} />
            </div>

            {notificationRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No notices pinned up yet.</p>
            ) : (
              <ul className="divide-y divide-dashed divide-ink/15">
                {notificationRows.map((notification) => (
                  <li
                    key={notification.id}
                    className={cn(
                      'relative flex flex-col gap-2 py-3 pr-10 sm:flex-row sm:items-start sm:justify-between',
                      !notification.isRead && 'bg-cherry-soft/40 -mx-2 px-2 pr-10 rounded-sm',
                    )}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notification.isRead ? <Stamp tone="cherry">New</Stamp> : null}
                        <p className="text-sm font-semibold text-ink">{notification.title}</p>
                      </div>
                      <p className="text-sm text-ink-muted">{notification.body}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
                        {dateTimeLabel.format(notification.createdAt)}
                      </p>
                    </div>
                    {notification.link ? (
                      <div className="flex items-center">
                        <Button asChild size="sm" variant="outline">
                          <Link href={notification.link}>Open</Link>
                        </Button>
                      </div>
                    ) : null}
                    <form action={dismissNotificationAction} className="absolute right-1 top-2">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <input type="hidden" name="returnView" value={selectedView} />
                      <input type="hidden" name="returnDate" value={formatDateParam(anchorDate)} />
                      <button
                        type="submit"
                        aria-label="Dismiss notification"
                        title="Dismiss"
                        className="rounded-sm p-1.5 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </TicketCard>
        </section>

        <section className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div id="request-time-off">
            <div className="mb-3">
              <span className="stamp text-ink/60">Form A · Time off</span>
              <p className="mt-1 font-serif text-2xl text-ink">Day-off slip</p>
            </div>
            <TicketCard tone="bleach" className="p-5">
              {formStatus === 'timeoff-submitted' ? (
                <div className="mb-3 rounded-sm border border-sage/40 bg-sage-soft px-3 py-2 text-xs text-sage">
                  Submitted for manager review.
                </div>
              ) : null}
              {formError === 'invalid-timeoff-dates' ? (
                <div className="mb-3 rounded-sm border border-cherry/40 bg-cherry-soft px-3 py-2 text-xs text-cherry">
                  End date must be on or after start date.
                </div>
              ) : null}
              <form action={requestTimeOffAction} className="space-y-4">
                <input type="hidden" name="returnView" value={selectedView} />
                <input type="hidden" name="returnDate" value={formatDateParam(anchorDate)} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="startDate" className="stamp text-ink/60">From</label>
                    <DatePickerField id="startDate" name="startDate" defaultValue={formatDateParam(now)} required />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="endDate" className="stamp text-ink/60">Through</label>
                    <DatePickerField id="endDate" name="endDate" defaultValue={formatDateParam(now)} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="reason" className="stamp text-ink/60">Reason (optional)</label>
                  <textarea
                    id="reason"
                    name="reason"
                    rows={3}
                    className="flex w-full rounded-sm border border-ink/20 bg-paper/60 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                    placeholder="Vacation, appointment, personal day…"
                  />
                </div>
                <Button type="submit" className="w-full">Submit time-off slip</Button>
              </form>
            </TicketCard>
          </div>

          <div id="swap-shift">
            <div className="mb-3">
              <span className="stamp text-ink/60">Form B · Swap</span>
              <p className="mt-1 font-serif text-2xl text-ink">Trade ticket</p>
            </div>
            <TicketCard tone="bleach" className="p-5">
              {formStatus === 'swap-submitted' ? (
                <div className="mb-3 rounded-sm border border-sage/40 bg-sage-soft px-3 py-2 text-xs text-sage">
                  Swap submitted for manager approval.
                </div>
              ) : null}
              {formError === 'invalid-swap-request' ? (
                <div className="mb-3 rounded-sm border border-cherry/40 bg-cherry-soft px-3 py-2 text-xs text-cherry">
                  Choose a valid future shift and teammate.
                </div>
              ) : null}
              {formError === 'invalid-swap-target' ? (
                <div className="mb-3 rounded-sm border border-cherry/40 bg-cherry-soft px-3 py-2 text-xs text-cherry">
                  The requested teammate could not be found.
                </div>
              ) : null}
              {formError === 'swap-already-pending' ? (
                <div className="mb-3 rounded-sm border border-ochre/40 bg-ochre-soft px-3 py-2 text-xs text-ochre">
                  A pending swap request already exists for that shift.
                </div>
              ) : null}
              {formError === 'swap-target-assigned' ? (
                <div className="mb-3 rounded-sm border border-cherry/40 bg-cherry-soft px-3 py-2 text-xs text-cherry">
                  That teammate is already on the selected shift.
                </div>
              ) : null}

              {swapEligibleRows.length === 0 ? (
                <p className="text-sm text-ink-muted">No upcoming assigned shifts available to swap.</p>
              ) : coworkerRows.length === 0 ? (
                <p className="text-sm text-ink-muted">No teammates available to trade with.</p>
              ) : (
                <form action={requestSwapAction} className="space-y-4">
                  <input type="hidden" name="returnView" value={selectedView} />
                  <input type="hidden" name="returnDate" value={formatDateParam(anchorDate)} />
                  <div className="space-y-1">
                    <label htmlFor="assignmentId" className="stamp text-ink/60">Your shift</label>
                    <select
                      id="assignmentId"
                      name="assignmentId"
                      className="flex h-10 w-full rounded-sm border border-ink/20 bg-paper/60 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                      required
                    >
                      {swapEligibleRows.map((assignment) => (
                        <option key={assignment.assignmentId} value={assignment.assignmentId}>
                          {shortDateLabel.format(assignment.startTime)} · {shortTimeLabel.format(assignment.startTime)}–{shortTimeLabel.format(assignment.endTime)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="requestedUserId" className="stamp text-ink/60">Swap with</label>
                    <select
                      id="requestedUserId"
                      name="requestedUserId"
                      className="flex h-10 w-full rounded-sm border border-ink/20 bg-paper/60 px-3 py-2 text-sm focus:border-ink focus:outline-none"
                      required
                    >
                      {coworkerRows.map((coworker) => (
                        <option key={coworker.id} value={coworker.id}>
                          {coworker.name} ({coworker.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="w-full">Submit trade ticket</Button>
                </form>
              )}
            </TicketCard>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="stamp text-ink/60">Next seven days</span>
              <p className="mt-1 font-serif text-2xl text-ink">Your tear-off calendar</p>
            </div>
            <Stamp tone="muted">{upcomingShiftRows.length} ticket{upcomingShiftRows.length === 1 ? '' : 's'}</Stamp>
          </div>

          {upcomingShiftRows.length === 0 ? (
            <TicketCard tone="bleach" className="p-8 text-center">
              <Stamp tone="sage">All quiet</Stamp>
              <p className="mt-3 font-serif text-xl text-ink">No shifts this week.</p>
              <p className="mt-1 text-xs text-ink-muted">Enjoy the dry spell.</p>
            </TicketCard>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingShiftRows.map((shift) => {
                const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: BUSINESS_TZ }).format(shift.startTime).toUpperCase()
                const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: BUSINESS_TZ }).format(shift.startTime).toUpperCase()
                return (
                  <TicketCard key={shift.shiftId} tone="bleach" className="overflow-hidden p-0">
                    <div className="flex items-stretch">
                      <div className="flex w-20 flex-col items-center justify-center border-r border-dashed border-ink/25 bg-paper/60 py-3">
                        <span className="stamp text-ink/60">{month}</span>
                        <span className="font-serif text-3xl leading-none text-ink">{shift.startTime.getDate()}</span>
                        <span className="stamp mt-1 text-ink/50">{weekday}</span>
                      </div>
                      <div className="flex-1 px-4 py-3">
                        <p className="font-mono text-sm tabular text-ink">
                          {shortTimeLabel.format(shift.startTime)} – {shortTimeLabel.format(shift.endTime)}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">{shift.location ?? 'Main store'}</p>
                      </div>
                    </div>
                  </TicketCard>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
