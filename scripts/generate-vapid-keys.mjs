import { generateKeyPairSync } from 'node:crypto'

function decodeBase64Url(value) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  return Buffer.from(padded, 'base64')
}

function encodeBase64Url(value) {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function requireJwkValue(value, name) {
  if (!value) {
    throw new Error(`Missing JWK ${name} value`)
  }
  return value
}

function generateVapidKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const publicJwk = publicKey.export({ format: 'jwk' })
  const x = decodeBase64Url(requireJwkValue(publicJwk.x, 'x'))
  const y = decodeBase64Url(requireJwkValue(publicJwk.y, 'y'))

  const uncompressedPublicKey = Buffer.concat([
    Buffer.from([0x04]),
    x,
    y,
  ])

  const publicKeyBase64Url = encodeBase64Url(uncompressedPublicKey)
  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()

  return {
    publicKeyBase64Url,
    privateKeyPem,
  }
}

const keys = generateVapidKeys()

console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY="' + keys.publicKeyBase64Url + '"')
console.log('VAPID_PUBLIC_KEY="' + keys.publicKeyBase64Url + '"')
console.log('VAPID_PRIVATE_KEY="' + keys.privateKeyPem.replace(/\n/g, '\\n') + '"')
console.log('VAPID_SUBJECT="mailto:admin@laundryco.com"')
