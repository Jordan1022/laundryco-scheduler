import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DatePickerField,
  TimePickerField,
  parseISODateOnly,
  parseTimeValue,
} from '@/components/ui/date-time-picker'

describe('date-time picker parsing helpers', () => {
  it('parses a valid ISO date string at local midnight', () => {
    const parsed = parseISODateOnly('2026-04-16')

    expect(parsed).not.toBeNull()
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(3)
    expect(parsed?.getDate()).toBe(16)
    expect(parsed?.getHours()).toBe(0)
    expect(parsed?.getMinutes()).toBe(0)
  })

  it('rejects an invalid ISO date string', () => {
    expect(parseISODateOnly('2026-02-30')).toBeNull()
    expect(parseISODateOnly('not-a-date')).toBeNull()
  })

  it('parses a valid 24-hour time string', () => {
    const parsed = parseTimeValue('08:15')

    expect(parsed).not.toBeNull()
    expect(parsed?.getHours()).toBe(8)
    expect(parsed?.getMinutes()).toBe(15)
    expect(parsed?.getSeconds()).toBe(0)
  })

  it('rejects malformed time values', () => {
    expect(parseTimeValue('24:00')).toBeNull()
    expect(parseTimeValue('8:15')).toBeNull()
    expect(parseTimeValue('08:75')).toBeNull()
  })

  it('renders the date field as a native date input', () => {
    const { container } = render(
      <DatePickerField
        id="shift-date"
        name="shiftDate"
        defaultValue="2026-04-17"
        min="2026-04-01"
        max="2026-04-30"
        required
      />,
    )

    const input = screen.getByLabelText('Date picker')
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveAttribute('value', '2026-04-17')
    expect(input).toHaveAttribute('min', '2026-04-01')
    expect(input).toHaveAttribute('max', '2026-04-30')
    expect(input).toBeRequired()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('renders the time field as a native time input', () => {
    const { container } = render(
      <TimePickerField
        id="shift-start"
        name="startTime"
        defaultValue="08:15"
        min="06:00"
        max="20:00"
        timeIntervals={15}
        required
      />,
    )

    const input = screen.getByLabelText('Time picker')
    expect(input).toHaveAttribute('type', 'time')
    expect(input).toHaveAttribute('value', '08:15')
    expect(input).toHaveAttribute('min', '06:00')
    expect(input).toHaveAttribute('max', '20:00')
    expect(input).toHaveAttribute('step', '900')
    expect(input).toBeRequired()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('opens the date picker when clicking anywhere in the input', async () => {
    const user = userEvent.setup()
    render(<DatePickerField id="click-date" name="clickDate" />)

    const input = screen.getByLabelText('Date picker') as HTMLInputElement & { showPicker?: () => void }
    const showPickerSpy = vi.fn()
    input.showPicker = showPickerSpy

    await user.click(input)
    expect(showPickerSpy).toHaveBeenCalledTimes(1)
  })

  it('opens the time picker when clicking anywhere in the input', async () => {
    const user = userEvent.setup()
    render(<TimePickerField id="click-time" name="clickTime" />)

    const input = screen.getByLabelText('Time picker') as HTMLInputElement & { showPicker?: () => void }
    const showPickerSpy = vi.fn()
    input.showPicker = showPickerSpy

    await user.click(input)
    expect(showPickerSpy).toHaveBeenCalledTimes(1)
  })
})
