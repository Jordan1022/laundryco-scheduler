'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type DrawerProps = {
  trigger: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  initialOpen?: boolean
}

type DrawerContextValue = { close: () => void }
const DrawerContext = React.createContext<DrawerContextValue | null>(null)

export function useDrawerClose() {
  return React.useContext(DrawerContext)?.close ?? (() => {})
}

/**
 * Form wrapper that closes its enclosing Drawer when submitted. Use this for
 * any form inside a Drawer whose server action should dismiss the drawer on
 * submit (e.g. Save Changes, Cancel Shift). Outside a Drawer it behaves as a
 * plain <form>.
 */
export function DrawerForm(props: React.ComponentPropsWithoutRef<'form'>) {
  const close = useDrawerClose()
  return (
    <form
      {...props}
      onSubmit={(event) => {
        props.onSubmit?.(event)
        if (!event.defaultPrevented) close()
      }}
    />
  )
}

export function Drawer({ trigger, title, description, children, initialOpen = false }: DrawerProps) {
  const [open, setOpen] = React.useState(initialOpen)
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const close = React.useCallback(() => setOpen(false), [])

  React.useEffect(() => {
    if (!open) return
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

  const triggerWithHandler = React.isValidElement(trigger)
    ? React.cloneElement(trigger as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
        onClick: (event: React.MouseEvent) => {
          const existing = (trigger as React.ReactElement<{ onClick?: React.MouseEventHandler }>).props.onClick
          if (existing) existing(event)
          setOpen(true)
        },
      })
    : (
        <button type="button" onClick={() => setOpen(true)}>
          {trigger}
        </button>
      )

  return (
    <>
      {triggerWithHandler}
      {open ? (
        <DrawerContext.Provider value={{ close }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
              onClick={close}
              aria-hidden="true"
            />
            <div
              ref={panelRef}
              className={cn(
                'relative flex w-full max-w-[560px] max-h-[90vh] flex-col rounded-lg border bg-background shadow-xl'
              )}
            >
              <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold truncate">{title}</h2>
                  {description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            </div>
          </div>
        </DrawerContext.Provider>
      ) : null}
    </>
  )
}
