import * as React from 'react'
import { cn } from '@/lib/utils'

type MastheadProps = {
  eyebrow: string
  title: React.ReactNode
  subtitle?: string
  className?: string
  children?: React.ReactNode
}

export function Masthead({ eyebrow, title, subtitle, className, children }: MastheadProps) {
  return (
    <header className={cn('relative', className)}>
      <div className="flex items-center justify-between gap-6 border-b border-ink/25 pb-2">
        <span className="stamp text-ink/70">{eyebrow}</span>
        <span className="stamp text-ink/50">LC · EST 2025</span>
      </div>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-5xl leading-[0.95] tracking-tight text-ink md:text-6xl lg:text-7xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-xl text-sm text-ink-muted">{subtitle}</p>
          ) : null}
        </div>
        {children ? <div className="flex-shrink-0">{children}</div> : null}
      </div>
      <div aria-hidden className="mt-4 h-px w-full bg-ink/15" />
    </header>
  )
}
