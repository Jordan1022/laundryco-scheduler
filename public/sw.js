self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'Laundry Co. Scheduler'
    let body = 'You have a new scheduling update.'
    let url = '/dashboard#notifications'

    try {
      const response = await fetch('/api/notifications/unread?limit=1', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      })

      if (response.ok) {
        const payload = await response.json()
        const latest = payload?.items?.[0]

        if (latest) {
          title = latest.title || title
          body = latest.body || body
          url = latest.link || url
        }
      }
    } catch (error) {
      // Keep fallback notification text if network/session is unavailable.
    }

    await self.registration.showNotification(title, {
      body,
      data: { url },
      tag: 'laundryco-scheduler-notification',
      renotify: true,
      badge: '/favicon.ico',
      icon: '/favicon.ico',
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard#notifications'

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    for (const client of windows) {
      if ('focus' in client) {
        if (client.url.includes('/dashboard')) {
          client.navigate(targetUrl)
        }
        await client.focus()
        return
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl)
    }
  })())
})
