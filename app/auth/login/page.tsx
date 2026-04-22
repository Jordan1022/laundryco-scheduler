'use client'

import { signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Brandmark } from '@/components/ui/Brandmark'
import { TicketCard, Stamp } from '@/components/ui/TicketCard'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setStatus(new URLSearchParams(window.location.search).get('status'))
  }, [])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setFormError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setIsLoading(false)

    if (result?.ok) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    setFormError('Those credentials don’t match a ticket on file. Try again.')
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, hsl(var(--cherry) / 0.08) 0, transparent 45%), radial-gradient(circle at 80% 90%, hsl(var(--ink) / 0.08) 0, transparent 45%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-8 right-[6%] hidden xl:block"
        >
          <Brandmark variant="mascot" size="xl" />
        </div>

        <div className="w-full max-w-md animate-reveal-up">
          <div className="mb-8 flex flex-col items-center gap-3">
            <Brandmark variant="wordmark-leaguecity" size="lg" />
            <Stamp tone="muted">Staff sign-in · Est. 2025</Stamp>
          </div>

          <TicketCard tone="bleach" className="p-8">
            <div className="mb-6 space-y-1">
              <span className="stamp text-ink/60">No. 001 · Welcome back</span>
              <h1 className="font-serif text-4xl leading-none text-ink">Clock in.</h1>
              <p className="mt-2 text-sm text-ink-muted">
                Sign in to see your shifts, swap with a coworker, or open the admin office.
              </p>
            </div>

            {status === 'password-updated' ? (
              <div className="mb-4 rounded-sm border border-sage/40 bg-sage-soft px-3 py-2 text-xs text-sage">
                Password updated. Sign in with your new password.
              </div>
            ) : null}
            {formError ? (
              <div
                role="alert"
                className="mb-4 rounded-sm border border-cherry/40 bg-cherry-soft px-3 py-2 text-xs text-cherry animate-stamp-in"
              >
                {formError}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="stamp text-ink/60">
                  Email on file
                </label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="you@laundryco.com"
                  required
                  disabled={isLoading}
                  className="h-12 rounded-sm border-ink/20 bg-paper/60 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="stamp text-ink/60">
                  Password
                </label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="h-12 rounded-sm border-ink/20 bg-paper/60 font-mono text-sm"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="h-12 w-full">
                {isLoading ? 'Stamping…' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between border-t border-dashed border-ink/20 pt-4">
              <span className="stamp text-ink/50">Need access?</span>
              <span className="text-xs text-ink-muted">Ask your manager for a ticket.</span>
            </div>
          </TicketCard>
        </div>
      </div>
    </div>
  )
}
