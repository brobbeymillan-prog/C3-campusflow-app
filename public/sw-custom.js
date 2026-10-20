/**
 * Custom Service Worker background notification handlers for Campus Flow
 * Keeps notifications interactive and refocuses/opens the PWA window on click.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and tell it to trigger alarm/speech
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData,
          });
          return client.focus();
        }
      }
      // If no window is open, open the app
      if (self.clients.openWindow) {
        return self.clients.openWindow('/?from_notification=1');
      }
    })
  );
});

// Allow clients to trigger notifications directly through service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
