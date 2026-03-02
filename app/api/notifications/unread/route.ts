import { NextResponse } from 'next/server'
import { and, desc, eq, gt } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/schema'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role === 'inactive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sinceRaw = url.searchParams.get('since')
  const limitRaw = Number(url.searchParams.get('limit') ?? '20')
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20
  const since = sinceRaw ? new Date(sinceRaw) : null
  const hasValidSince = Boolean(since && !Number.isNaN(since.getTime()))

  const where = hasValidSince
    ? and(
        eq(notifications.userId, session.user.id),
        eq(notifications.isRead, false),
        gt(notifications.createdAt, since as Date),
      )
    : and(
        eq(notifications.userId, session.user.id),
        eq(notifications.isRead, false),
      )

  const rows = await db.select({
    id: notifications.id,
    title: notifications.title,
    body: notifications.body,
    link: notifications.link,
    createdAt: notifications.createdAt,
  })
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)

  return NextResponse.json({
    items: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  })
}
