import type { FormEvent } from 'react'

type ServerAction = (formData: FormData) => Promise<void> | void

const preventNativeSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault()

/**
 * Props for a <form> bound to a Next.js server action.
 *
 * React 18's DOM renderer (used by the jsdom test environment) treats a
 * function passed to the `action` prop as an invalid attribute and warns. The
 * real app compiles server actions fine — only tests see the warning. In test
 * mode we drop `action` and prevent the native submit instead.
 */
export function serverActionFormProps(action: ServerAction) {
  if (process.env.NODE_ENV === 'test') {
    return { onSubmit: preventNativeSubmit }
  }
  return { action }
}
