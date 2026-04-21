import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScheduleGridWithModal from '@/components/ScheduleGridWithModal'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

const shift1 = {
  shiftId: 'shift-1',
  title: 'Morning load',
  location: 'North Dock',
  startLabel: '08:00',
  endLabel: '12:00',
  dateTimeLabel: 'Thu Apr 16, 2026, 8:00 AM - 12:00 PM',
  assigneeLabel: 'Alice',
  assignedUserId: 'user-alice',
  isMine: false,
  isOpen: false,
}

const openShift = {
  shiftId: 'shift-2',
  title: 'Evening load',
  location: 'North Dock',
  startLabel: '16:00',
  endLabel: '20:00',
  dateTimeLabel: 'Thu Apr 16, 2026, 4:00 PM - 8:00 PM',
  assigneeLabel: 'Open',
  assignedUserId: null,
  isMine: false,
  isOpen: true,
}

const baseDay = {
  key: '2026-04-16',
  dateIso: '2026-04-16',
  dayNumber: 16,
  isToday: true,
  isCurrentMonth: true,
  shiftCount: 1,
  visibleShifts: [shift1],
  hiddenShiftCount: 0,
  shifts: [shift1],
  dateLabel: 'Thursday, April 16',
}

const emptyDay = {
  ...baseDay,
  key: '2026-04-17',
  dateIso: '2026-04-17',
  dayNumber: 17,
  isToday: false,
  shiftCount: 0,
  visibleShifts: [],
  hiddenShiftCount: 0,
  shifts: [],
  dateLabel: 'Friday, April 17',
}

describe('ScheduleGridWithModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the selected day details and shows shift actions for managers', async () => {
    const user = userEvent.setup()

    render(
      <ScheduleGridWithModal
        weekdayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
        selectedView="week"
        dayEntries={[baseDay]}
        canManageStaff
        staffOptions={[]}
        returnView="week"
        returnDate="2026-04-16"
      />,
    )

    await user.click(screen.getByRole('button', { name: /16 1 shift Alice 08:00.*12:00/i }))

    expect(screen.getByRole('heading', { name: 'Thursday, April 16' })).toBeInTheDocument()
    expect(screen.getAllByText(/Alice/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute(
      'href',
      '/admin?openShiftId=shift-1#upcoming-shifts',
    )
  })

  it('renders an inline assign form on open shifts for admins', async () => {
    const user = userEvent.setup()
    const assignShiftAction = vi.fn()

    const openDay = {
      ...baseDay,
      shiftCount: 1,
      visibleShifts: [openShift],
      shifts: [openShift],
    }

    render(
      <ScheduleGridWithModal
        weekdayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
        selectedView="week"
        dayEntries={[openDay]}
        canManageStaff
        staffOptions={[{ id: 'user-bob', name: 'Bob', role: 'employee' }]}
        returnView="week"
        returnDate="2026-04-16"
        assignShiftAction={assignShiftAction}
      />,
    )

    await user.click(screen.getByRole('button', { name: /16 1 shift Open 16:00.*20:00/i }))
    expect(screen.getByRole('heading', { name: 'Thursday, April 16' })).toBeInTheDocument()

    // Inline assign form is present with the expected shift id and staff options
    const select = screen.getByLabelText('Assign to') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    const optionValues = Array.from(select.options).map((o) => o.value)
    expect(optionValues).toContain('user-bob')

    const form = select.closest('form')
    expect(form).not.toBeNull()
    const shiftInput = form!.querySelector('input[name="shiftId"]') as HTMLInputElement
    expect(shiftInput.value).toBe('shift-2')
    expect(screen.getByRole('button', { name: 'Fill' })).toBeInTheDocument()
  })

  it('does not render the inline assign form when the user cannot manage staff', async () => {
    const user = userEvent.setup()

    const openDay = {
      ...baseDay,
      shiftCount: 1,
      visibleShifts: [openShift],
      shifts: [openShift],
    }

    render(
      <ScheduleGridWithModal
        weekdayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
        selectedView="week"
        dayEntries={[openDay]}
        canManageStaff={false}
        staffOptions={[{ id: 'user-bob', name: 'Bob', role: 'employee' }]}
        returnView="week"
        returnDate="2026-04-16"
      />,
    )

    await user.click(screen.getByRole('button', { name: /16 1 shift Open 16:00.*20:00/i }))
    expect(screen.queryByLabelText('Assign to')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fill' })).not.toBeInTheDocument()
  })

  it('shows the empty state for a day without shifts', async () => {
    const user = userEvent.setup()

    render(
      <ScheduleGridWithModal
        weekdayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
        selectedView="month"
        dayEntries={[emptyDay]}
        canManageStaff={false}
        staffOptions={[]}
        returnView="month"
        returnDate="2026-04-17"
      />,
    )

    await user.click(screen.getByRole('button', { name: '17' }))

    expect(screen.getByText('No shifts for this day yet.')).toBeInTheDocument()
    expect(screen.getAllByText('No shifts scheduled.').length).toBeGreaterThan(0)
  })
})
