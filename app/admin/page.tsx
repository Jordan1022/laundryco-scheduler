import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, count, desc, eq, gte, inArray, lt, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assignments, auditLog, shiftSwapRequests, shifts, timeOffRequests, users } from '@/lib/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePickerField, TimePickerField } from '@/components/ui/date-time-picker'
import TempPasswordField from '@/components/TempPasswordField'
import BulkRangeFields from '@/components/BulkRangeFields'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import AdminTabs, { resolveAdminTab } from '@/components/AdminTabs'
import AdminToast from '@/components/AdminToast'
import { Drawer } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { CalendarDays, CalendarPlus, CheckSquare, Pencil, Phone, Plus, UserPlus } from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import bcrypt from 'bcryptjs'
import { notifyUsers } from '@/lib/notifications'
import { DEFAULT_SHIFT_LOCATION, DEFAULT_SHIFT_TITLE } from '@/lib/scheduling'

const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const timeLabel = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const dateTimeLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const CLOSING_TIME_MINUTES = 20 * 60 // 8:00 PM
const ACTIVE_ROLES = ['employee', 'manager', 'admin'] as const
const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const
const MAX_BULK_RANGE_DAYS = 93

type ActiveRole = typeof ACTIVE_ROLES[number]

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

function formatShiftDateTime(start: Date, end: Date) {
  return `${dateTimeLabel.format(start)} - ${timeLabel.format(end)}`
}

function rolePill(role: string) {
  if (role === 'admin') return 'bg-violet-100 text-violet-800 dark:bg-violet-100 dark:text-violet-800'
  if (role === 'manager') return 'bg-blue-100 text-blue-800 dark:bg-blue-100 dark:text-blue-800'
  if (role === 'inactive') return 'bg-rose-100 text-rose-800 dark:bg-rose-100 dark:text-rose-800'
  return 'bg-muted text-muted-foreground'
}

function shiftStatusPill(status: string | null) {
  if (status === 'published') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-50 dark:text-emerald-800'
  if (status === 'draft') return 'bg-amber-100 text-amber-800 dark:bg-amber-50 dark:text-amber-800'
  return 'bg-muted text-muted-foreground'
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

function isValidActiveRole(role: string): role is ActiveRole {
  return ACTIVE_ROLES.includes(role as ActiveRole)
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

function parseDateOnly(value: string) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function plusDays(base: Date, days: number) {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date
}

function endDateFromPreset(startDate: Date, rangePreset: string, customEndDateRaw: string) {
  if (rangePreset === 'custom') {
    return parseDateOnly(customEndDateRaw)
  }
  if (rangePreset === 'month') {
    return plusDays(startDate, 29)
  }
  return plusDays(startDate, 6)
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
    location,
    notes: notes || null,
    startTime: startDateTime,
    endTime: endDateTime,
    status,
    createdBy: session.user.id,
  }).returning({ id: shifts.id })

  let assignmentCreatedForUserId: string | null = null
  if (assignedUserId) {
    const userExists = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assignedUserId), ne(users.role, 'inactive')))
      .limit(1)

    if (userExists.length > 0) {
      await db.insert(assignments).values({
        shiftId: newShift.id,
        userId: assignedUserId,
        status: 'assigned',
      })
      assignmentCreatedForUserId = assignedUserId
    }
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

  redirect('/admin?status=shift-created#create-shift')
}

async function createBulkScheduleAction(formData: FormData) {
  'use server'

  const session = await requireManagerSession()

  const title = DEFAULT_SHIFT_TITLE
  const location = DEFAULT_SHIFT_LOCATION
  const notes = String(formData.get('notes') ?? '').trim()
  const startDateRaw = String(formData.get('startDate') ?? '')
  const customEndDateRaw = String(formData.get('endDate') ?? '')
  const rangePreset = String(formData.get('rangePreset') ?? 'week')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const assignedUserId = String(formData.get('assignedUserId') ?? '')
  const requestedStatus = String(formData.get('status') ?? 'published')
  const status = requestedStatus === 'draft' ? 'draft' : 'published'

  if (!startDateRaw || !startTime || !endTime) {
    redirect('/admin?error=bulk-missing-fields#bulk-schedule')
  }

  const selectedDays = new Set<number>()
  for (const rawDay of formData.getAll('daysOfWeek')) {
    const day = Number(rawDay)
    if (Number.isInteger(day) && day >= 0 && day <= 6) {
      selectedDays.add(day)
    }
  }
  if (selectedDays.size === 0) {
    redirect('/admin?error=bulk-no-days-selected#bulk-schedule')
  }

  const startDate = parseDateOnly(startDateRaw)
  const endDate = startDate ? endDateFromPreset(startDate, rangePreset, customEndDateRaw) : null
  if (!startDate || !endDate || endDate < startDate) {
    redirect('/admin?error=bulk-invalid-range#bulk-schedule')
  }

  const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (dayCount > MAX_BULK_RANGE_DAYS) {
    redirect('/admin?error=bulk-range-too-large#bulk-schedule')
  }

  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    redirect('/admin?error=bulk-invalid-time#bulk-schedule')
  }
  if (startMinutes >= CLOSING_TIME_MINUTES || endMinutes > CLOSING_TIME_MINUTES) {
    redirect('/admin?error=bulk-after-hours#bulk-schedule')
  }

  if (assignedUserId) {
    const [assignedUser] = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assignedUserId), ne(users.role, 'inactive')))
      .limit(1)

    if (!assignedUser) {
      redirect('/admin?error=bulk-invalid-assignee#bulk-schedule')
    }
  }

  const shiftInputs: {
    title: string
    location: string | null
    notes: string | null
    startTime: Date
    endTime: Date
    status: 'draft' | 'published'
    createdBy: string
  }[] = []

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = plusDays(cursor, 1)) {
    if (!selectedDays.has(cursor.getDay())) continue

    const dateValue = formatDateInput(cursor)
    const shiftStart = parseLocalDateTime(dateValue, startTime)
    const shiftEnd = parseLocalDateTime(dateValue, endTime)
    if (!shiftStart || !shiftEnd || shiftEnd <= shiftStart) continue

    shiftInputs.push({
      title,
      location,
      notes: notes || null,
      startTime: shiftStart,
      endTime: shiftEnd,
      status,
      createdBy: session.user.id,
    })
  }

  if (shiftInputs.length === 0) {
    redirect('/admin?error=bulk-no-matching-days#bulk-schedule')
  }

  const insertedShifts = await db.transaction(async (tx) => {
    const created = await tx.insert(shifts).values(shiftInputs).returning({
      id: shifts.id,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })

    if (assignedUserId && created.length > 0) {
      await tx.insert(assignments).values(created.map((shift) => ({
        shiftId: shift.id,
        userId: assignedUserId,
        status: 'assigned',
      })))
    }

    return created
  })

  if (assignedUserId && status !== 'draft' && insertedShifts.length > 0) {
    const firstShift = insertedShifts[0]
    const lastShift = insertedShifts[insertedShifts.length - 1]
    await notifyUsers([{
      userId: assignedUserId,
      title: 'Recurring shifts assigned',
      body: `You were assigned to ${insertedShifts.length} shifts from ${formatShiftDateTime(firstShift.startTime, firstShift.endTime)} to ${formatShiftDateTime(lastShift.startTime, lastShift.endTime)}.`,
      link: '/dashboard',
    }])
  }

  redirect(`/admin?status=bulk-shifts-created&count=${insertedShifts.length}#bulk-schedule`)
}

