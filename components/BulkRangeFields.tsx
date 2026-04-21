'use client'

import { useState } from 'react'
import { DatePickerField } from '@/components/ui/date-time-picker'

type RangePreset = 'week' | 'month' | 'ongoing' | 'custom'

type BulkRangeFieldsProps = {
  defaultRangePreset?: RangePreset
}

export default function BulkRangeFields({
  defaultRangePreset = 'week',
}: BulkRangeFieldsProps) {
  const [rangePreset, setRangePreset] = useState<RangePreset>(defaultRangePreset)
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
          onChange={(event) => setRangePreset(event.target.value as RangePreset)}
        >
          <option value="week">1 week (7 days)</option>
          <option value="month">1 month (30 days)</option>
          <option value="ongoing">Ongoing (next 3 months)</option>
          <option value="custom">Custom end date</option>
        </select>
        <p className="text-xs text-muted-foreground">
          How far out from the start date to generate shifts. Shifts are created on the selected
          &ldquo;Repeat on&rdquo; weekdays within this window.
        </p>
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
