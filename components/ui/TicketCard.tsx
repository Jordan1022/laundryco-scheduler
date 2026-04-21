import * as React from 'react'
import { cn } from '@/lib/utils'

type TicketCardProps = React.HTMLAttributes<HTMLDivElement> & {
  perforation?: 'top' | 'bottom' | 'none'
  tone?: 'bleach' | 'paper' | 'ink' | 'cherry' | 'sage'
}

const toneClasses = {
  bleach: 'bg-bleach text-ink',
  paper: 'bg-paper text-ink',
  ink: 'bg-ink text-paper',
  cherry: 'bg-cherry text-paper',
  sage: 'bg-sage text-paper',
}

export function TicketCard({
  className,
  perforation = 'none',
  tone = 'bleach',
  children,
  ...props
}: TicketCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-sm border border-rule shadow-ticket',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {perforation === 'top' && <TicketPerforation position="top" />}
      {children}
      {perforation === 'bottom' && <TicketPerforation position="bottom" />}
    </div>
  )
}

function TicketPerforation({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute left-0 right-0 h-2 rule-perf',
        position === 'top' && 'top-0 -translate-y-1/2',
        position === 'bottom' && 'bottom-0 translate-y-1/2',
      )}
    />
  )
}

type TicketRowProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string
  mono?: boolean
}

export function TicketRow({ label, mono, className, children, ...props }: TicketRowProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', className)} {...props}>
      <span className="stamp text-ink/60">{label}</span>
      <span className={cn('text-sm tabular', mono && 'font-mono')}>{children}</span>
    </div>
  )
}

type StampProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'ink' | 'cherry' | 'sage' | 'ochre' | 'muted'
}

export function Stamp({ tone = 'ink', className, children, ...props }: StampProps) {
  const toneCls = {
    ink: 'border-ink/50 text-ink',
    cherry: 'border-cherry/60 text-cherry',
    sage: 'border-sage/60 text-sage',
    ochre: 'border-ochre/60 text-ochre',
    muted: 'border-ink/20 text-ink/60',
  }[tone]

  return (
    <span
      className={cn(
        'stamp inline-flex items-center gap-1.5 border border-dashed px-2 py-0.5 rounded-sm',
        toneCls,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
