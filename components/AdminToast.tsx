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
  'onboarding-sent': { tone: 'success', message: 'Onboarding email sent.' },
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
  'assignee-unavailable': 'That person has approved time off during this shift.',
  'standard-missing-fields': 'Start date and every shift time are required.',
  'standard-invalid-time': 'Each shift’s end time must be after its start time.',
  'standard-after-hours': 'Store closes at 8:00 PM. All shifts must end by 8:00 PM.',
  'standard-invalid-assignee': 'The selected staff member does not exist or is inactive.',
  'standard-no-shifts': 'No shifts were generated. Check the times and try again.',
  'clear-missing-date': 'Pick a date to clear from.',
  'recurring-missing-fields': 'Pick a person, at least one day, a time block, and a start date.',
  'recurring-no-days': 'Pick at least one day of the week.',
  'recurring-invalid-time': 'End time must be after start time.',
  'recurring-after-hours': 'Store closes at 8:00 PM. Shift end must be 8:00 PM or earlier.',
  'recurring-invalid-user': 'The selected staff member does not exist or is inactive.',
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
  'onboarding-not-found': 'That staff account no longer exists.',
  'onboarding-email-not-configured': 'Email isn’t configured yet (RESEND_API_KEY / RESEND_FROM_EMAIL), so the onboarding email was not delivered.',
  'onboarding-send-failed': 'The onboarding email could not be delivered. Try again, or check Resend logs.',
  'onboarding-bulk-empty': 'No staff need an onboarding email right now. Tick “Include already-onboarded” to resend anyway.',
}

type AdminToastProps = {
  status?: string
  error?: string
  count?: number
  replaced?: number
  conflicts?: number
  skipped?: number
  recurringAssigned?: number
  onboardingSent?: number
  onboardingFailed?: number
  dismissHref: string
}

export default function AdminToast({ status, error, count, replaced, conflicts, skipped, recurringAssigned, onboardingSent, onboardingFailed, dismissHref }: AdminToastProps) {
  let cfg: ToastConfig | null = null

  if (error && ERROR_MESSAGES[error]) {
    cfg = { tone: 'error', message: ERROR_MESSAGES[error] }
  } else if (status === 'shift-updated') {
    const r = recurringAssigned ?? 0
    cfg = r > 0
      ? {
          tone: 'success',
          message: `Shift updated. Also assigned to ${r} future matching shift${r === 1 ? '' : 's'}.`,
        }
      : { tone: 'success', message: 'Shift updated.' }
  } else if (status === 'standard-applied') {
    const n = count ?? 0
    const r = replaced ?? 0
    const c = conflicts ?? 0
    const parts: string[] = []
    if (n > 0) parts.push(`${n} new shifts created`)
    if (r > 0) parts.push(`${r} overlapping unassigned shifts replaced`)
    const body = parts.length > 0
      ? `Applied standard schedule: ${parts.join(', ')}.`
      : 'No new shifts added — the schedule already covers this window.'
    if (c > 0) {
      cfg = {
        tone: 'warning',
        message: `${body} ${c} unassigned shift${c === 1 ? '' : 's'} with different times will overlap — tick “Replace overlapping unassigned shifts” and Apply again, or use Clear to remove them.`,
      }
    } else if (n === 0 && r === 0) {
      cfg = { tone: 'info', message: body }
    } else {
      cfg = { tone: 'success', message: body }
    }
  } else if (status === 'future-cleared') {
    const n = count ?? 0
    cfg = n === 0
      ? { tone: 'info', message: 'No unassigned future shifts to clear.' }
      : { tone: 'warning', message: `Cleared ${n} unassigned future shifts.` }
  } else if (status === 'recurring-assigned') {
    const n = count ?? 0
    const s = skipped ?? 0
    const body = n === 0
      ? 'No unassigned matching shifts found.'
      : `Assigned to ${n} recurring shift${n === 1 ? '' : 's'}.`
    if (s > 0) {
      cfg = {
        tone: n === 0 ? 'info' : 'warning',
        message: `${body} ${s} matching shift${s === 1 ? ' was' : 's were'} already assigned to someone else and ${s === 1 ? 'was' : 'were'} skipped.`,
      }
    } else {
      cfg = { tone: n === 0 ? 'info' : 'success', message: body }
    }
  } else if (status === 'recurring-unassigned') {
    const n = count ?? 0
    cfg = n === 0
      ? { tone: 'info', message: 'No matching recurring assignments to remove.' }
      : { tone: 'warning', message: `Removed ${n} recurring assignment${n === 1 ? '' : 's'}.` }
  } else if (status === 'onboarding-bulk-sent') {
    const sent = onboardingSent ?? 0
    const failed = onboardingFailed ?? 0
    if (sent === 0 && failed === 0) {
      cfg = { tone: 'info', message: 'No onboarding emails to send.' }
    } else if (failed === 0) {
      cfg = { tone: 'success', message: `Sent onboarding emails to ${sent} staff member${sent === 1 ? '' : 's'}.` }
    } else if (sent === 0) {
      cfg = { tone: 'error', message: `Could not send any onboarding emails (${failed} failed).` }
    } else {
      cfg = {
        tone: 'warning',
        message: `Sent ${sent} onboarding email${sent === 1 ? '' : 's'}. ${failed} failed — check the staff list and retry individually.`,
      }
    }
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
