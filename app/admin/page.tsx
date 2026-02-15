import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, count, desc, eq, gte, inArray, lt, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assignments, shiftSwapRequests, shifts, timeOffRequests, users } from '@/lib/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import TempPasswordField from '@/components/TempPasswordField'
import { cn } from '@/lib/utils'
import { CalendarDays, CalendarPlus, CheckSquare, UserPlus, Users } from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import bcrypt from 'bcryptjs'

const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const timeLabel = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const dateTimeLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const CLOSING_TIME_MINUTES = 20 * 60 // 8:00 PM
const ACTIVE_ROLES = ['employee', 'manager', 'admin'] as const

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

function rolePill(role: string) {
  if (role === 'admin') return 'bg-violet-100 text-violet-800'
  if (role === 'manager') return 'bg-blue-100 text-blue-800'
  if (role === 'inactive') return 'bg-rose-100 text-rose-800'
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
      .where(and(eq(users.id, assignedUserId), ne(users.role, 'inactive')))
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

async function updateShiftAction(formData: FormData) {
  'use server'

  await requireManagerSession()

  const shiftId = String(formData.get('shiftId') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()
  const shiftDate = String(formData.get('shiftDate') ?? '')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const assignedUserId = String(formData.get('assignedUserId') ?? '')
  const requestedStatus = String(formData.get('status') ?? 'published')
  const status = requestedStatus === 'draft' || requestedStatus === 'cancelled' ? requestedStatus : 'published'

  if (!shiftId || !title || !shiftDate || !startTime || !endTime) {
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
    location: location || null,
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

  redirect(`/admin?status=${mode === 'cancel' ? 'shift-cancelled' : 'shift-restored'}#upcoming-shifts`)
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

  try {
    await db.insert(users).values({
      name,
      email,
      phone: phone || null,
      role,
      hashedPassword,
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      redirect('/admin?error=staff-email-exists#staff-management')
    }
    throw error
  }

  redirect('/admin?status=staff-created#staff-management')
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
    updatedAt: new Date(),
  }).where(eq(users.id, userId))

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
            <Button asChild className="justify-start" variant="outline">
              <Link href="#staff-management">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff
              </Link>
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
                  {schedulableStaffRows.map((staff) => (
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

        <div id="upcoming-shifts" className="space-y-4">
          {formStatus === 'shift-updated' ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Shift updated.
            </div>
          ) : null}
          {formStatus === 'shift-cancelled' ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Shift cancelled.
            </div>
          ) : null}
          {formStatus === 'shift-restored' ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Shift restored to published.
            </div>
          ) : null}
          {formError === 'edit-missing-fields' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Shift title, date, start time, and end time are required.
            </div>
          ) : null}
          {formError === 'edit-invalid-time' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Shift end time must be after start time.
            </div>
          ) : null}
          {formError === 'edit-after-hours' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Store closes at 8:00 PM. Shifts must end by 8:00 PM.
            </div>
          ) : null}
          {formError === 'invalid-shift' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Shift not found or no longer editable.
            </div>
          ) : null}
          {formError === 'invalid-assignee' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              The selected assignee does not exist.
            </div>
          ) : null}

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
                      const assignedUserId = assignedUserIdByShift.get(shift.id) ?? ''
                      const assignedUserName = assignedUserId ? userNameMap.get(assignedUserId) : undefined
                      return (
                        <div key={shift.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{shift.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {dateLabel.format(shift.startTime)} • {timeLabel.format(shift.startTime)} - {timeLabel.format(shift.endTime)}
                                {shift.location ? ` • ${shift.location}` : ''}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {assignedUserName ? `Assigned: ${assignedUserName}` : 'Unassigned'}
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

                          <details className="mt-4 rounded-md border border-slate-200 p-3">
                            <summary className="cursor-pointer text-sm font-medium">Edit / Reassign</summary>
                            <form action={updateShiftAction} className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              <input type="hidden" name="shiftId" value={shift.id} />
                              <div className="space-y-1">
                                <label htmlFor={`shift-title-${shift.id}`} className="text-xs font-medium">Title</label>
                                <Input
                                  id={`shift-title-${shift.id}`}
                                  name="title"
                                  defaultValue={shift.title}
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`shift-location-${shift.id}`} className="text-xs font-medium">Location</label>
                                <Input
                                  id={`shift-location-${shift.id}`}
                                  name="location"
                                  defaultValue={shift.location ?? ''}
                                />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`shift-assignee-${shift.id}`} className="text-xs font-medium">Assign To</label>
                                <select
                                  id={`shift-assignee-${shift.id}`}
                                  name="assignedUserId"
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  defaultValue={assignedUserId}
                                >
                                  <option value="">Unassigned</option>
                                  {schedulableStaffRows.map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                      {staff.name} ({staff.role})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`shift-date-${shift.id}`} className="text-xs font-medium">Date</label>
                                <Input
                                  id={`shift-date-${shift.id}`}
                                  name="shiftDate"
                                  type="date"
                                  defaultValue={formatDateInput(shift.startTime)}
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`shift-start-${shift.id}`} className="text-xs font-medium">Start</label>
                                <Input
                                  id={`shift-start-${shift.id}`}
                                  name="startTime"
                                  type="time"
                                  max="19:59"
                                  defaultValue={formatTimeInput(shift.startTime)}
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`shift-end-${shift.id}`} className="text-xs font-medium">End</label>
                                <Input
                                  id={`shift-end-${shift.id}`}
                                  name="endTime"
                                  type="time"
                                  max="20:00"
                                  defaultValue={formatTimeInput(shift.endTime)}
                                  required
                                />
                              </div>
                              <div className="space-y-1 xl:col-span-2">
                                <label htmlFor={`shift-notes-${shift.id}`} className="text-xs font-medium">Notes</label>
                                <textarea
                                  id={`shift-notes-${shift.id}`}
                                  name="notes"
                                  rows={2}
                                  defaultValue={shift.notes ?? ''}
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`shift-status-${shift.id}`} className="text-xs font-medium">Status</label>
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
                              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap justify-end gap-2">
                                <Button type="submit" size="sm" className="bg-[#1e3a8a] hover:bg-[#172b6d]">
                                  Save Changes
                                </Button>
                              </div>
                            </form>

                            <div className="mt-3 border-t pt-3 flex justify-end">
                              <form action={setShiftCancelledAction}>
                                <input type="hidden" name="shiftId" value={shift.id} />
                                <input type="hidden" name="mode" value={shift.status === 'cancelled' ? 'restore' : 'cancel'} />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant={shift.status === 'cancelled' ? 'outline' : 'destructive'}
                                >
                                  {shift.status === 'cancelled' ? 'Restore Shift' : 'Cancel Shift'}
                                </Button>
                              </form>
                            </div>
                          </details>
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

        <div id="staff-management" className="space-y-4">
          {formStatus === 'staff-created' ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Staff account created.
            </div>
          ) : null}
          {formStatus === 'staff-role-updated' ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Staff role updated.
            </div>
          ) : null}
          {formStatus === 'staff-deactivated' ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Staff account deactivated.
            </div>
          ) : null}
          {formStatus === 'staff-reactivated' ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Staff account reactivated.
            </div>
          ) : null}
          {formStatus === 'staff-password-reset' ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Staff password reset.
            </div>
          ) : null}
          {formError === 'staff-missing-fields' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Name, email, and password are required to create staff.
            </div>
          ) : null}
          {formError === 'staff-invalid-email' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Staff email must be a valid email address.
            </div>
          ) : null}
          {formError === 'staff-password-too-short' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Staff password must be at least 8 characters.
            </div>
          ) : null}
          {formError === 'staff-reset-password-too-short' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Reset password must be at least 8 characters.
            </div>
          ) : null}
          {formError === 'staff-email-exists' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              A staff account with that email already exists.
            </div>
          ) : null}
          {formError === 'staff-invalid-role' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Invalid staff role provided.
            </div>
          ) : null}
          {formError === 'staff-not-found' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Staff account not found.
            </div>
          ) : null}
          {formError === 'staff-last-admin' ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              You must keep at least one active admin account.
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createStaffAction} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="staff-name" className="text-sm font-medium">Name</label>
                  <Input id="staff-name" name="name" placeholder="Jane Doe" required />
                </div>
                <div className="space-y-1">
                  <label htmlFor="staff-email" className="text-sm font-medium">Email</label>
                  <Input id="staff-email" name="email" type="email" placeholder="jane@laundryco.com" required />
                </div>
                <div className="space-y-1">
                  <label htmlFor="staff-password" className="text-sm font-medium">Temporary Password</label>
                  <TempPasswordField id="staff-password" name="password" minLength={8} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="staff-phone" className="text-sm font-medium">Phone (Optional)</label>
                  <Input id="staff-phone" name="phone" type="tel" placeholder="+1..." />
                </div>
                <div className="space-y-1">
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
                <div className="md:col-span-2 xl:col-span-3 flex justify-end">
                  <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">
                    Create Staff Account
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

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
                    <div key={staff.id} className="rounded-lg border p-4 bg-white space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{staff.name}</p>
                          <p className="text-sm text-muted-foreground">{staff.email}</p>
                        </div>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', rolePill(staff.role))}>
                          {staff.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{staff.phone ?? 'No phone on file'}</span>
                      </div>

                      {staff.role !== 'inactive' ? (
                        <div className="space-y-2">
                          <form action={updateStaffRoleAction} className="flex gap-2">
                            <input type="hidden" name="userId" value={staff.id} />
                            <select
                              name="role"
                              defaultValue={staff.role}
                              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                              <option value="employee">Employee</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                            <Button size="sm" type="submit" variant="outline">Save Role</Button>
                          </form>
                          <form action={setStaffStatusAction} className="flex justify-end">
                            <input type="hidden" name="userId" value={staff.id} />
                            <input type="hidden" name="mode" value="deactivate" />
                            <Button size="sm" type="submit" variant="destructive">
                              Deactivate
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <form action={setStaffStatusAction} className="space-y-2">
                          <input type="hidden" name="userId" value={staff.id} />
                          <input type="hidden" name="mode" value="reactivate" />
                          <div className="space-y-1">
                            <label htmlFor={`reactivate-role-${staff.id}`} className="text-xs font-medium">Reactivate As</label>
                            <select
                              id={`reactivate-role-${staff.id}`}
                              name="reactivateRole"
                              defaultValue="employee"
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                              <option value="employee">Employee</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div className="flex justify-end">
                            <Button size="sm" type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">
                              Reactivate
                            </Button>
                          </div>
                        </form>
                      )}

                      <form action={resetStaffPasswordAction} className="space-y-2 border-t pt-3">
                        <input type="hidden" name="userId" value={staff.id} />
                        <div className="space-y-1">
                          <label htmlFor={`reset-password-${staff.id}`} className="text-xs font-medium">Reset Password</label>
                          <div className="space-y-2">
                            <TempPasswordField id={`reset-password-${staff.id}`} name="password" minLength={8} inputClassName="h-9" />
                            <div className="flex justify-end">
                              <Button size="sm" type="submit" variant="outline">
                                Reset
                              </Button>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
