import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/schema'

type SubscriptionPayload = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await db.select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, session.user.id))
    .limit(1)

  return NextResponse.json({ enabled: rows.length > 0 })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json() as SubscriptionPayload
  const endpoint = payload.endpoint?.trim()
  const p256dh = payload.keys?.p256dh?.trim()
  const auth = payload.keys?.auth?.trim()

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
  }

  await db.insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint,
      p256dh,
      auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: session.user.id,
        p256dh,
        auth,
        updatedAt: new Date(),
      },
    })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json() as { endpoint?: string }
  const endpoint = payload.endpoint?.trim()

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
  }

  await db.delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, session.user.id), eq(pushSubscriptions.endpoint, endpoint)))

  return NextResponse.json({ ok: true })
}
