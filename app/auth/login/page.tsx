'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

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
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-[#1e3a8a] flex items-center justify-center">
              <span className="text-white font-bold text-xl">LC</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Laundry Co. Scheduler</CardTitle>
          <CardDescription className="text-center">
            Sign in to view your schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Input
                name="email"
                type="email"
                placeholder="Email"
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>
            <div>
              <Input
                name="password"
                type="password"
                placeholder="Password"
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 bg-[#1e3a8a] hover:bg-[#172b6d]"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need access? Contact your manager.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}