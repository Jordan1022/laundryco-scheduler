'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type BrowserAlertToggleProps = {
  vapidPublicKey: string
}

function toUint8Array(base64Url: string) {
  const padded = `${base64Url}${'='.repeat((4 - (base64Url.length % 4)) % 4)}`
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const raw = window.atob(padded)
  const output = new Uint8Array(raw.length)

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }

  return output
}

async function getOrCreateRegistration() {
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

function readSubscriptionKeys(subscription: PushSubscription) {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!p256dh || !auth || !json.endpoint) {
    return null
  }

  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
  }
}

async function saveSubscription(subscription: PushSubscription) {
  const payload = readSubscriptionKeys(subscription)
  if (!payload) {
    throw new Error('Subscription payload was missing required keys')
  }

  const response = await fetch('/api/push-subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to save push subscription (${response.status})`)
  }
}

export default function BrowserAlertToggle({ vapidPublicKey }: BrowserAlertToggleProps) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const isSupported = typeof window !== 'undefined'
      && 'Notification' in window
      && 'serviceWorker' in navigator
      && 'PushManager' in window

    setSupported(isSupported)
    if (!isSupported) return

    setPermission(Notification.permission)

    getOrCreateRegistration()
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (subscription) {
          saveSubscription(subscription).catch((error) => {
            console.error('Failed to sync push subscription', error)
          })
        }
        setEnabled(Boolean(subscription))
      })
      .catch((error) => {
        console.error('Failed to initialize push subscription status', error)
      })
  }, [])

  const enable = async () => {
    if (!supported || !vapidPublicKey) return

    setLoading(true)
    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)
      if (permissionResult !== 'granted') {
        setEnabled(false)
        return
      }

      const registration = await getOrCreateRegistration()
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapidPublicKey),
      })

      await saveSubscription(subscription)

      setEnabled(true)
    } catch (error) {
      console.error('Failed to enable browser push', error)
      setEnabled(false)
    } finally {
      setLoading(false)
    }
  }

  const disable = async () => {
    if (!supported) return

    setLoading(true)
    try {
      const registration = await getOrCreateRegistration()
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await fetch('/api/push-subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })

        await subscription.unsubscribe()
      }

      setEnabled(false)
    } catch (error) {
      console.error('Failed to disable browser push', error)
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return <p className="text-xs text-muted-foreground">Browser push is not supported in this browser.</p>
  }

  if (!vapidPublicKey) {
    return <p className="text-xs text-muted-foreground">Push is not configured yet. Ask admin to set VAPID keys.</p>
  }

  if (permission === 'denied') {
    return <p className="text-xs text-muted-foreground">Push permission is blocked in browser settings for this site.</p>
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={enabled ? disable : enable}
      >
        {loading ? 'Updating...' : enabled ? 'Disable Push Notifications' : 'Enable Push Notifications'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Works on supported phone browsers; on iPhone, add to Home Screen for reliable push.
      </p>
    </div>
  )
}
