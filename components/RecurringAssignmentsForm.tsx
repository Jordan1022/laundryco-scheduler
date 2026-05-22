import { Button } from '@/components/ui/button'
import { DatePickerField, TimePickerField } from '@/components/ui/date-time-picker'
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton'
import { serverActionFormProps } from '@/lib/serverActionForm'

type StaffOption = { id: string; name: string; role: string }

type RecurringAssignmentsFormProps = {
  staffOptions: StaffOption[]
  todayIso: string
  assignAction: (formData: FormData) => Promise<void> | void
  unassignAction: (formData: FormData) => Promise<void> | void
}

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const

function WeekdayCheckboxes({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((day) => (
        <label
          key={day.value}
          htmlFor={`${idPrefix}-day-${day.value}`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-card"
        >
          <input
            id={`${idPrefix}-day-${day.value}`}
            type="checkbox"
            name="daysOfWeek"
            value={day.value}
            className="h-4 w-4"
          />
          <span>{day.label}</span>
        </label>
      ))}
    </div>
  )
}

export default function RecurringAssignmentsForm({
  staffOptions,
  todayIso,
  assignAction,
  unassignAction,
}: RecurringAssignmentsFormProps) {
  return (
    <div className="space-y-8">
      <form {...serverActionFormProps(assignAction)} className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Assign to a recurring pattern</h3>
          <p className="text-xs text-muted-foreground">
            Make someone the default for every matching shift in the next 5 years. Already-assigned
            shifts are skipped &mdash; no silent overwrites.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="rec-assign-userId" className="text-sm font-medium">Assignee</label>
          <select
            id="rec-assign-userId"
            name="assignedUserId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue=""
            required
          >
            <option value="" disabled>Pick a person</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({staff.role})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Days of week</label>
          <WeekdayCheckboxes idPrefix="rec-assign" />
          <p className="text-xs text-muted-foreground">Pick at least one day.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="rec-assign-startTime" className="text-sm font-medium">Shift start</label>
            <TimePickerField
              id="rec-assign-startTime"
              name="startTime"
              defaultValue="16:00"
              max="19:59"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="rec-assign-endTime" className="text-sm font-medium">Shift end</label>
            <TimePickerField
              id="rec-assign-endTime"
              name="endTime"
              defaultValue="20:00"
              max="20:00"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="rec-assign-startDate" className="text-sm font-medium">From date</label>
          <DatePickerField id="rec-assign-startDate" name="startDate" defaultValue={todayIso} required />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" className="bg-[#1e3a8a] hover:bg-[#172b6d]">
            Assign to recurring pattern
          </Button>
        </div>
      </form>

      <div className="border-t pt-6">
        <form {...serverActionFormProps(unassignAction)} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Remove a recurring assignment</h3>
            <p className="text-xs text-muted-foreground">
              Removes this person&rsquo;s assignments on every matching shift from the date below.
              Shifts stay in the schedule but become unassigned.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rec-unassign-userId" className="text-sm font-medium">Person</label>
            <select
              id="rec-unassign-userId"
              name="assignedUserId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
              required
            >
              <option value="" disabled>Pick a person</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Days of week</label>
            <WeekdayCheckboxes idPrefix="rec-unassign" />
            <p className="text-xs text-muted-foreground">Pick at least one day.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="rec-unassign-startTime" className="text-sm font-medium">Shift start</label>
              <TimePickerField
                id="rec-unassign-startTime"
                name="startTime"
                defaultValue="16:00"
                max="19:59"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rec-unassign-endTime" className="text-sm font-medium">Shift end</label>
              <TimePickerField
                id="rec-unassign-endTime"
                name="endTime"
                defaultValue="20:00"
                max="20:00"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rec-unassign-startDate" className="text-sm font-medium">From date</label>
            <DatePickerField
              id="rec-unassign-startDate"
              name="startDate"
              defaultValue={todayIso}
              required
            />
          </div>

          <div className="flex justify-end">
            <ConfirmSubmitButton
              type="submit"
              variant="outline"
              confirmMessage="Remove this person's assignments on every matching shift from the chosen date?"
            >
              Remove recurring assignments
            </ConfirmSubmitButton>
          </div>
        </form>
      </div>
    </div>
  )
}