async function updateShiftAction(formData: FormData) {
  'use server'

  await requireManagerSession()

  const shiftId = String(formData.get('shiftId') ?? '')
  const title = DEFAULT_SHIFT_TITLE
  const location = DEFAULT_SHIFT_LOCATION
  const notes = String(formData.get('notes') ?? '').trim()
  const shiftDate = String(formData.get('shiftDate') ?? '')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const assignedUserId = String(formData.get('assignedUserId') ?? '')
  const requestedStatus = String(formData.get('status') ?? 'published')
  const status = requestedStatus === 'draft' || requestedStatus === 'cancelled' ? requestedStatus : 'published'

  if (!shiftId || !shiftDate || !startTime || !endTime) {
    redirect('/admin?error=edit-missing-fields#upcoming-shifts')
  }

  const startDateTime = parseLocalDateTime(shiftDate, startTime)
  const endDateTime = parseLocalDateTime(shiftDate, endTime)
  if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
    redirect('/admin?error=edit-invalid-time#upcoming-shifts')
  }
  const startMinutes = parseTimeToMinutes(startTime)
  const endMinutes = parseTimeToMinutes(endTime)
  if (startMinutes === null || endMinutes === null || startMinutes >= CLOSING_TIME_MINUTES || endMinutes > CLOSING_TIME_MINUTES) {
    redirect('/admin?error=edit-after-hours#upcoming-shifts')
  }

  const updatedShift = await db.update(shifts).set({
    title,
    location,
    notes: notes || null,
    startTime: startDateTime,
    endTime: endDateTime,
    status,
    updatedAt: new Date(),
  })
    .where(eq(shifts.id, shiftId))
    .returning({ id: shifts.id })

  if (updatedShift.length === 0) {
    redirect('/admin?error=invalid-shift#upcoming-shifts')
  }

  const existingAssignedRows = await db.select({
    id: assignments.id,
    userId: assignments.userId,
  })
    .from(assignments)
    .where(and(eq(assignments.shiftId, shiftId), eq(assignments.status, 'assigned')))
  const previousAssignedUserIds = [...new Set(existingAssignedRows.map((row) => row.userId))]

  if (assignedUserId) {
    const matchingUser = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assignedUserId), ne(users.role, 'inactive')))
      .limit(1)

    if (matchingUser.length === 0) {
      redirect('/admin?error=invalid-assignee#upcoming-shifts')
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
      const [primaryAssignment, ...restAssignments] = existingAssignedRows
      await db.update(assignments).set({
        userId: assignedUserId,
        status: 'assigned',
      }).where(eq(assignments.id, primaryAssignment.id))

      if (restAssignments.length > 0) {
        await db.delete(assignments).where(inArray(assignments.id, restAssignments.map((row) => row.id)))
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

  if (currentAssignedUserIds.length > 0 && status !== 'draft') {
    await notifyUsers(currentAssignedUserIds.map((userId) => ({
      userId,
      title: status === 'cancelled' ? 'Shift cancelled' : 'Shift updated',
      body: `${title} is now ${status}. ${formatShiftDateTime(startDateTime, endDateTime)}.`,
      link: '/dashboard',
    })))
  }

  const removedUserIds = previousAssignedUserIds.filter((userId) => !currentAssignedUserIds.includes(userId))
  if (removedUserIds.length > 0) {
    await notifyUsers(removedUserIds.map((userId) => ({
      userId,
      title: 'Shift unassigned',
      body: `You were removed from ${title} on ${formatShiftDateTime(startDateTime, endDateTime)}.`,
      link: '/dashboard',
    })))
  }

  redirect('/admin?status=shift-updated#upcoming-shifts')
}

async function setShiftCancelledAction(formData: FormData) {
  'use server'

  await requireManagerSession()

  const shiftId = String(formData.get('shiftId') ?? '')
  const mode = String(formData.get('mode') ?? 'cancel')

  if (!shiftId || (mode !== 'cancel' && mode !== 'restore')) {
    redirect('/admin?error=invalid-shift#upcoming-shifts')
  }

  const [shiftRow] = await db.select({
    id: shifts.id,
    title: shifts.title,
    startTime: shifts.startTime,
    endTime: shifts.endTime,
  }).from(shifts).where(eq(shifts.id, shiftId)).limit(1)

  const assignedRows = await db.select({ userId: assignments.userId })
    .from(assignments)
    .where(and(eq(assignments.shiftId, shiftId), eq(assignments.status, 'assigned')))

  const status = mode === 'cancel' ? 'cancelled' : 'published'
  const updatedShift = await db.update(shifts).set({
    status,
    updatedAt: new Date(),
  })
    .where(eq(shifts.id, shiftId))
    .returning({ id: shifts.id })

  if (updatedShift.length === 0) {
    redirect('/admin?error=invalid-shift#upcoming-shifts')
  }

  if (shiftRow && assignedRows.length > 0) {
    await notifyUsers(assignedRows.map((row) => ({
      userId: row.userId,
      title: mode === 'cancel' ? 'Shift cancelled' : 'Shift restored',
      body: `${shiftRow.title} (${formatShiftDateTime(shiftRow.startTime, shiftRow.endTime)}) has been ${mode === 'cancel' ? 'cancelled' : 'restored'}.`,
      link: '/dashboard',
    })))
  }

  redirect(`/admin?status=${mode === 'cancel' ? 'shift-cancelled' : 'shift-restored'}#upcoming-shifts`)
}

async function publishScheduleAction() {
  'use server'

  await requireManagerSession()

  const now = new Date()
  const publishedRows = await db.update(shifts).set({
    status: 'published',
    updatedAt: new Date(),
  })
    .where(and(eq(shifts.status, 'draft'), gte(shifts.startTime, now)))
    .returning({
      id: shifts.id,
      title: shifts.title,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })

  if (publishedRows.length === 0) {
    redirect('/admin?status=schedule-no-drafts#create-shift')
  }

  const publishedShiftIds = publishedRows.map((row) => row.id)
  const assignmentsForPublishedRows = await db.select({
    shiftId: assignments.shiftId,
    userId: assignments.userId,
  })
    .from(assignments)
    .where(and(inArray(assignments.shiftId, publishedShiftIds), eq(assignments.status, 'assigned')))

  if (assignmentsForPublishedRows.length > 0) {
    const shiftById = new Map(publishedRows.map((row) => [row.id, row]))
    await notifyUsers(assignmentsForPublishedRows.flatMap((row) => {
      const shift = shiftById.get(row.shiftId)
      if (!shift) return []
      return [{
        userId: row.userId,
        title: 'Shift published',
        body: `${shift.title} was published for ${formatShiftDateTime(shift.startTime, shift.endTime)}.`,
        link: '/dashboard',
      }]
    }))
  }

  redirect('/admin?status=schedule-published#create-shift')
}

async function createStaffAction(formData: FormData) {
  'use server'

  await requireManagerSession()

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const phone = String(formData.get('phone') ?? '').trim()
  const role = String(formData.get('role') ?? 'employee')

  if (!name || !email || !password) {
    redirect('/admin?error=staff-missing-fields#staff-management')
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    redirect('/admin?error=staff-invalid-email#staff-management')
  }
  if (!isValidActiveRole(role)) {
    redirect('/admin?error=staff-invalid-role#staff-management')
  }
  if (password.length < 8) {
    redirect('/admin?error=staff-password-too-short#staff-management')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  let createdUserId = ''
  try {
    const [createdUser] = await db.insert(users).values({
      name,
      email,
      phone: phone || null,
      role,
      hashedPassword,
      passwordChangedAt: new Date(),
    }).returning({ id: users.id })
    createdUserId = createdUser.id
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      redirect('/admin?error=staff-email-exists#staff-management')
    }
    throw error
  }

  await notifyUsers([
    {
      userId: createdUserId,
      title: 'Your Laundry Co. Scheduler account is ready',
      body: `Sign in with email ${email}. Your manager will share your temporary password securely.`,
      link: '/auth/login',
    },
  ])

  redirect('/admin?status=staff-created#staff-management')
}

async function updateStaffProfileAction(formData: FormData) {
  'use server'

  await requireManagerSession()

  const userId = String(formData.get('userId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!userId || !name || !email) {
    redirect('/admin?error=staff-profile-missing-fields#staff-management')
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    redirect('/admin?error=staff-invalid-email#staff-management')
  }

  const [existingUser] = await db.select({
    id: users.id,
  }).from(users).where(eq(users.id, userId)).limit(1)

  if (!existingUser) {
    redirect('/admin?error=staff-not-found#staff-management')
  }

  try {
    await db.update(users).set({
      name,
      email,
      phone: phone || null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      redirect('/admin?error=staff-email-exists#staff-management')
    }
    throw error
  }

  redirect('/admin?status=staff-profile-updated#staff-management')
}

async function updateStaffRoleAction(formData: FormData) {
  'use server'

  await requireManagerSession()

  const userId = String(formData.get('userId') ?? '')
  const role = String(formData.get('role') ?? '')

  if (!userId || !isValidActiveRole(role)) {
    redirect('/admin?error=staff-invalid-role#staff-management')
  }

  const [existingUser] = await db.select({
    id: users.id,
    role: users.role,
  }).from(users).where(eq(users.id, userId)).limit(1)

  if (!existingUser) {
    redirect('/admin?error=staff-not-found#staff-management')
  }

  if (existingUser.role === 'admin' && role !== 'admin') {
    const [adminCountRow] = await db.select({ value: count() })
      .from(users)
      .where(eq(users.role, 'admin'))

    if ((adminCountRow?.value ?? 0) <= 1) {
      redirect('/admin?error=staff-last-admin#staff-management')
    }
  }

  await db.update(users).set({
    role,
    updatedAt: new Date(),
  }).where(eq(users.id, userId))

  redirect('/admin?status=staff-role-updated#staff-management')
}

async function setStaffStatusAction(formData: FormData) {
  'use server'

  await requireManagerSession()

  const userId = String(formData.get('userId') ?? '')
  const mode = String(formData.get('mode') ?? '')
  const reactivateRole = String(formData.get('reactivateRole') ?? 'employee')

  if (!userId || (mode !== 'deactivate' && mode !== 'reactivate')) {
    redirect('/admin?error=staff-not-found#staff-management')
  }

  const [existingUser] = await db.select({
    id: users.id,
    role: users.role,
  }).from(users).where(eq(users.id, userId)).limit(1)

  if (!existingUser) {
    redirect('/admin?error=staff-not-found#staff-management')
  }

  if (mode === 'deactivate') {
    if (existingUser.role === 'admin') {
      const [adminCountRow] = await db.select({ value: count() })
        .from(users)
        .where(eq(users.role, 'admin'))

      if ((adminCountRow?.value ?? 0) <= 1) {
        redirect('/admin?error=staff-last-admin#staff-management')
      }
    }

    await db.update(users).set({
      role: 'inactive',
      updatedAt: new Date(),
    }).where(eq(users.id, userId))

    redirect('/admin?status=staff-deactivated#staff-management')
  }

  if (!isValidActiveRole(reactivateRole)) {
    redirect('/admin?error=staff-invalid-role#staff-management')
  }

  await db.update(users).set({
    role: reactivateRole,
    updatedAt: new Date(),
  }).where(eq(users.id, userId))

  redirect('/admin?status=staff-reactivated#staff-management')
}

async function deleteStaffAction(formData: FormData) {
  'use server'

  const session = await requireManagerSession()
  const userId = String(formData.get('userId') ?? '')

  if (!userId) {
    redirect('/admin?error=staff-not-found#staff-management')
  }

  const [existingUser] = await db.select({
    id: users.id,
    role: users.role,
  }).from(users).where(eq(users.id, userId)).limit(1)

  if (!existingUser) {
    redirect('/admin?error=staff-not-found#staff-management')
  }

  if (existingUser.id === session.user.id) {
    redirect('/admin?error=staff-cannot-delete-self#staff-management')
  }

  if (existingUser.role === 'admin') {
    const [adminCountRow] = await db.select({ value: count() })
      .from(users)
      .where(eq(users.role, 'admin'))

    if ((adminCountRow?.value ?? 0) <= 1) {
      redirect('/admin?error=staff-last-admin#staff-management')
    }
  }

  if (existingUser.role !== 'inactive') {
    redirect('/admin?error=staff-delete-requires-inactive#staff-management')
  }

  await db.transaction(async (tx) => {
    const assignmentRows = await tx.select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.userId, userId))
    const assignmentIds = assignmentRows.map((row) => row.id)

    if (assignmentIds.length > 0) {
      await tx.delete(shiftSwapRequests).where(inArray(shiftSwapRequests.originalAssignmentId, assignmentIds))
    }

    await tx.delete(shiftSwapRequests).where(eq(shiftSwapRequests.requestedUserId, userId))

    await tx.update(timeOffRequests).set({
      reviewedBy: null,
    }).where(eq(timeOffRequests.reviewedBy, userId))

    await tx.delete(timeOffRequests).where(eq(timeOffRequests.userId, userId))

    await tx.update(shifts).set({
      createdBy: null,
      updatedAt: new Date(),
    }).where(eq(shifts.createdBy, userId))

    await tx.update(auditLog).set({
      userId: null,
    }).where(eq(auditLog.userId, userId))

    await tx.delete(users).where(eq(users.id, userId))
  })

  redirect('/admin?status=staff-deleted#staff-management')
}

async function resetStaffPasswordAction(formData: FormData) {
  'use server'

  await requireManagerSession()

  const userId = String(formData.get('userId') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!userId) {
    redirect('/admin?error=staff-not-found#staff-management')
  }
  if (password.length < 8) {
    redirect('/admin?error=staff-reset-password-too-short#staff-management')
  }

  const [existingUser] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!existingUser) {
    redirect('/admin?error=staff-not-found#staff-management')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await db.update(users).set({
    hashedPassword,
    passwordChangedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(users.id, userId))

  await notifyUsers([
    {
      userId,
      title: 'Your password was reset',
      body: 'Your manager has reset your password and will share your temporary password securely.',
      link: '/auth/login',
    },
  ])

  redirect('/admin?status=staff-password-reset#staff-management')
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
    .returning({
      id: timeOffRequests.id,
      userId: timeOffRequests.userId,
      startDate: timeOffRequests.startDate,
      endDate: timeOffRequests.endDate,
    })

  if (reviewed.length === 0) {
    redirect('/admin?error=request-not-found#requests')
  }

  const [{ userId, startDate, endDate }] = reviewed
  await notifyUsers([
    {
      userId,
      title: `Time-off ${nextStatus}`,
      body: `Your time-off request (${dateLabel.format(startDate)} to ${dateLabel.format(endDate)}) was ${nextStatus}.`,
      link: '/dashboard#request-time-off',
    },
  ])

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

  const [swapSummary] = await db.select({
    swapId: shiftSwapRequests.id,
    assignmentId: shiftSwapRequests.originalAssignmentId,
    requestedUserId: shiftSwapRequests.requestedUserId,
    originalUserId: assignments.userId,
    shiftTitle: shifts.title,
    shiftStart: shifts.startTime,
    shiftEnd: shifts.endTime,
  })
    .from(shiftSwapRequests)
    .innerJoin(assignments, eq(shiftSwapRequests.originalAssignmentId, assignments.id))
    .innerJoin(shifts, eq(assignments.shiftId, shifts.id))
    .where(eq(shiftSwapRequests.id, swapId))
    .limit(1)

  if (!swapSummary) {
    redirect('/admin?error=swap-not-found#requests')
  }

  if (decision === 'deny') {
    const denied = await db.update(shiftSwapRequests).set({ status: 'denied' })
      .where(and(eq(shiftSwapRequests.id, swapId), eq(shiftSwapRequests.status, 'pending')))
      .returning({ id: shiftSwapRequests.id })

    if (denied.length === 0) {
      redirect('/admin?error=swap-not-found#requests')
    }

    const usersToNotify = [...new Set([swapSummary.originalUserId, swapSummary.requestedUserId])]
    await notifyUsers(usersToNotify.map((userId) => ({
      userId,
      title: 'Swap request denied',
      body: `Swap request for ${swapSummary.shiftTitle} (${formatShiftDateTime(swapSummary.shiftStart, swapSummary.shiftEnd)}) was denied.`,
      link: '/dashboard#swap-shift',
    })))

    redirect('/admin?status=swap-denied#requests')
  }

  let swapApproveResult: 'approved' | 'swap-not-found' | 'assignment-not-found' | 'swap-conflict' | 'swap-target-inactive' = 'approved'

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

      const [requestedUser] = await tx.select({
        id: users.id,
      })
        .from(users)
        .where(and(eq(users.id, swap.requestedUserId), ne(users.role, 'inactive')))
        .limit(1)

      if (!requestedUser) throw new Error('swap-target-inactive')

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
      error.message === 'swap-conflict' ||
      error.message === 'swap-target-inactive'
    )) {
      swapApproveResult = error.message
    } else {
      throw error
    }
  }

  if (swapApproveResult !== 'approved') {
    redirect(`/admin?error=${swapApproveResult}#requests`)
  }

  await notifyUsers([
    {
      userId: swapSummary.originalUserId,
      title: 'Swap request approved',
      body: `Your swap for ${swapSummary.shiftTitle} (${formatShiftDateTime(swapSummary.shiftStart, swapSummary.shiftEnd)}) was approved.`,
      link: '/dashboard#swap-shift',
    },
    {
      userId: swapSummary.requestedUserId,
      title: 'You are now assigned to a swapped shift',
      body: `${swapSummary.shiftTitle} (${formatShiftDateTime(swapSummary.shiftStart, swapSummary.shiftEnd)}) was assigned to you.`,
      link: '/dashboard',
    },
  ])

  redirect('/admin?status=swap-approved#requests')
}

