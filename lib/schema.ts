import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Users: employees & managers
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  phone: text('phone'), // for SMS notifications
  role: text('role').notNull().default('employee'), // 'employee', 'manager', 'admin'
  hashedPassword: text('hashed_password'),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const usersRelations = relations(users, ({ many }) => ({
  shiftsCreated: many(shifts, { relationName: 'creator' }),
  assignments: many(assignments),
  timeOffRequests: many(timeOffRequests),
  shiftSwapRequests: many(shiftSwapRequests, { relationName: 'requestedUser' }),
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

// Time-off requests
export const timeOffRequests = pgTable('time_off_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
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

// Helper for unique constraint
function unique(name: string) {
  return { name }
}