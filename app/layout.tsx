import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'Laundry Co. Shift Scheduler',
  description: 'Employee shift scheduling for Laundry Co.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
