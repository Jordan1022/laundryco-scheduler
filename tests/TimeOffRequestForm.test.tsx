import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import TimeOffRequestForm from '@/components/TimeOffRequestForm'

const baseProps = {
  defaultDate: '2026-05-22',
  returnView: 'week' as const,
  returnDate: '2026-05-22',
  formAction: async () => {},
  submittedRequests: [],
}

describe('TimeOffRequestForm', () => {
  it('moves the through date to match the from date', async () => {
    const user = userEvent.setup()
    render(<TimeOffRequestForm {...baseProps} />)

    const from = screen.getByLabelText('From')
    const through = screen.getByLabelText('Through')

    await user.clear(from)
    await user.type(from, '2026-05-31')

    expect(through).toHaveValue('2026-05-31')
    expect(through).toHaveAttribute('min', '2026-05-31')
  })

  it('prevents a through date before the from date when typed directly', async () => {
    const user = userEvent.setup()
    render(<TimeOffRequestForm {...baseProps} />)

    const from = screen.getByLabelText('From')
    const through = screen.getByLabelText('Through')

    await user.clear(from)
    await user.type(from, '2026-05-31')
    await user.clear(through)
    await user.type(through, '2026-05-30')

    expect(through).toHaveValue('2026-05-31')
  })

  it('submits a selected single-shift scope', async () => {
    const user = userEvent.setup()
    render(<TimeOffRequestForm {...baseProps} />)

    await user.selectOptions(screen.getByLabelText('Unavailable for'), 'early')

    expect(screen.getByLabelText('Unavailable for')).toHaveValue('early')
  })

  it('shows submitted time-off requests with status', () => {
    render(
      <TimeOffRequestForm
        {...baseProps}
        submittedRequests={[
          {
            id: 'request-1',
            dateRangeLabel: 'Sun, May 31',
            windowLabel: 'Early shift only',
            status: 'pending',
            submittedAtLabel: 'May 22, 9:00 AM',
          },
          {
            id: 'request-2',
            dateRangeLabel: 'Mon, Jun 1 – Tue, Jun 2',
            windowLabel: 'All shifts',
            status: 'approved',
            submittedAtLabel: 'May 20, 2:30 PM',
          },
        ]}
      />,
    )

    expect(screen.getByText('Your submitted slips')).toBeInTheDocument()
    expect(screen.getByText('Sun, May 31')).toBeInTheDocument()
    expect(screen.getAllByText('Early shift only').length).toBeGreaterThan(0)
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })
})
