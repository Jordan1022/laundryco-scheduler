import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notifications, pushSubscriptions, users } from '@/lib/schema'
import { sendEmailWithResend } from '@/lib/resend'
import { sendPushNotification } from '@/lib/push'

type NotifyUserInput = {
  userId: string
  title: string
  body: string
  link?: string
}

type NotifyRoleInput = Omit<NotifyUserInput, 'userId'> & {
  roles: string[]
}

function absoluteLink(pathOrUrl: string | undefined) {
  if (!pathOrUrl) return undefined
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

  const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${baseUrl.replace(/\/$/, '')}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

function emailText(title: string, body: string, link?: string) {
  const lines = [title, '', body]
  if (link) {
    lines.push('', `Open: ${link}`)
  }
  return lines.join('\n')
}

export async function notifyUsers(entries: NotifyUserInput[]) {
  if (entries.length === 0) return

  await db.insert(notifications).values(entries.map((entry) => ({
    userId: entry.userId,
    title: entry.title,
    body: entry.body,
    link: entry.link ?? null,
    isRead: false,
  })))

  const uniqueUserIds = [...new Set(entries.map((entry) => entry.userId))]
  const userRows = await db.select({
    id: users.id,
    email: users.email,
    role: users.role,
  })
    .from(users)
    .where(and(inArray(users.id, uniqueUserIds), ne(users.role, 'inactive')))

  const byUserId = new Map(userRows.map((user) => [user.id, user]))
  const subscriptionRows = await db.select({
    userId: pushSubscriptions.userId,
    endpoint: pushSubscriptions.endpoint,
  })
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, uniqueUserIds))
  const subscriptionsByUser = new Map<string, { endpoint: string }[]>()
  for (const row of subscriptionRows) {
    const existing = subscriptionsByUser.get(row.userId)
    if (existing) {
      existing.push({ endpoint: row.endpoint })
    } else {
      subscriptionsByUser.set(row.userId, [{ endpoint: row.endpoint }])
    }
  }
  const staleEndpoints = new Set<string>()

  await Promise.all(entries.map(async (entry) => {
    const user = byUserId.get(entry.userId)
    const link = absoluteLink(entry.link)

    if (user?.email) {
      try {
        const emailResult = await sendEmailWithResend({
          to: user.email,
          subject: entry.title,
          text: emailText(entry.title, entry.body, link),
        })
        if (!emailResult.sent && emailResult.reason === 'missing-config') {
          console.warn('Email notification skipped due to missing Resend config', {
            userId: entry.userId,
            title: entry.title,
            hasApiKey: emailResult.hasApiKey,
            hasFromEmail: emailResult.hasFromEmail,
          })
        }
      } catch (error) {
        console.error('Failed to send notification email', {
          userId: entry.userId,
          title: entry.title,
          error,
        })
      }
    }

    try {
      const subscriptions = subscriptionsByUser.get(entry.userId) ?? []
      if (subscriptions.length > 0) {
        const pushResult = await sendPushNotification(subscriptions, {
          title: entry.title,
          body: entry.body,
          link: entry.link,
        })
        for (const endpoint of pushResult.staleEndpoints) {
          staleEndpoints.add(endpoint)
        }
      }
    } catch (error) {
      console.error('Failed to send push notification', {
        userId: entry.userId,
        title: entry.title,
        error,
      })
    }
  }))

  if (staleEndpoints.size > 0) {
    await db.delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, [...staleEndpoints]))
  }
}

export async function notifyRoles(input: NotifyRoleInput) {
  if (input.roles.length === 0) return

  const roleMembers = await db.select({ id: users.id })
    .from(users)
    .where(and(inArray(users.role, input.roles), ne(users.role, 'inactive')))

  await notifyUsers(roleMembers.map((member) => ({
    userId: member.id,
    title: input.title,
    body: input.body,
    link: input.link,
  })))
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
}

export async function markAllNotificationsRead(userId: string) {
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
}
