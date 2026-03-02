import { createSign } from 'node:crypto'

type PushDeliveryResult = {
  staleEndpoints: string[]
}

type PushRecipient = {
  endpoint: string
}

type PushNotificationInput = {
  title: string
  body: string
  link?: string
}

type VapidConfig = {
  subject: string
  publicKey: string
  privateKey: string
}

function toBase64Url(value: Buffer | string) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function makeJwt(config: VapidConfig, audience: string) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const expiresAt = nowSeconds + (12 * 60 * 60)

  const header = toBase64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT' }))
  const payload = toBase64Url(JSON.stringify({
    aud: audience,
    exp: expiresAt,
    sub: config.subject,
  }))

  const unsigned = `${header}.${payload}`
  const signature = createSign('SHA256')
    .update(unsigned)
    .end()
    .sign({
      key: config.privateKey,
      dsaEncoding: 'ieee-p1363',
    })

  return `${unsigned}.${toBase64Url(signature)}`
}

function getVapidConfig(): VapidConfig | null {
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@laundryco.com'
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKeyRaw = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKeyRaw) return null

  const privateKey = privateKeyRaw.includes('BEGIN')
    ? privateKeyRaw.replace(/\\n/g, '\n')
    : privateKeyRaw

  return {
    subject,
    publicKey,
    privateKey,
  }
}

export async function sendPushNotification(
  recipients: PushRecipient[],
  _notification: PushNotificationInput,
): Promise<PushDeliveryResult> {
  if (recipients.length === 0) return { staleEndpoints: [] }

  const config = getVapidConfig()
  if (!config) return { staleEndpoints: [] }

  const jwtByAudience = new Map<string, string>()
  const staleEndpoints: string[] = []

  await Promise.all(recipients.map(async ({ endpoint }) => {
    try {
      const endpointUrl = new URL(endpoint)
      const audience = `${endpointUrl.protocol}//${endpointUrl.host}`
      const existing = jwtByAudience.get(audience)
      const jwt = existing ?? makeJwt(config, audience)
      if (!existing) {
        jwtByAudience.set(audience, jwt)
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          TTL: '60',
          Urgency: 'high',
          Authorization: `WebPush ${jwt}`,
          'Crypto-Key': `p256ecdsa=${config.publicKey}`,
        },
      })

      if (response.status === 404 || response.status === 410) {
        staleEndpoints.push(endpoint)
        return
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error('Push delivery failed', {
          endpoint,
          status: response.status,
          body,
        })
      }
    } catch (error) {
      console.error('Push delivery error', { endpoint, error })
    }
  }))

  return { staleEndpoints }
}
