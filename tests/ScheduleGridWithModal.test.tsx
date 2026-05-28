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
  startMinute: 16 * 60,
  endMinute: 20 * 60,
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

  it('opens a single-shift popup when a shift tile is clicked', async () => {
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

    const tiles = screen.getAllByRole('button', { name: /Alice 08:00.*12:00/i })
    await user.click(tiles[0])

    // Popup shows the shift date eyebrow and assignee heading
    expect(screen.getAllByText('Thursday, April 16').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Alice/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Edit time/i })).toHaveAttribute(
      'href',
      '/admin?openShiftId=shift-1#upcoming-shifts',
    )
  })

  it('renders the inline assign form on open shifts for admins', async () => {
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

    const tiles = screen.getAllByRole('button', { name: /Open · needs staff 16:00.*20:00/i })
    await user.click(tiles[0])

    const select = screen.getByLabelText('Assign to') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(Array.from(select.options).map((o) => o.value)).toContain('user-bob')

    const form = select.closest('form')
    expect(form).not.toBeNull()
    const shiftInput = form!.querySelector('input[name="shiftId"]') as HTMLInputElement
    expect(shiftInput.value).toBe('shift-2')
    expect(screen.getByRole('button', { name: 'Fill' })).toBeInTheDocument()
  })

  it('disables staff who are unavailable for the selected shift window', async () => {
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
        canManageStaff
        staffOptions={[
          { id: 'user-alice', name: 'Alice', role: 'employee' },
          {
            id: 'user-bob',
            name: 'Bob',
            role: 'employee',
            unavailableWindows: [{
              startDate: '2026-04-16',
              endDate: '2026-04-16',
              unavailableStartMinute: 16 * 60,
              unavailableEndMinute: 20 * 60,
              reason: null,
            }],
          } as any,
        ]}
        returnView="week"
        returnDate="2026-04-16"
        assignShiftAction={vi.fn()}
      />,
    )

    const tiles = screen.getAllByRole('button', { name: /Open · needs staff 16:00.*20:00/i })
    await user.click(tiles[0])

    const select = screen.getByLabelText('Assign to') as HTMLSelectElement
    const aliceOption = screen.getByRole('option', { name: 'Alice (employee)' }) as HTMLOptionElement
    const bobOption = screen.getByRole('option', { name: 'Bob (employee) - On vacation' }) as HTMLOptionElement

    expect(Array.from(select.options).map((option) => option.value)).toEqual(['', 'user-alice', 'user-bob'])
    expect(aliceOption.disabled).toBe(false)
    expect(bobOption.disabled).toBe(true)
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

    const tiles = screen.getAllByRole('button', { name: /Open · needs staff 16:00.*20:00/i })
    await user.click(tiles[0])
    expect(screen.queryByLabelText('Assign to')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fill' })).not.toBeInTheDocument()
  })

  it('renders an empty day without opening anything when there are no shifts', () => {
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

    // No shift tiles exist for the empty day on mobile or desktop
    expect(screen.queryByRole('button', { name: /08:00|16:00/ })).not.toBeInTheDocument()
    // Mobile empty-state message is rendered
    expect(screen.getAllByText('No shifts scheduled.').length).toBeGreaterThan(0)
  })

  it('shows the add-shift button for admins when a create action is provided', () => {
    render(
      <ScheduleGridWithModal
        weekdayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
        selectedView="week"
        dayEntries={[baseDay]}
        canManageStaff
        staffOptions={[]}
        returnView="week"
        returnDate="2026-04-16"
        createShiftAction={vi.fn()}
      />,
    )

    // Mobile renders a labelled "Add shift" button; desktop renders an icon button
    expect(screen.getAllByRole('button', { name: /Add shift/i }).length).toBeGreaterThan(0)
  })
})
