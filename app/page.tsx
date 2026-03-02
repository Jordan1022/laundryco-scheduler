import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await auth()
  if (session?.user && session.user.id && session.user.role !== 'inactive') {
    redirect('/dashboard')
  }
  redirect('/auth/login')
}
