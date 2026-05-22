'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DatePickerField } from '@/components/ui/date-time-picker'
import { TicketCard, Stamp } from '@/components/ui/TicketCard'
import { listTimeOffPresets, type TimeOffPresetKey } from '@/lib/timeOff'
import { serverActionFormProps } from '@/lib/serverActionForm'

type DashboardView = 'week' | 'month'

const REASON_MAX_LENGTH = 500

export type SubmittedTimeOffRequest = {
  id: string
  dateRangeLabel: string
  windowLabel: string
  status: 'pending' | 'approved'
  submittedAtLabel: string
}

type TimeOffRequestFormProps = {
  defaultDate: string
  returnView: DashboardView
  returnDate: string
  formAction: (formData: FormData) => Promise<void> | void
  submittedRequests: SubmittedTimeOffRequest[]
}

function statusTone(status: SubmittedTimeOffRequest['status']) {
  return status === 'approved' ? 'sage' : 'muted'
}

function statusLabel(status: SubmittedTimeOffRequest['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function TimeOffRequestForm({
  defaultDate,
  returnView,
  returnDate,
  formAction,
  submittedRequests,
}: TimeOffRequestFormProps) {
  const [startDate, setStartDate] = useState(defaultDate)
  const [endDate, setEndDate] = useState(defaultDate)
  const [preset, setPreset] = useState<TimeOffPresetKey>('all_day')
  const presetOptions = listTimeOffPresets()

  return (
    <div className="space-y-5">
      <form {...serverActionFormProps(formAction)} className="space-y-4">
        <input type="hidden" name="returnView" value={returnView} />
        <input type="hidden" name="returnDate" value={returnDate} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="startDate" className="stamp text-ink/60">From</label>
            <DatePickerField
              id="startDate"
              name="startDate"
              value={startDate}
              ariaLabel="From"
              required
              onChange={(event) => {
                const nextDate = event.currentTarget.value
                setStartDate(nextDate)
                setEndDate(nextDate)
              }}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="endDate" className="stamp text-ink/60">Through</label>
            <DatePickerField
              id="endDate"
              name="endDate"
              value={endDate}
              min={startDate}
              ariaLabel="Through"
              required
              onChange={(event) => {
                const nextDate = event.currentTarget.value
                setEndDate(nextDate && nextDate < startDate ? startDate : nextDate)
              }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="preset" className="stamp text-ink/60">Unavailable for</label>
          <select
            id="preset"
            name="preset"
            value={preset}
            onChange={(event) => setPreset(event.currentTarget.value as TimeOffPresetKey)}
            className="flex h-10 w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
            required
          >
            {presetOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <p className="text-xs text-ink-muted">
            Use early or late shift when you can work the other half of the day.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="reason" className="stamp text-ink/60">Reason (optional)</label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            className="flex w-full rounded-sm border border-ink/20 bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
            placeholder="Vacation, appointment, personal day…"
          />
        </div>
        <Button type="submit" className="w-full">Submit time-off slip</Button>
      </form>

      <div className="border-t border-dashed border-ink/15 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="stamp text-ink/60">Your submitted slips</p>
          <Stamp tone="muted">{submittedRequests.length}</Stamp>
        </div>
        {submittedRequests.length === 0 ? (
          <p className="text-sm text-ink-muted">No pending or approved time-off slips yet.</p>
        ) : (
          <div className="space-y-2">
            {submittedRequests.map((request) => (
              <TicketCard key={request.id} tone="paper" className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{request.dateRangeLabel}</p>
                    <p className="mt-1 text-xs text-ink-muted">{request.windowLabel}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/50">
                      Submitted {request.submittedAtLabel}
                    </p>
                  </div>
                  <Stamp tone={statusTone(request.status)}>{statusLabel(request.status)}</Stamp>
                </div>
              </TicketCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
