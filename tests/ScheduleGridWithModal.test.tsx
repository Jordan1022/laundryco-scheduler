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
  isMine: false,
  isOpen: false,
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
    expect(screen.getByRole('link', { name: 'View / Edit' })).toHaveAttribute(
      'href',
      '/admin?openShiftId=shift-1#upcoming-shifts',
    )
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