type AdminPageProps = {
  searchParams?: {
    status?: string | string[]
    error?: string | string[]
    count?: string | string[]
    openShiftId?: string | string[]
    openStaffId?: string | string[]
    tab?: string | string[]
    create?: string | string[]
  }
}

type ShiftRow = {
  id: string
  title: string
  location: string | null
  notes: string | null
  startTime: Date
  endTime: Date
  status: string | null
}

type StaffRow = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
}

function ShiftEditDrawer({
  shift,
  assignedUserId,
  staff,
  initialOpen,
}: {
  shift: ShiftRow
  assignedUserId: string
  staff: StaffRow[]
  initialOpen: boolean
}) {
  return (
    <Drawer
      title={`Edit shift — ${dateLabel.format(shift.startTime)}`}
      description={`${timeLabel.format(shift.startTime)} – ${timeLabel.format(shift.endTime)}`}
      initialOpen={initialOpen}
      trigger={
        <Button size="sm" variant="outline">
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
      }
    >
      <form action={updateShiftAction} className="space-y-4">
        <input type="hidden" name="shiftId" value={shift.id} />
        <div className="space-y-1.5">
          <label htmlFor={`shift-assignee-${shift.id}`} className="text-sm font-medium">Assign to</label>
          <select
            id={`shift-assignee-${shift.id}`}
            name="assignedUserId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue={assignedUserId}
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`shift-date-${shift.id}`} className="text-sm font-medium">Date</label>
          <DatePickerField
            id={`shift-date-${shift.id}`}
            name="shiftDate"
            defaultValue={formatDateInput(shift.startTime)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor={`shift-start-${shift.id}`} className="text-sm font-medium">Start</label>
            <TimePickerField
              id={`shift-start-${shift.id}`}
              name="startTime"
              max="19:59"
              defaultValue={formatTimeInput(shift.startTime)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`shift-end-${shift.id}`} className="text-sm font-medium">End</label>
            <TimePickerField
              id={`shift-end-${shift.id}`}
              name="endTime"
              max="20:00"
              defaultValue={formatTimeInput(shift.endTime)}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`shift-notes-${shift.id}`} className="text-sm font-medium">Notes</label>
          <textarea
            id={`shift-notes-${shift.id}`}
            name="notes"
            rows={3}
            defaultValue={shift.notes ?? ''}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`shift-status-${shift.id}`} className="text-sm font-medium">Status</label>
          <select
            id={`shift-status-${shift.id}`}
            name="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue={shift.status === 'draft' || shift.status === 'cancelled' ? shift.status : 'published'}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">Save Changes</Button>
        </div>
      </form>

      <form action={setShiftCancelledAction} className="mt-4 border-t pt-4 flex justify-end">
        <input type="hidden" name="shiftId" value={shift.id} />
        <input type="hidden" name="mode" value={shift.status === 'cancelled' ? 'restore' : 'cancel'} />
        <ConfirmSubmitButton
          type="submit"
          size="sm"
          variant={shift.status === 'cancelled' ? 'outline' : 'destructive'}
          confirmMessage={
            shift.status === 'cancelled'
              ? `Restore ${shift.title} on ${dateLabel.format(shift.startTime)}?`
              : `Cancel ${shift.title} on ${dateLabel.format(shift.startTime)}? Assigned staff will be notified.`
          }
        >
          {shift.status === 'cancelled' ? 'Restore Shift' : 'Cancel Shift'}
        </ConfirmSubmitButton>
      </form>
    </Drawer>
  )
}

