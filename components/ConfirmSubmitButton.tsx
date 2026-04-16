'use client'

import * as React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

type ConfirmSubmitButtonProps = ButtonProps & {
  confirmMessage: string
}

export default function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  children,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault()
          return
        }

        onClick?.(event)
      }}
    >
      {children}
    </Button>
  )
}
