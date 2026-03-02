import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'dotenv'

const cwd = process.cwd()
const envPath = path.join(cwd, '.env')
const envLocalPath = path.join(cwd, '.env.local')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  return parse(fs.readFileSync(filePath, 'utf8'))
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isPlaceholderValue(value) {
  if (!hasValue(value)) return false
  const normalized = value.trim().toLowerCase()
  const exactPlaceholders = new Set([
    '...',
    'your-secret',
    'your_secret',
    'changeme',
    'change-me',
    'replace-me',
    'replace_this',
    'example',
    'example-value',
  ])

  if (exactPlaceholders.has(normalized)) return true
  if (normalized.includes('your-secret')) return true
  if (normalized.includes('replace')) return true
  if (normalized.includes('changeme')) return true
  if (normalized === '+1234567890') return true
  if (normalized === 'postgresql://...' || normalized === 'postgres://...') return true
  return false
}

function readEnv() {
  const base = loadEnvFile(envPath)
  const local = loadEnvFile(envLocalPath)
  return {
    values: {
      ...base,
      ...local,
      ...process.env,
    },
    inFiles: new Set([...Object.keys(base), ...Object.keys(local)]),
  }
}

function main() {
  const { values, inFiles } = readEnv()
  const issues = []
  const warnings = []
  const ok = []

  const requireKey = (key, validate) => {
    const value = values[key]
    if (!hasValue(value)) {
      issues.push(`Missing required var: ${key}`)
      return
    }
    if (isPlaceholderValue(value)) {
      issues.push(`Placeholder value detected for required var: ${key}`)
      return
    }
    if (validate && !validate(value)) {
      issues.push(`Invalid format for ${key}`)
      return
    }
    ok.push(key)
  }

  requireKey('DATABASE_URL', (value) => /^postgres(ql)?:\/\//i.test(value))
  requireKey('NEXTAUTH_SECRET', (value) => value.length >= 32)
  requireKey('NEXTAUTH_URL', (value) => /^https?:\/\//i.test(value))

  if (hasValue(values.NEXTAUTH_URL) && /^http:\/\/localhost(?::\d+)?$/i.test(values.NEXTAUTH_URL)) {
    warnings.push('NEXTAUTH_URL is set to localhost. This is fine for local dev but should be a real domain in production.')
  }

  const resendApiKey = values.RESEND_API_KEY
  const resendFromEmail = values.RESEND_FROM_EMAIL
  if (hasValue(resendApiKey) || hasValue(resendFromEmail)) {
    if (!hasValue(resendApiKey) || isPlaceholderValue(resendApiKey)) {
      warnings.push('Email notifications are partially configured: RESEND_API_KEY is missing or placeholder.')
    }
    if (!hasValue(resendFromEmail) || isPlaceholderValue(resendFromEmail)) {
      warnings.push('Email notifications are partially configured: RESEND_FROM_EMAIL is missing or placeholder.')
    }
    if (hasValue(resendApiKey) && hasValue(resendFromEmail) && !isPlaceholderValue(resendApiKey) && !isPlaceholderValue(resendFromEmail)) {
      ok.push('RESEND_API_KEY')
      ok.push('RESEND_FROM_EMAIL')
    }
  } else {
    warnings.push('Email notifications are disabled until RESEND_API_KEY and RESEND_FROM_EMAIL are set.')
  }

  const vapidPublic = values.VAPID_PUBLIC_KEY || values.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = values.VAPID_PRIVATE_KEY
  if (hasValue(vapidPublic) || hasValue(vapidPrivate)) {
    if (!hasValue(vapidPublic) || isPlaceholderValue(vapidPublic)) {
      warnings.push('Push notifications are partially configured: set VAPID_PUBLIC_KEY or NEXT_PUBLIC_VAPID_PUBLIC_KEY.')
    }
    if (!hasValue(vapidPrivate) || isPlaceholderValue(vapidPrivate)) {
      warnings.push('Push notifications are partially configured: VAPID_PRIVATE_KEY is missing or placeholder.')
    }
    if (hasValue(vapidPublic) && hasValue(vapidPrivate) && !isPlaceholderValue(vapidPublic) && !isPlaceholderValue(vapidPrivate)) {
      ok.push('VAPID keys')
    }
  } else {
    warnings.push('Push notifications are disabled until VAPID keys are set.')
  }

  const maybeUnusedKeys = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']
  for (const key of maybeUnusedKeys) {
    const value = values[key]
    if (!hasValue(value)) continue
    warnings.push(`${key} is set but currently unused by this codebase.`)
  }

  if (!fs.existsSync(envPath) && !fs.existsSync(envLocalPath)) {
    issues.push('Neither .env nor .env.local exists.')
  }

  console.log('Environment Check')
  console.log(`- Loaded files: ${fs.existsSync(envPath) ? '.env ' : ''}${fs.existsSync(envLocalPath) ? '.env.local' : ''}`.trim())
  if (ok.length > 0) {
    console.log(`- Healthy config: ${[...new Set(ok)].join(', ')}`)
  }
  if (issues.length > 0) {
    console.log('\nBlocking issues:')
    for (const issue of issues) {
      console.log(`- ${issue}`)
    }
  }
  if (warnings.length > 0) {
    console.log('\nWarnings:')
    for (const warning of warnings) {
      console.log(`- ${warning}`)
    }
  }
  if (issues.length === 0 && warnings.length === 0) {
    console.log('\nNo issues found.')
  }

  if (inFiles.size === 0) {
    console.log('\nNote: no project env keys detected in .env/.env.local; values may be coming from shell environment.')
  }

  process.exitCode = issues.length > 0 ? 1 : 0
}

main()
