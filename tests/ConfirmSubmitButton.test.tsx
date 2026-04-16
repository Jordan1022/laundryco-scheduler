import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'

describe('ConfirmSubmitButton', () => {
  const confirmSpy = vi.spyOn(window, 'confirm')

  beforeEach(() => {
    confirmSpy.mockReset()
  })

  afterEach(() => {
    confirmSpy.mockReset()
  })

  it('prevents submission when confirmation is canceled', async () => {
    const user = userEvent.setup()
    confirmSpy.mockReturnValue(false)
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <ConfirmSubmitButton confirmMessage="Deactivate this staff account?">
          Deactivate
        </ConfirmSubmitButton>
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(confirmSpy).toHaveBeenCalledWith('Deactivate this staff account?')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('allows submission when confirmation is accepted', async () => {
    const user = userEvent.setup()
    confirmSpy.mockReturnValue(true)
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <ConfirmSubmitButton confirmMessage="Deactivate this staff account?">
          Deactivate
        </ConfirmSubmitButton>
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(confirmSpy).toHaveBeenCalledWith('Deactivate this staff account?')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
