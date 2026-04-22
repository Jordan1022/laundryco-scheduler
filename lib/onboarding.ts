import { randomInt } from 'crypto'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { sendEmailWithResend } from '@/lib/resend'
import { renderOnboardingEmail, renderOnboardingEmailText } from '@/lib/email-template'

// Two short, memorable word lists. Chosen to avoid awkward or confusing pairings
// (no brand names, no ambiguous homophones). Together with two digits they yield
// roughly 8 * 10^5 combinations — plenty for a one-use temporary password.
const ADJECTIVES = [
  'Amber', 'Arctic', 'Atlas', 'Autumn', 'Bold', 'Brass', 'Brave', 'Bright',
  'Cedar', 'Citrus', 'Clever', 'Clover', 'Coastal', 'Comet', 'Cozy', 'Crimson',
  'Dusty', 'Eager', 'Ember', 'Field', 'Forest', 'Fresh', 'Gentle', 'Glacier',
  'Golden', 'Grand', 'Harbor', 'Honey', 'Humble', 'Indigo', 'Island', 'Ivory',
  'Jade', 'Jolly', 'Jovial', 'Kindly', 'Laurel', 'Lemon', 'Lively', 'Lucky',
  'Meadow', 'Merry', 'Misty', 'Moonlit', 'Noble', 'North', 'Olive', 'Orchid',
  'Pebble', 'Plum', 'Prairie', 'Quiet', 'Radiant', 'Raven', 'River', 'Ruby',
  'Sage', 'Scarlet', 'Sienna', 'Silver', 'Snowy', 'Solar', 'Sprightly', 'Stellar',
  'Stormy', 'Sunny', 'Swift', 'Tawny', 'Tidy', 'Twilight', 'Velvet', 'Vernal',
  'Violet', 'Vivid', 'Walnut', 'Willow', 'Winter', 'Zesty',
]

const NOUNS = [
  'Acorn', 'Albatross', 'Anchor', 'Arbor', 'Aspen', 'Badger', 'Basket', 'Beacon',
  'Bellwether', 'Birch', 'Bison', 'Bluebird', 'Bobcat', 'Brook', 'Butler', 'Canyon',
  'Cardinal', 'Cedar', 'Compass', 'Coral', 'Creek', 'Daisy', 'Deer', 'Dolphin',
  'Dune', 'Eagle', 'Elk', 'Ember', 'Falcon', 'Fawn', 'Fern', 'Finch',
  'Fjord', 'Foxglove', 'Galaxy', 'Garnet', 'Glade', 'Gondola', 'Grotto', 'Harbor',
  'Harvester', 'Hawk', 'Hearth', 'Heron', 'Hickory', 'Ibis', 'Juniper', 'Kestrel',
  'Kite', 'Lantern', 'Larch', 'Lark', 'Lighthouse', 'Linden', 'Lotus', 'Lupine',
  'Magnolia', 'Maple', 'Marble', 'Marigold', 'Meadowlark', 'Mesa', 'Mistral', 'Moss',
  'Nomad', 'Oak', 'Oriole', 'Otter', 'Panther', 'Parsley', 'Petal', 'Pine',
  'Poppy', 'Quail', 'Raven', 'Redwood', 'Robin', 'Sable', 'Sandhill', 'Sequoia',
  'Sparrow', 'Spruce', 'Starling', 'Sundial', 'Swallow', 'Tamarack', 'Terrace', 'Thistle',
  'Thrush', 'Tidewater', 'Tulip', 'Valley', 'Vista', 'Warbler', 'Willow', 'Yarrow',
]

/** Generates a memorable temporary password like `Crimson-Raven-47`. */
export function generateTempPassword(): string {
  const adjective = ADJECTIVES[randomInt(0, ADJECTIVES.length)]
  const noun = NOUNS[randomInt(0, NOUNS.length)]
  const number = String(randomInt(10, 100))
  return `${adjective}-${noun}-${number}`
}

function getAppBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${getAppBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`
}

type SendOnboardingResult =
  | { ok: true; userId: string; sentAt: Date }
  | { ok: false; userId: string; reason: 'not-found' | 'missing-email-config' | 'send-failed'; message?: string }

type SendOnboardingInput = {
  userId: string
  name: string
  email: string
}

/**
 * Resets the user's password to a new memorable temporary one, emails them the
 * onboarding welcome + credentials, and stamps onboardingEmailSentAt. The
 * plaintext password is only used to compose the email and is never persisted.
 */
export async function sendOnboardingEmail({
  userId,
  name,
  email,
}: SendOnboardingInput): Promise<SendOnboardingResult> {
  const tempPassword = generateTempPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 10)
  const now = new Date()

  const updated = await db.update(users).set({
    hashedPassword,
    passwordChangedAt: now,
    onboardingEmailSentAt: now,
    updatedAt: now,
  })
    .where(eq(users.id, userId))
    .returning({ id: users.id })

  if (updated.length === 0) {
    return { ok: false, userId, reason: 'not-found' }
  }

  const firstName = (name || '').trim().split(/\s+/)[0] || 'there'
  const loginUrl = absoluteUrl('/auth/login')
  const logoUrl = absoluteUrl('/brand/email/wordmark-320.png')
  const logoUrlDark = absoluteUrl('/wordmark-variant-01--reversed.png')

  try {
    const result = await sendEmailWithResend({
      to: email,
      subject: 'Welcome to the Laundry Co. Scheduler',
      text: renderOnboardingEmailText({ firstName, loginEmail: email, tempPassword, loginUrl }),
      html: renderOnboardingEmail({ firstName, loginEmail: email, tempPassword, loginUrl, logoUrl, logoUrlDark }),
    })
    if (!result.sent && result.reason === 'missing-config') {
      return { ok: false, userId, reason: 'missing-email-config' }
    }
  } catch (error) {
    console.error('Onboarding email send failed', { userId, error })
    return {
      ok: false,
      userId,
      reason: 'send-failed',
      message: error instanceof Error ? error.message : String(error),
    }
  }

  return { ok: true, userId, sentAt: now }
}
