import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Users } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/login')
  }

  const { name, role } = session.user

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#1e3a8a] flex items-center justify-center">
              <span className="text-white font-bold">LC</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Laundry Co. Scheduler</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">
              {role}
            </span>
            <form
              action={async () => {
                'use server'
                const { signOut } = await import('@/lib/auth')
                await signOut({ redirectTo: '/auth/login' })
              }}
            >
              <Button variant="outline" size="sm">Sign Out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4</div>
              <p className="text-sm text-muted-foreground">Next 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">32</div>
              <p className="text-sm text-muted-foreground">of 40 scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12</div>
              <p className="text-sm text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="text-slate-500">Calendar view coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" variant="outline">
                  Request Time Off
                </Button>
                <Button className="w-full" variant="outline">
                  Swap a Shift
                </Button>
                <Button className="w-full" variant="outline">
                  View Full Calendar
                </Button>
                {role === 'manager' || role === 'admin' ? (
                  <Button className="w-full bg-[#1e3a8a] hover:bg-[#172b6d]">
                    Create New Shift
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}