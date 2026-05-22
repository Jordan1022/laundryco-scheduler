import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import ThemeToggle from '@/components/ThemeToggle'
import { serif, sans, mono, script, display } from '@/app/fonts'
import * as Sentry from '@sentry/nextjs';

export function generateMetadata(): Metadata {
  return {
    title: 'Laundry Co. Shift Scheduler',
    description: 'Employee shift scheduling for Laundry Co.',
    manifest: '/manifest.webmanifest',
    icons: {
      icon: '/icon',
      apple: '/apple-icon',
    },
    appleWebApp: {
      capable: true,
      title: 'Laundry Co Scheduler',
      statusBarStyle: 'default',
    },
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const themeInitScript = `
    (function() {
      try {
        var storedTheme = localStorage.getItem('theme');
        var hasStored = storedTheme === 'light' || storedTheme === 'dark';
        var shouldUseDark = hasStored
          ? storedTheme === 'dark'
          : window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', shouldUseDark);
      } catch (e) {}
    })();
  `

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable} ${mono.variable} ${script.variable} ${display.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased bg-paper text-ink transition-colors selection:bg-cherry/20 selection:text-ink">
        <div className="paper-grain" aria-hidden />
        <AuthProvider>{children}</AuthProvider>
        <ThemeToggle />
      </body>
    </html>
  )
}
