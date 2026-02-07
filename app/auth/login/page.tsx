import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
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
          <form
            action={async (formData) => {
              'use server'
              await signIn('credentials', {
                email: formData.get('email'),
                password: formData.get('password'),
                redirectTo: '/dashboard',
              })
            }}
            className="space-y-4"
          >
            <div>
              <Input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="h-12"
              />
            </div>
            <div>
              <Input
                name="password"
                type="password"
                placeholder="Password"
                required
                className="h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-[#1e3a8a] hover:bg-[#172b6d]">
              Sign In
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