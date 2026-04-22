import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Brandmark } from '@/components/ui/Brandmark'
import { TicketCard } from '@/components/ui/TicketCard'

type PasswordPageProps = {
  searchParams?: {
    status?: string | string[]
    error?: string | string[]
  }
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

async function requireAuthenticatedSession() {
  const session = await auth()
  if (!session?.user || !session.user.id || session.user.role === 'inactive') {
    redirect('/auth/login')
  }
  return session
}

async function changePasswordAction(formData: FormData) {
  'use server'

  const session = await requireAuthenticatedSession()
  const currentPassword = String(formData.get('currentPassword') ?? '')
  const newPassword = String(formData.get('newPassword') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect('/account/password?error=missing-fields')
  }
  if (newPassword.length < 8) {
    redirect('/account/password?error=password-too-short')
  }
  if (newPassword !== confirmPassword) {
    redirect('/account/password?error=password-mismatch')
  }

  const [existingUser] = await db.select({
    id: users.id,
    hashedPassword: users.hashedPassword,
  })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!existingUser || !existingUser.hashedPassword) {
    redirect('/account/password?error=account-not-ready')
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingUser.hashedPassword)
  if (!isCurrentPasswordValid) {
    redirect('/account/password?error=current-password-invalid')
  }

  const isSameAsCurrent = await bcrypt.compare(newPassword, existingUser.hashedPassword)
  if (isSameAsCurrent) {
    redirect('/account/password?error=password-unchanged')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await db.update(users).set({
    hashedPassword,
    passwordChangedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(users.id, session.user.id))

  redirect('/auth/login?status=password-updated')
}

const ERROR_COPY: Record<string, string> = {
  'missing-fields': 'Fill in current, new, and confirmation fields.',
  'password-too-short': 'New password must be at least 8 characters.',
  'password-mismatch': 'New password and confirmation don’t match.',
  'current-password-invalid': 'Current password is incorrect.',
  'password-unchanged': 'New password must differ from the current one.',
  'account-not-ready': 'This account can’t update its password yet — ask a manager.',
}

export default async function PasswordPage({ searchParams }: PasswordPageProps) {
  await requireAuthenticatedSession()

  const formStatus = getQueryValue(searchParams?.status)
  const formError = getQueryValue(searchParams?.error)
  const errorMessage = formError ? ERROR_COPY[formError] : null

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Brandmark variant="wordmark-leaguecity" size="md" />
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">← Back to dashboard</Link>
          </Button>
        </header>

        <TicketCard tone="bleach" className="p-8 animate-reveal-up">
          <div className="mb-6 space-y-1 border-b border-dashed border-ink/20 pb-4">
            <span className="stamp text-ink/60">Account security</span>
            <h1 className="font-serif text-4xl leading-none text-ink">New password slip</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Use at least 8 characters. Don’t reuse the current password.
            </p>
          </div>

          {formStatus === 'password-updated' ? (
            <div className="mb-4 rounded-sm border border-sage/40 bg-sage-soft px-3 py-2 text-xs text-sage">
              Your password has been updated.
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mb-4 rounded-sm border border-cherry/40 bg-cherry-soft px-3 py-2 text-xs text-cherry">
              {errorMessage}
            </div>
          ) : null}

          <form action={changePasswordAction} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="currentPassword" className="stamp text-ink/60">Current password</label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="h-11 rounded-sm border-ink/20 bg-paper/60 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="stamp text-ink/60">New password</label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="h-11 rounded-sm border-ink/20 bg-paper/60 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="stamp text-ink/60">Confirm new password</label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="h-11 rounded-sm border-ink/20 bg-paper/60 font-mono text-sm"
              />
            </div>
            <Button type="submit" className="h-11 w-full">
              Stamp &amp; update
            </Button>
          </form>
        </TicketCard>
      </div>
    </div>
  )
}
