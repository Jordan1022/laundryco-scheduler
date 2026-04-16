import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BulkRangeFields from '@/components/BulkRangeFields'

vi.mock('@/components/ui/date-time-picker', () => ({
  DatePickerField: ({ id, name, required, disabled }: { id: string; name: string; required?: boolean; disabled?: boolean }) => (
    <input id={id} name={name} required={required} disabled={disabled} />
  ),
}))

describe('BulkRangeFields', () => {
  it('keeps the custom end date disabled until custom range is selected', async () => {
    const user = userEvent.setup()

    render(<BulkRangeFields />)

    const endDate = screen.getByLabelText('Custom End Date')
    expect(endDate).toBeDisabled()
    expect(endDate).not.toBeRequired()

    await user.selectOptions(screen.getByLabelText('Range'), 'custom')

    expect(screen.getByLabelText('Custom End Date')).toBeEnabled()
    expect(screen.getByLabelText('Custom End Date')).toBeRequired()
  })
})
