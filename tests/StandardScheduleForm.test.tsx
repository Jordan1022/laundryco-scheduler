import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import StandardScheduleForm from '@/components/StandardScheduleForm'

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
      data-testid={`date-${name}`}
    />
  ),
  TimePickerField: ({ id, name, required, defaultValue }: PickerProps) => (
    <input
      type="time"
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue}
      data-testid={`time-${name}`}
    />
  ),
}))

const noopAction = () => {}

const staffOptions = [
  { id: 'u1', name: 'Alice', role: 'employee' },
  { id: 'u2', name: 'Bob', role: 'manager' },
]

function renderForm() {
  return render(
    <StandardScheduleForm
      staffOptions={staffOptions}
      todayIso="2026-04-21"
      applyAction={noopAction}
      clearAction={noopAction}
    />,
  )
}

describe('StandardScheduleForm', () => {
  it('renders both Apply and Clear sections with Goodly defaults', () => {
    renderForm()

    expect(screen.getByRole('heading', { name: 'Apply standard schedule' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Clear future shifts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply Standard Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear unassigned future shifts' })).toBeInTheDocument()

    expect(screen.getByTestId('date-startDate')).toHaveValue('2026-04-21')
    expect(screen.getByTestId('date-cutoffDate')).toHaveValue('2026-04-21')

    expect(screen.getByTestId('time-weekday1Start')).toHaveValue('10:00')
    expect(screen.getByTestId('time-weekday1End')).toHaveValue('16:00')
    expect(screen.getByTestId('time-weekday2Start')).toHaveValue('16:00')
    expect(screen.getByTestId('time-weekday2End')).toHaveValue('20:00')

    expect(screen.getByTestId('time-weekend1Start')).toHaveValue('12:00')
    expect(screen.getByTestId('time-weekend1End')).toHaveValue('16:00')
    expect(screen.getByTestId('time-weekend2Start')).toHaveValue('16:00')
    expect(screen.getByTestId('time-weekend2End')).toHaveValue('20:00')
  })

  it('shows Unassigned plus every passed staff option in the assignee select', () => {
    renderForm()

    const select = screen.getByLabelText('Assign to') as HTMLSelectElement
    const options = within(select).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Unassigned', 'Alice (employee)', 'Bob (manager)'])
    expect(select.value).toBe('')
  })

  it('includes the "Replace overlapping unassigned shifts" checkbox, unchecked by default', () => {
    renderForm()

    const checkbox = screen.getByRole('checkbox', { name: /Replace overlapping unassigned shifts/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
    expect(checkbox).toHaveAttribute('name', 'replaceMismatched')
  })

  it('routes each form to the right action', () => {
    const applyAction = vi.fn()
    const clearAction = vi.fn()
    render(
      <StandardScheduleForm
        staffOptions={staffOptions}
        todayIso="2026-04-21"
        applyAction={applyAction}
        clearAction={clearAction}
      />,
    )

    const applyForm = screen.getByRole('button', { name: 'Apply Standard Schedule' }).closest('form')
    const clearForm = screen.getByRole('button', { name: 'Clear unassigned future shifts' }).closest('form')

    expect(applyForm).not.toBeNull()
    expect(clearForm).not.toBeNull()
    expect(applyForm).not.toBe(clearForm)
  })
})
