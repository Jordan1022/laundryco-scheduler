import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/auth/login/page'

const push = vi.fn()
const refresh = vi.fn()
const signIn = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}))

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    signIn.mockReset()
    window.history.replaceState({}, '', '/auth/login')
  })

  it('renders visible field labels', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText('Email on file')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows a clear error message when sign-in fails', async () => {
    const user = userEvent.setup()
    signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email on file'), 'manager@laundryco.com')
    await user.type(screen.getByLabelText('Password'), 'bad-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText(/Incorrect email or password/)).toBeInTheDocument()
    })
    expect(push).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })
})
