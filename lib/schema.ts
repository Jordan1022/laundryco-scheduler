import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Users: employees & managers
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  phone: text('phone'), // for SMS notifications
  role: text('role').notNull().default('employee'), // 'employee', 'manager', 'admin'
  hashedPassword: text('hashed_password'),
  passwordChangedAt: timestamp('password_changed_at'),
  onboardingEmailSentAt: timestamp('onboarding_email_sent_at'),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  link: text('link'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  shiftsCreated: many(shifts, { relationName: 'creator' }),
  assignments: many(assignments),
  timeOffRequests: many(timeOffRequests),
  shiftSwapRequests: many(shiftSwapRequests, { relationName: 'requestedUser' }),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}))

// Shifts: available time slots
export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(), // e.g., "Morning Wash"
  location: text('location'),
  startTime: timestamp('start_time', { mode: 'date' }).notNull(),
  endTime: timestamp('end_time', { mode: 'date' }).notNull(),
  notes: text('notes'),
  status: text('status').default('draft'), // 'draft', 'published', 'cancelled'
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  creator: one(users, {
    fields: [shifts.createdBy],
    references: [users.id],
    relationName: 'creator',
  }),
  assignments: many(assignments),
}))

// Assignments: which employee is assigned to which shift
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  shiftId: uuid('shift_id').references(() => shifts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('assigned'), // 'assigned', 'requested', 'swap_pending'
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueShiftUser: unique('unique_shift_user').on(table.shiftId, table.userId),
}))

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  shift: one(shifts, {
    fields: [assignments.shiftId],
    references: [shifts.id],
  }),
  user: one(users, {
    fields: [assignments.userId],
    references: [users.id],
  }),
}))

// Time-off requests.
//
// `startDate` / `endDate` are INCLUSIVE date bounds: `endDate = May 15`
// means "May 15 is off." When checking whether a shift conflicts with a
// request, the upper bound is `endDate + 1 day` (exclusive), NOT `endDate`
// (inclusive). Equivalently: any shift whose calendar date in the business
// TZ falls in [startDate, endDate] is covered.
//
// `unavailableStartMinute` / `unavailableEndMinute` describe the
// minute-of-day window on each covered day. [0, 1440) = all day.
// [0, 960) = unavailable before 16:00 (the early shift only). [960, 1440) =
// unavailable from 16:00 onward (the late shift only). The minute model
// survives schedule reshaping; see lib/timeOff.ts for presets and overlap
// helpers.
export const timeOffRequests = pgTable('time_off_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
  unavailableStartMinute: integer('unavailable_start_minute').notNull().default(0),
  unavailableEndMinute: integer('unavailable_end_minute').notNull().default(1440),
  reason: text('reason'),
  status: text('status').default('pending'), // 'pending', 'approved', 'denied'
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const timeOffRequestsRelations = relations(timeOffRequests, ({ one }) => ({
  user: one(users, {
    fields: [timeOffRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [timeOffRequests.reviewedBy],
    references: [users.id],
    relationName: 'reviewer',
  }),
}))

// Shift swap requests
export const shiftSwapRequests = pgTable('shift_swap_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalAssignmentId: uuid('original_assignment_id').references(() => assignments.id).notNull(),
  requestedUserId: uuid('requested_user_id').references(() => users.id).notNull(),
  status: text('status').default('pending'), // 'pending', 'approved', 'denied'
  createdAt: timestamp('created_at').defaultNow(),
})

export const shiftSwapRequestsRelations = relations(shiftSwapRequests, ({ one }) => ({
  originalAssignment: one(assignments, {
    fields: [shiftSwapRequests.originalAssignmentId],
    references: [assignments.id],
  }),
  requestedUser: one(users, {
    fields: [shiftSwapRequests.requestedUserId],
    references: [users.id],
    relationName: 'requestedUser',
  }),
}))

// Audit log (optional, for tracking changes)
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(), // 'shift_created', 'assignment_changed', etc.
  userId: uuid('user_id').references(() => users.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})