function StaffEditDrawer({
  staff,
  currentUserId,
  initialOpen,
}: {
  staff: StaffRow
  currentUserId: string
  initialOpen: boolean
}) {
  return (
    <Drawer
      title={staff.name}
      description={staff.email}
      initialOpen={initialOpen}
      trigger={
        <Button size="sm" variant="outline">
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Manage
        </Button>
      }
    >
      <div className="space-y-6">
        <form action={updateStaffProfileAction} className="space-y-3">
          <input type="hidden" name="userId" value={staff.id} />
          <p className="text-sm font-semibold">Profile</p>
          <div className="space-y-1.5">
            <label htmlFor={`staff-name-${staff.id}`} className="text-sm font-medium">Name</label>
            <Input id={`staff-name-${staff.id}`} name="name" defaultValue={staff.name} required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`staff-email-${staff.id}`} className="text-sm font-medium">Email</label>
            <Input id={`staff-email-${staff.id}`} name="email" type="email" defaultValue={staff.email} required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`staff-phone-${staff.id}`} className="text-sm font-medium">Phone</label>
            <Input id={`staff-phone-${staff.id}`} name="phone" type="tel" defaultValue={staff.phone ?? ''} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" type="submit" variant="outline">Save Profile</Button>
          </div>
        </form>

        {staff.role !== 'inactive' ? (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-semibold">Role &amp; status</p>
            <form action={updateStaffRoleAction} className="flex flex-col sm:flex-row gap-2">
              <input type="hidden" name="userId" value={staff.id} />
              <select
                name="role"
                defaultValue={staff.role}
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <ConfirmSubmitButton
                size="sm"
                type="submit"
                variant="outline"
                confirmMessage={`Update ${staff.name}'s role?`}
              >
                Save Role
              </ConfirmSubmitButton>
            </form>
            <form action={setStaffStatusAction} className="flex justify-end">
              <input type="hidden" name="userId" value={staff.id} />
              <input type="hidden" name="mode" value="deactivate" />
              <ConfirmSubmitButton
                size="sm"
                type="submit"
                variant="destructive"
                confirmMessage={`Deactivate ${staff.name}'s account? They will lose access until reactivated.`}
              >
                Deactivate
              </ConfirmSubmitButton>
            </form>
          </div>
        ) : (
          <form action={setStaffStatusAction} className="space-y-3 border-t pt-4">
            <input type="hidden" name="userId" value={staff.id} />
            <input type="hidden" name="mode" value="reactivate" />
            <p className="text-sm font-semibold">Reactivate</p>
            <div className="space-y-1.5">
              <label htmlFor={`reactivate-role-${staff.id}`} className="text-sm font-medium">Reactivate as</label>
              <select
                id={`reactivate-role-${staff.id}`}
                name="reactivateRole"
                defaultValue="employee"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button size="sm" type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">Reactivate</Button>
            </div>
          </form>
        )}

        <form action={resetStaffPasswordAction} className="space-y-3 border-t pt-4">
          <input type="hidden" name="userId" value={staff.id} />
          <p className="text-sm font-semibold">Reset password</p>
          <TempPasswordField id={`reset-password-${staff.id}`} name="password" minLength={8} />
          <div className="flex justify-end">
            <ConfirmSubmitButton
              size="sm"
              type="submit"
              variant="outline"
              confirmMessage={`Reset ${staff.name}'s password? They will need the new temporary password to sign in.`}
            >
              Reset
            </ConfirmSubmitButton>
          </div>
        </form>

        <div className="border-t pt-4">
          {staff.role === 'inactive' && staff.id !== currentUserId ? (
            <form action={deleteStaffAction} className="flex justify-end">
              <input type="hidden" name="userId" value={staff.id} />
              <ConfirmSubmitButton
                size="sm"
                type="submit"
                variant="destructive"
                confirmMessage={`Delete ${staff.name} permanently? This cannot be undone.`}
              >
                Delete Permanently
              </ConfirmSubmitButton>
            </form>
          ) : staff.role === 'inactive' ? (
            <p className="text-xs text-muted-foreground text-right">Sign out first before deleting this account.</p>
          ) : (
            <p className="text-xs text-muted-foreground text-right">Deactivate this account before permanent delete.</p>
          )}
        </div>
      </div>
    </Drawer>
  )
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await requireManagerSession()

  const now = new Date()
  const { start: weekStart, end: weekEnd } = getWeekBounds(now)
  const formStatus = getQueryValue(searchParams?.status)
  const formError = getQueryValue(searchParams?.error)
  const openShiftId = getQueryValue(searchParams?.openShiftId)
  const countValue = Number(getQueryValue(searchParams?.count) ?? 0)
  const createdBulkCount = Number.isFinite(countValue) && countValue > 0 ? Math.floor(countValue) : 0

  const [staffRows, upcomingShiftBaseRows, weekShiftRows, pendingTimeOffRows, pendingSwapRows] = await Promise.all([
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
      notes: shifts.notes,
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
  const upcomingShiftRows = [...upcomingShiftBaseRows]
  if (openShiftId && !upcomingShiftRows.some((shift) => shift.id === openShiftId)) {
    const [requestedShift] = await db.select({
      id: shifts.id,
      title: shifts.title,
      location: shifts.location,
      notes: shifts.notes,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      status: shifts.status,
    }).from(shifts).where(eq(shifts.id, openShiftId)).limit(1)

    if (requestedShift) {
      upcomingShiftRows.unshift(requestedShift)
    }
  }

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
  const assignedUserIdByShift = new Map<string, string>()
  for (const row of assignmentRows) {
    if (row.status !== 'assigned') continue
    assignedCountByShift.set(row.shiftId, (assignedCountByShift.get(row.shiftId) ?? 0) + 1)
    if (!assignedUserIdByShift.has(row.shiftId)) {
      assignedUserIdByShift.set(row.shiftId, row.userId)
    }
  }

  const schedulableStaffRows = staffRows.filter((staff) => staff.role !== 'inactive')
  const activeStaff = schedulableStaffRows
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

  const activeTab = resolveAdminTab(getQueryValue(searchParams?.tab))
  const adminTabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'shifts' as const, label: 'Shifts' },
    { id: 'requests' as const, label: 'Requests', badge: pendingRequestsCount },
    { id: 'staff' as const, label: 'Staff' },
  ]
  const tabQuery = `?tab=${activeTab}`
  const openShiftCreate = getQueryValue(searchParams?.create) === 'shift'
  const openBulkCreate = getQueryValue(searchParams?.create) === 'bulk'
  const openStaffCreate = getQueryValue(searchParams?.create) === 'staff'
  const openStaffEditId = getQueryValue(searchParams?.openStaffId) ?? ''

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1e3a8a] flex items-center justify-center">
              <span className="text-white font-bold">LC</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Scheduler Admin</h1>
              <p className="text-sm text-muted-foreground">
                Running operations for {session.user.name}. Review requests first, then adjust staffing and publish shifts.
              </p>
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-wrap items-center justify-end gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Team View</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Pending Requests</p>
              <p className="mt-1 text-2xl font-bold">{pendingRequestsCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Time off and swaps</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Unfilled Shifts</p>
              <p className="mt-1 text-2xl font-bold">{unfilledUpcomingShifts.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Next {upcomingShiftRows.length} shifts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Team Members</p>
              <p className="mt-1 text-2xl font-bold">{activeStaff.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Schedulable users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Hours This Week</p>
              <p className="mt-1 text-2xl font-bold">{formatHours(weekHours)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Assigned only</p>
            </CardContent>
          </Card>
        </div>

        <AdminTabs active={activeTab} tabs={adminTabs} />

        <AdminToast
          status={formStatus}
          error={formError}
          count={createdBulkCount}
          dismissHref={`/admin${tabQuery}`}
        />

        {activeTab === 'overview' ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Start here</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-sm font-semibold">1. Clear approvals</p>
                  <p className="mt-1 text-sm text-muted-foreground">Time-off and swap requests before changing staffing.</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-sm font-semibold">2. Fill open coverage</p>
                  <p className="mt-1 text-sm text-muted-foreground">Use shifts and bulk scheduling to close gaps.</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-sm font-semibold">3. Publish with confidence</p>
                  <p className="mt-1 text-sm text-muted-foreground">Publish once coverage looks right so staff gets one clear update.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button asChild className="justify-start bg-[#1e3a8a] hover:bg-[#172b6d]">
                  <Link href="/admin?tab=shifts&create=shift">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    New Shift
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline">
                  <Link href="/admin?tab=shifts&create=bulk">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Bulk Schedule
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline">
                  <Link href="/admin?tab=staff&create=staff">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Staff
                  </Link>
                </Button>
                <Button asChild className="justify-start" variant="outline">
                  <Link href="/admin?tab=requests">
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Review Requests
                  </Link>
                </Button>
                <form action={publishScheduleAction} className="sm:col-span-2 lg:col-span-4">
                  <ConfirmSubmitButton
                    type="submit"
                    className="justify-start w-full"
                    variant="outline"
                    confirmMessage="Publish all future draft shifts now? Assigned employees will be notified immediately."
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Publish All Drafts
                  </ConfirmSubmitButton>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === 'shifts' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Upcoming shifts</h2>
              <p className="text-sm text-muted-foreground">Tap a row to edit or reassign. Shifts default to {DEFAULT_SHIFT_TITLE} at {DEFAULT_SHIFT_LOCATION}.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Drawer
                title="New shift"
                description={`Default: ${DEFAULT_SHIFT_TITLE} at ${DEFAULT_SHIFT_LOCATION}.`}
                initialOpen={openShiftCreate}
                trigger={
                  <Button className="bg-[#1e3a8a] hover:bg-[#172b6d]">
                    <Plus className="mr-1 h-4 w-4" />
                    New Shift
                  </Button>
                }
              >
                <form action={createShiftAction} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="assignedUserId" className="text-sm font-medium">Assign to</label>
                    <select
                      id="assignedUserId"
                      name="assignedUserId"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      defaultValue=""
                    >
                      <option value="">Unassigned</option>
                      {schedulableStaffRows.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="shiftDate" className="text-sm font-medium">Date</label>
                    <DatePickerField id="shiftDate" name="shiftDate" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="startTime" className="text-sm font-medium">Start</label>
                      <TimePickerField id="startTime" name="startTime" max="19:59" required />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="endTime" className="text-sm font-medium">End</label>
                      <TimePickerField id="endTime" name="endTime" max="20:00" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="notes" className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Special tasks, opening/closing checklist..."
                    />
                  </div>
                  <div className="space-y-1.5">
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
                  <p className="text-xs text-muted-foreground">Store closes at 8:00 PM. Shifts must end by 8:00 PM.</p>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">Save Shift</Button>
                  </div>
                </form>
              </Drawer>

              <Drawer
                title="Bulk schedule"
                description="Generate repeating shifts across a date range."
                initialOpen={openBulkCreate}
                trigger={
                  <Button variant="outline">
                    <CalendarDays className="mr-1 h-4 w-4" />
                    Bulk Schedule
                  </Button>
                }
              >
                <form action={createBulkScheduleAction} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="bulk-assignedUserId" className="text-sm font-medium">Assign to</label>
                    <select
                      id="bulk-assignedUserId"
                      name="assignedUserId"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      defaultValue=""
                    >
                      <option value="">Unassigned</option>
                      {schedulableStaffRows.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="bulk-startDate" className="text-sm font-medium">Start date</label>
                    <DatePickerField id="bulk-startDate" name="startDate" required />
                  </div>
                  <BulkRangeFields />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="bulk-startTime" className="text-sm font-medium">Start</label>
                      <TimePickerField id="bulk-startTime" name="startTime" max="19:59" required />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="bulk-endTime" className="text-sm font-medium">End</label>
                      <TimePickerField id="bulk-endTime" name="endTime" max="20:00" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Repeat on</label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((day) => (
                        <label key={day.value} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-card">
                          <input type="checkbox" name="daysOfWeek" value={day.value} className="h-4 w-4" />
                          <span>{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="bulk-notes" className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <textarea
                      id="bulk-notes"
                      name="notes"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Optional notes for all generated shifts..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="bulk-status" className="text-sm font-medium">Status</label>
                    <select
                      id="bulk-status"
                      name="status"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      defaultValue="published"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">Max range 93 days. Shifts must end by 8:00 PM.</p>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">Create Schedule</Button>
                  </div>
                </form>
              </Drawer>
            </div>
          </div>
        ) : null}

        {activeTab === 'shifts' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardContent className="p-0">
                {upcomingShiftRows.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                    No upcoming shifts yet.
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Time</th>
                            <th className="px-4 py-2">Assignee</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcomingShiftRows.map((shift) => {
                            const assignedCount = assignedCountByShift.get(shift.id) ?? 0
                            const isOpen = assignedCount === 0 && shift.status !== 'cancelled'
                            const assignedUserId = assignedUserIdByShift.get(shift.id) ?? ''
                            const assignedUserName = assignedUserId ? userNameMap.get(assignedUserId) : undefined
                            return (
                              <tr key={shift.id} className="border-b last:border-b-0 align-middle">
                                <td className="px-4 py-3 font-medium whitespace-nowrap">{dateLabel.format(shift.startTime)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                  {timeLabel.format(shift.startTime)} – {timeLabel.format(shift.endTime)}
                                </td>
                                <td className="px-4 py-3">
                                  {assignedUserName ? (
                                    <span>{assignedUserName}</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', shiftStatusPill(shift.status))}>
                                      {shift.status ?? 'unknown'}
                                    </span>
                                    {isOpen ? (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Open</span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <ShiftEditDrawer
                                    shift={shift}
                                    assignedUserId={assignedUserId}
                                    staff={schedulableStaffRows}
                                    initialOpen={openShiftId === shift.id}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="md:hidden divide-y">
                      {upcomingShiftRows.map((shift) => {
                        const assignedCount = assignedCountByShift.get(shift.id) ?? 0
                        const isOpen = assignedCount === 0 && shift.status !== 'cancelled'
                        const assignedUserId = assignedUserIdByShift.get(shift.id) ?? ''
                        const assignedUserName = assignedUserId ? userNameMap.get(assignedUserId) : undefined
                        return (
                          <div key={shift.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium">{dateLabel.format(shift.startTime)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {timeLabel.format(shift.startTime)} – {timeLabel.format(shift.endTime)}
                                </p>
                                <p className="mt-1 text-sm truncate">
                                  {assignedUserName ?? <span className="text-muted-foreground">Unassigned</span>}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', shiftStatusPill(shift.status))}>
                                  {shift.status ?? 'unknown'}
                                </span>
                                {isOpen ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Open</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <ShiftEditDrawer
                                shift={shift}
                                assignedUserId={assignedUserId}
                                staff={schedulableStaffRows}
                                initialOpen={openShiftId === shift.id}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coverage by day</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...coverageByDay.values()].length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active shifts in this range.</p>
                ) : (
                  [...coverageByDay.values()].map((day) => (
                    <div key={day.label} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{day.label}</p>
                        <p className="text-xs text-muted-foreground">{day.total} shifts</p>
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', day.open > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>
                        {day.open > 0 ? `${day.open} open` : 'Fully staffed'}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === 'requests' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time-off requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingTimeOffRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing pending.</p>
                ) : (
                  <div className="divide-y -mx-6">
                    {pendingTimeOffRows.map((request) => (
                      <div key={request.id} className="px-6 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{request.userName ?? 'Unknown user'}</p>
                            <p className="text-sm text-muted-foreground">
                              {dateLabel.format(request.startDate)} – {dateLabel.format(request.endDate)}
                            </p>
                            {request.reason ? <p className="text-sm mt-1">{request.reason}</p> : null}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {request.createdAt ? dateTimeLabel.format(request.createdAt) : 'recent'}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <form action={reviewTimeOffAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="decision" value="approve" />
                            <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                          </form>
                          <form action={reviewTimeOffAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="decision" value="deny" />
                            <Button size="sm" type="submit" variant="outline">Deny</Button>
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
                <CardTitle className="text-base">Shift swaps</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingSwapRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing pending.</p>
                ) : (
                  <div className="divide-y -mx-6">
                    {pendingSwapRows.map((swap) => {
                      const assignment = swapAssignmentMap.get(swap.assignmentId)
                      const shift = assignment ? shiftMap.get(assignment.shiftId) : undefined
                      const fromUserName = assignment ? userNameMap.get(assignment.userId) : undefined
                      const toUserName = userNameMap.get(swap.requestedUserId)

                      return (
                        <div key={swap.id} className="px-6 py-4">
                          <p className="font-medium">
                            {shift?.startTime ? `${dateLabel.format(shift.startTime)} • ${timeLabel.format(shift.startTime)} – ${timeLabel.format(shift.endTime)}` : 'Shift details unavailable'}
                          </p>
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">{fromUserName ?? 'Unassigned'}</span>
                            <span className="mx-2">→</span>
                            <span>{toUserName ?? 'Unknown employee'}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested {swap.createdAt ? dateTimeLabel.format(swap.createdAt) : 'recently'}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <form action={reviewSwapAction}>
                              <input type="hidden" name="swapId" value={swap.id} />
                              <input type="hidden" name="decision" value="approve" />
                              <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                            </form>
                            <form action={reviewSwapAction}>
                              <input type="hidden" name="swapId" value={swap.id} />
                              <input type="hidden" name="decision" value="deny" />
                              <Button size="sm" type="submit" variant="outline">Deny</Button>
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
        ) : null}

        {activeTab === 'staff' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Staff directory</h2>
                <p className="text-sm text-muted-foreground">Tap a row to update profile, role, or password.</p>
              </div>
              <Drawer
                title="Add staff"
                description="Create a new account with a temporary password."
                initialOpen={openStaffCreate}
                trigger={
                  <Button className="bg-[#1e3a8a] hover:bg-[#172b6d]">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Staff
                  </Button>
                }
              >
                <form action={createStaffAction} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="staff-name" className="text-sm font-medium">Name</label>
                    <Input id="staff-name" name="name" placeholder="Jane Doe" required />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="staff-email" className="text-sm font-medium">Email</label>
                    <Input id="staff-email" name="email" type="email" placeholder="jane@laundryco.com" required />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="staff-password" className="text-sm font-medium">Temporary password</label>
                    <TempPasswordField id="staff-password" name="password" minLength={8} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="staff-phone" className="text-sm font-medium">Phone <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <Input id="staff-phone" name="phone" type="tel" placeholder="+1..." />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="staff-role" className="text-sm font-medium">Role</label>
                    <select
                      id="staff-role"
                      name="role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      defaultValue="employee"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">Create Account</Button>
                  </div>
                </form>
              </Drawer>
            </div>

            <Card>
              <CardContent className="p-0">
                {staffRows.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No staff records found.</p>
                ) : (
                  <ul className="divide-y">
                    {staffRows.map((staff) => (
                      <li key={staff.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {staff.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium truncate">{staff.name}</p>
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', rolePill(staff.role))}>
                              {staff.role}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{staff.email}</p>
                          {staff.phone ? (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {staff.phone}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0">
                          <StaffEditDrawer
                            staff={staff}
                            currentUserId={session.user.id}
                            initialOpen={openStaffEditId === staff.id}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  )
}
