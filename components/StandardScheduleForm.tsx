import { Button } from '@/components/ui/button'
import { DatePickerField, TimePickerField } from '@/components/ui/date-time-picker'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import { STANDARD_SCHEDULE_DEFAULTS, STANDARD_SCHEDULE_HORIZON_DAYS } from '@/lib/standardSchedule'

type StaffOption = { id: string; name: string; role: string }

type StandardScheduleFormProps = {
  staffOptions: StaffOption[]
  todayIso: string
  applyAction: (formData: FormData) => Promise<void> | void
  clearAction: (formData: FormData) => Promise<void> | void
}

const HORIZON_YEARS = Math.round(STANDARD_SCHEDULE_HORIZON_DAYS / 365)

export default function StandardScheduleForm({
  staffOptions,
  todayIso,
  applyAction,
  clearAction,
}: StandardScheduleFormProps) {
  return (
    <div className="space-y-8">
      <form action={applyAction} className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Apply standard schedule</h3>
          <p className="text-xs text-muted-foreground">
            Generates the next {HORIZON_YEARS} years of shifts using the times below. Safe to
            re-run &mdash; existing shifts with matching times aren&rsquo;t duplicated.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="std-assignedUserId" className="text-sm font-medium">Assign to</label>
          <select
            id="std-assignedUserId"
            name="assignedUserId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">Unassigned</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({staff.role})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="std-startDate" className="text-sm font-medium">Start date</label>
          <DatePickerField id="std-startDate" name="startDate" defaultValue={todayIso} required />
        </div>

        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Weekday shifts (Mon&ndash;Fri)</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="std-weekday1Start" className="text-xs font-medium">Morning start</label>
              <TimePickerField
                id="std-weekday1Start"
                name="weekday1Start"
                defaultValue={STANDARD_SCHEDULE_DEFAULTS.weekday[0].start}
                max="19:59"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="std-weekday1End" className="text-xs font-medium">Morning end</label>
              <TimePickerField
                id="std-weekday1End"
                name="weekday1End"
                defaultValue={STANDARD_SCHEDULE_DEFAULTS.weekday[0].end}
                max="20:00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="std-weekday2Start" className="text-xs font-medium">Evening start</label>
              <TimePickerField
                id="std-weekday2Start"
                name="weekday2Start"
                defaultValue={STANDARD_SCHEDULE_DEFAULTS.weekday[1].start}
                max="19:59"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="std-weekday2End" className="text-xs font-medium">Evening end</label>
              <TimePickerField
                id="std-weekday2End"
                name="weekday2End"
                defaultValue={STANDARD_SCHEDULE_DEFAULTS.weekday[1].end}
                max="20:00"
                required
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Weekend shifts (Sat&ndash;Sun)</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="std-weekend1Start" className="text-xs font-medium">Morning start</label>
              <TimePickerField
                id="std-weekend1Start"
                name="weekend1Start"
                defaultValue={STANDARD_SCHEDULE_DEFAULTS.weekend[0].start}
                max="19:59"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="std-weekend1End" className="text-xs font-medium">Morning end</label>
              <TimePickerField
                id="std-weekend1End"
                name="weekend1End"
                defaultValue={STANDARD_SCHEDULE_DEFAULTS.weekend[0].end}
                max="20:00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="std-weekend2Start" className="text-xs font-medium">Evening start</label>
              <TimePickerField
                id="std-weekend2Start"
                name="weekend2Start"
                defaultValue={STANDARD_SCHEDULE_DEFAULTS.weekend[1].start}
                max="19:59"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="std-weekend2End" className="text-xs font-medium">Evening end</label>
              <TimePickerField
                id="std-weekend2End"
                name="weekend2End"
                defaultValue={STANDARD_SCHEDULE_DEFAULTS.weekend[1].end}
                max="20:00"
                required
              />
            </div>
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="std-status" className="text-sm font-medium">Status</label>
          <select
            id="std-status"
            name="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue="published"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <label className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm">
          <input
            type="checkbox"
            name="replaceMismatched"
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="font-medium">Replace overlapping unassigned shifts</span>
            <span className="block text-xs text-muted-foreground">
              Tick this when you&rsquo;re changing the times. Any unassigned shift in the next
              5 years whose times don&rsquo;t match these will be deleted before new ones are
              added. Assigned shifts are never touched.
            </span>
          </span>
        </label>

        <p className="text-xs text-muted-foreground">Store closes at 8:00 PM. Shifts must end by 8:00 PM.</p>

        <div className="flex justify-end pt-2">
          <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">
            Apply Standard Schedule
          </Button>
        </div>
      </form>

      <div className="border-t pt-6">
        <form action={clearAction} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Clear future shifts</h3>
            <p className="text-xs text-muted-foreground">
              Removes every <strong>unassigned</strong>, non-cancelled shift from this date
              onward. Assigned shifts are left alone &mdash; edit those one at a time. Use this
              before re-applying when the norm changes.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="std-clearFromDate" className="text-sm font-medium">From date</label>
            <DatePickerField id="std-clearFromDate" name="cutoffDate" defaultValue={todayIso} required />
          </div>

          <div className="flex justify-end">
            <ConfirmSubmitButton
              type="submit"
              variant="outline"
              confirmMessage="Delete every unassigned future shift from the selected date onward? Assigned shifts will be kept."
            >
              Clear unassigned future shifts
            </ConfirmSubmitButton>
          </div>
        </form>
      </div>
    </div>
  )
}
