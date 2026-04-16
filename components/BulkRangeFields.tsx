'use client'

import { useState } from 'react'
import { DatePickerField } from '@/components/ui/date-time-picker'

type BulkRangeFieldsProps = {
  defaultRangePreset?: 'week' | 'month' | 'custom'
}

export default function BulkRangeFields({
  defaultRangePreset = 'week',
}: BulkRangeFieldsProps) {
  const [rangePreset, setRangePreset] = useState<'week' | 'month' | 'custom'>(defaultRangePreset)
  const usesCustomEndDate = rangePreset === 'custom'

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="bulk-rangePreset" className="text-sm font-medium">Range</label>
        <select
          id="bulk-rangePreset"
          name="rangePreset"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={rangePreset}
          onChange={(event) => setRangePreset(event.target.value as 'week' | 'month' | 'custom')}
        >
          <option value="week">1 week</option>
          <option value="month">1 month</option>
          <option value="custom">Custom end date</option>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="bulk-endDate" className="text-sm font-medium">Custom End Date</label>
        <DatePickerField
          id="bulk-endDate"
          name="endDate"
          disabled={!usesCustomEndDate}
          required={usesCustomEndDate}
        />
        <p className="text-xs text-muted-foreground">
          {usesCustomEndDate
            ? 'Set the last day to generate shifts. Keep the full range within 93 days.'
            : 'Choose "Custom end date" in Range to unlock this field.'}
        </p>
      </div>
    </>
  )
}
