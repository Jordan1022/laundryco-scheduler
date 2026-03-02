import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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

export default async function PasswordPage({ searchParams }: PasswordPageProps) {
  await requireAuthenticatedSession()

  const formStatus = getQueryValue(searchParams?.status)
  const formError = getQueryValue(searchParams?.error)

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1e3a8a] flex items-center justify-center">
              <span className="text-white font-bold">LC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Change Password</h1>
              <p className="text-sm text-muted-foreground">Update your account password securely.</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Password Settings</CardTitle>
            <CardDescription>
              Use at least 8 characters and do not reuse your current password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formStatus === 'password-updated' ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
                Your password has been updated.
              </div>
            ) : null}
            {formError === 'missing-fields' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                Current password, new password, and confirmation are required.
              </div>
            ) : null}
            {formError === 'password-too-short' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                New password must be at least 8 characters.
              </div>
            ) : null}
            {formError === 'password-mismatch' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                New password and confirmation do not match.
              </div>
            ) : null}
            {formError === 'current-password-invalid' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                Current password is incorrect.
              </div>
            ) : null}
            {formError === 'password-unchanged' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                New password must be different from your current password.
              </div>
            ) : null}
            {formError === 'account-not-ready' ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                This account cannot update password yet. Contact your manager.
              </div>
            ) : null}

            <form action={changePasswordAction} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="currentPassword" className="text-sm font-medium">Current Password</label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-[#172b6d]">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
