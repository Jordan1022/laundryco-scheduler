'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Check, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_SHIFT_FILTER, type ShiftFilter } from '@/lib/shiftFilter'

const OPTIONS: { id: ShiftFilter; label: string; hint?: string }[] = [
  { id: 'unfilled-first', label: 'Unfilled first', hint: 'Needs-staff at top, then covered' },
  { id: 'unfilled-only', label: 'Unfilled only', hint: 'Soonest first' },
  { id: 'all-chronological', label: 'All by soonest' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'cancelled', label: 'Cancelled' },
]

export default function UpcomingShiftsFilter({ active }: { active: ShiftFilter }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const activeLabel = OPTIONS.find((opt) => opt.id === active)?.label ?? 'Unfilled only'

  const choose = (id: ShiftFilter) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (id === DEFAULT_SHIFT_FILTER) params.delete('shiftFilter')
    else params.set('shiftFilter', id)
    params.delete('openShiftId')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-ink/25 bg-paper px-3 text-sm text-ink hover:bg-muted"
      >
        <ListFilter className="h-4 w-4" />
        <span className="stamp text-ink/60">Filter</span>
        <span className="font-medium">{activeLabel}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-2 w-64 rounded-md border border-ink/20 bg-paper p-1 shadow-md"
        >
          <ul>
            {OPTIONS.map((opt) => {
              const isActive = opt.id === active
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => choose(opt.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted',
                      isActive && 'bg-muted',
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium text-ink">{opt.label}</span>
                      {opt.hint ? (
                        <span className="text-xs text-ink-muted">{opt.hint}</span>
                      ) : null}
                    </span>
                    {isActive ? <Check className="h-4 w-4 text-ink" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
