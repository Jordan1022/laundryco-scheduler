import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import RecurringAssignmentsForm from '@/components/RecurringAssignmentsForm'

type PickerProps = {
  id: string
  name: string
  required?: boolean
  defaultValue?: string
}

vi.mock('@/components/ui/date-time-picker', () => ({
  DatePickerField: ({ id, name, required, defaultValue }: PickerProps) => (
    <input
      type="date"
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue}
      data-testid={`date-${id}`}
    />
  ),
  TimePickerField: ({ id, name, required, defaultValue }: PickerProps) => (
    <input
      type="time"
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue}
      data-testid={`time-${id}`}
    />
  ),
}))

const noop = () => {}
const staffOptions = [
  { id: 'u1', name: 'Alice', role: 'employee' },
  { id: 'u2', name: 'Bob', role: 'manager' },
]

function renderForm() {
  return render(
    <RecurringAssignmentsForm
      staffOptions={staffOptions}
      todayIso="2026-04-21"
      assignAction={noop}
      unassignAction={noop}
    />,
  )
}

describe('RecurringAssignmentsForm', () => {
  it('renders both Assign and Unassign sections with default times', () => {
    renderForm()

    expect(screen.getByRole('heading', { name: 'Assign to a recurring pattern' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Remove a recurring assignment' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign to recurring pattern' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove recurring assignments' })).toBeInTheDocument()

    expect(screen.getByTestId('time-rec-assign-startTime')).toHaveValue('16:00')
    expect(screen.getByTestId('time-rec-assign-endTime')).toHaveValue('20:00')
    expect(screen.getByTestId('time-rec-unassign-startTime')).toHaveValue('16:00')
    expect(screen.getByTestId('time-rec-unassign-endTime')).toHaveValue('20:00')

    expect(screen.getByTestId('date-rec-assign-startDate')).toHaveValue('2026-04-21')
    expect(screen.getByTestId('date-rec-unassign-startDate')).toHaveValue('2026-04-21')
  })

  it('shows every staff option in both assignee selects, with no default selected', () => {
    renderForm()
    const [assignSelect, unassignSelect] = screen.getAllByLabelText(/Assignee|Person/i) as HTMLSelectElement[]

    for (const select of [assignSelect, unassignSelect]) {
      const options = within(select).getAllByRole('option').map((o) => o.textContent)
      expect(options).toEqual(['Pick a person', 'Alice (employee)', 'Bob (manager)'])
      expect(select.value).toBe('')
      expect(select).toBeRequired()
    }
  })

  it('renders 7 weekday checkboxes for each section, all unchecked', () => {
    renderForm()
    const boxes = screen.getAllByRole('checkbox')
    // 7 Assign + 7 Unassign = 14 checkboxes.
    expect(boxes).toHaveLength(14)
    for (const box of boxes) {
      expect(box).not.toBeChecked()
      expect(box).toHaveAttribute('name', 'daysOfWeek')
    }
  })

  it('routes each form to the right action', () => {
    const assignAction = vi.fn()
    const unassignAction = vi.fn()
    render(
      <RecurringAssignmentsForm
        staffOptions={staffOptions}
        todayIso="2026-04-21"
        assignAction={assignAction}
        unassignAction={unassignAction}
      />,
    )

    const assignForm = screen.getByRole('button', { name: 'Assign to recurring pattern' }).closest('form')
    const unassignForm = screen.getByRole('button', { name: 'Remove recurring assignments' }).closest('form')

    expect(assignForm).not.toBeNull()
    expect(unassignForm).not.toBeNull()
    expect(assignForm).not.toBe(unassignForm)
  })
})
