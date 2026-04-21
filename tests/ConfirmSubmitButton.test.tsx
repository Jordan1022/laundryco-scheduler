import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'

describe('ConfirmSubmitButton', () => {
  it('does not submit until the confirmation dialog is accepted', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <ConfirmSubmitButton
          confirmTitle="Deactivate account"
          confirmMessage="Deactivate this staff account?"
        >
          Deactivate
        </ConfirmSubmitButton>
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))
    // Dialog is visible
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Deactivate this staff account?')).toBeInTheDocument()
    // Nothing submitted yet
    expect(onSubmit).not.toHaveBeenCalled()

    // Cancel path
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the form when the user confirms', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <ConfirmSubmitButton
          confirmTitle="Deactivate account"
          confirmMessage="Deactivate this staff account?"
        >
          Deactivate
        </ConfirmSubmitButton>
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
