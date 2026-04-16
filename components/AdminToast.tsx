import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type Tone = 'success' | 'warning' | 'error' | 'info'

type ToastConfig = {
  tone: Tone
  message: string
}

const STATUS_MESSAGES: Record<string, ToastConfig> = {
  'shift-created': { tone: 'success', message: 'Shift created.' },
  'shift-updated': { tone: 'success', message: 'Shift updated.' },
  'shift-cancelled': { tone: 'warning', message: 'Shift cancelled.' },
  'shift-restored': { tone: 'success', message: 'Shift restored to published.' },
  'schedule-published': { tone: 'success', message: 'Draft shifts were published.' },
  'schedule-no-drafts': { tone: 'info', message: 'No future draft shifts were available to publish.' },
  'timeoff-approved': { tone: 'success', message: 'Time-off request approved.' },
  'timeoff-denied': { tone: 'warning', message: 'Time-off request denied.' },
  'swap-approved': { tone: 'success', message: 'Shift swap approved and assignment updated.' },
  'swap-denied': { tone: 'warning', message: 'Shift swap denied.' },
  'staff-created': { tone: 'success', message: 'Staff account created.' },
  'staff-profile-updated': { tone: 'success', message: 'Staff profile updated.' },
  'staff-role-updated': { tone: 'success', message: 'Staff role updated.' },
  'staff-deactivated': { tone: 'warning', message: 'Staff account deactivated.' },
  'staff-reactivated': { tone: 'success', message: 'Staff account reactivated.' },
  'staff-password-reset': { tone: 'success', message: 'Staff password reset.' },
  'staff-deleted': { tone: 'warning', message: 'Staff account permanently deleted.' },
}

const ERROR_MESSAGES: Record<string, string> = {
  'missing-fields': 'Date, start time, and end time are required.',
  'invalid-time': 'End time must be after start time.',
  'after-hours': 'Store closes at 8:00 PM. Shifts must end by 8:00 PM.',
  'edit-missing-fields': 'Shift date, start time, and end time are required.',
  'edit-invalid-time': 'Shift end time must be after start time.',
  'edit-after-hours': 'Store closes at 8:00 PM. Shifts must end by 8:00 PM.',
  'invalid-shift': 'Shift not found or no longer editable.',
  'invalid-assignee': 'The selected assignee does not exist.',
  'bulk-missing-fields': 'Start date, start time, and end time are required.',
  'bulk-no-days-selected': 'Select at least one weekday to schedule.',
  'bulk-invalid-range': 'Date range is invalid. Set an end date on or after the start date.',
  'bulk-range-too-large': 'Bulk range is too large. Keep it to 93 days or fewer.',
  'bulk-invalid-time': 'End time must be after start time.',
  'bulk-after-hours': 'Store closes at 8:00 PM. Shifts must end by 8:00 PM.',
  'bulk-invalid-assignee': 'The selected staff member does not exist or is inactive.',
  'bulk-no-matching-days': 'No shifts matched the selected weekdays inside that range.',
  'invalid-review': 'Invalid review action submitted.',
  'request-not-found': 'That time-off request is no longer pending.',
  'swap-not-found': 'That swap request is no longer pending.',
  'assignment-not-found': 'The original assignment for this swap no longer exists.',
  'swap-conflict': 'Requested staff is already assigned to that shift.',
  'swap-target-inactive': 'Requested staff is inactive and cannot receive this shift.',
  'staff-missing-fields': 'Name, email, and password are required to create staff.',
  'staff-profile-missing-fields': 'Name and email are required to update a staff profile.',
  'staff-invalid-email': 'Staff email must be a valid email address.',
  'staff-password-too-short': 'Staff password must be at least 8 characters.',
  'staff-reset-password-too-short': 'Reset password must be at least 8 characters.',
  'staff-email-exists': 'A staff account with that email already exists.',
  'staff-invalid-role': 'Invalid staff role provided.',
  'staff-not-found': 'Staff account not found.',
  'staff-last-admin': 'You must keep at least one active admin account.',
  'staff-cannot-delete-self': 'You cannot delete your own account while signed in.',
  'staff-delete-requires-inactive': 'Deactivate this account first before deleting it permanently.',
}

type AdminToastProps = {
  status?: string
  error?: string
  count?: number
  dismissHref: string
}

export default function AdminToast({ status, error, count, dismissHref }: AdminToastProps) {
  let cfg: ToastConfig | null = null

  if (error && ERROR_MESSAGES[error]) {
    cfg = { tone: 'error', message: ERROR_MESSAGES[error] }
  } else if (status === 'bulk-shifts-created') {
    cfg = { tone: 'success', message: `Created ${count ?? 0} shifts.` }
  } else if (status && STATUS_MESSAGES[status]) {
    cfg = STATUS_MESSAGES[status]
  }

  if (!cfg) return null

  const toneClasses: Record<Tone, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-slate-200 bg-slate-50 text-slate-900',
  }

  const Icon =
    cfg.tone === 'success'
      ? CheckCircle2
      : cfg.tone === 'error' || cfg.tone === 'warning'
      ? AlertTriangle
      : Info

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm',
        toneClasses[cfg.tone],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{cfg.message}</p>
      <Link
        href={dismissHref}
        aria-label="Dismiss"
        className="rounded-md p-1 opacity-70 hover:bg-white/60 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </Link>
    </div>
  )
}
