'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConfirmSubmitButtonProps = ButtonProps & {
  confirmMessage: string
  confirmTitle?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'destructive'
}

export default function ConfirmSubmitButton({
  confirmMessage,
  confirmTitle = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  children,
  ...props
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<HTMLFormElement | null>(null)
  const confirmRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  function handleTrigger(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    const triggerForm = (event.currentTarget as HTMLButtonElement).closest('form')
    setForm(triggerForm instanceof HTMLFormElement ? triggerForm : null)
    setOpen(true)
  }

  function handleConfirm() {
    if (form) form.requestSubmit()
    setOpen(false)
  }

  return (
    <>
      <Button {...props} onClick={handleTrigger}>
        {children}
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md animate-stamp-in rounded-sm border border-ink/20 bg-bleach p-6 shadow-ticket">
            <div className="flex items-start justify-between gap-4 border-b border-dashed border-ink/15 pb-3">
              <div>
                <span className="stamp text-ink/60">Please confirm</span>
                <h2 id="confirm-dialog-title" className="mt-1 font-serif text-2xl leading-tight text-ink">
                  {confirmTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-sm p-1.5 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm text-ink-muted">{confirmMessage}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
                ref={confirmRef}
                type="button"
                className={cn(tone === 'destructive' && 'bg-cherry text-paper hover:bg-cherry/90')}
                onClick={handleConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
