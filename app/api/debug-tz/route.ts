import { NextResponse } from 'next/server'
import { and, gte, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { shifts } from '@/lib/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rangeStart = new Date('2026-04-20T00:00:00.000Z')
  const rangeEnd = new Date('2026-04-27T00:00:00.000Z')

  const rows = await db
    .select({ startTime: shifts.startTime, endTime: shifts.endTime })
    .from(shifts)
    .where(and(gte(shifts.startTime, rangeStart), lt(shifts.startTime, rangeEnd)))
    .orderBy(shifts.startTime)
    .limit(4)

  const sample = new Date('2026-08-07 16:00:00')
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

  return NextResponse.json({
    resolvedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    envTz: process.env.TZ ?? null,
    buildCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    sampleParse: {
      input: '2026-08-07 16:00:00',
      iso: sample.toISOString(),
      formatted: fmt.format(sample),
      formatterTz: fmt.resolvedOptions().timeZone,
    },
    apr21to26Sample: rows.map((r) => ({
      startIso: r.startTime.toISOString(),
      endIso: r.endTime.toISOString(),
      startFormatted: fmt.format(r.startTime),
      endFormatted: fmt.format(r.endTime),
    })),
  })
}
