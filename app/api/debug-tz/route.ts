import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
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
  })
}
