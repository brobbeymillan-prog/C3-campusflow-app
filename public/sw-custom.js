/**
 * Custom Service Worker background notification handlers for Campus Flow
 * Handles:
 * 1. TimestampTrigger and Service Worker notification clicks
 * 2. Background delayed notifications (when app is closed)
 * 3. Opening the PWA and auto-triggering speech & loud alarm chime on notification tap
 * 4. Periodic background sync checks from IndexedDB
 */

const DB_NAME = 'campus_flow_db';
const DB_VERSION = 1;
const STORE_NAME = 'schedule_store';

function openSWDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) {
      return reject(new Error('IndexedDB not supported in SW'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// When user clicks the notification (e.g. from lockscreen or notification tray)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const action = event.action;

  if (action === 'dismiss') {
    return;
  }

  const taskTitle = encodeURIComponent(notificationData.taskTitle || 'Class');
  const venue = encodeURIComponent(notificationData.venue || '');
  const mins = encodeURIComponent(notificationData.minutesBefore || 0);
  const targetUrl = `/?from_notification=1&title=${taskTitle}&venue=${venue}&mins=${mins}&t=${Date.now()}`;

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
      // If no window is open, launch the app with audio parameters
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Periodic background sync event (triggered by Chrome even when app is closed)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'campus-flow-schedule-check') {
    event.waitUntil(checkDueRemindersInBackground());
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'campus-flow-sync') {
    event.waitUntil(checkDueRemindersInBackground());
  }
});

async function checkDueRemindersInBackground() {
  try {
    const db = await openSWDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const items = await new Promise((resolve) => {
      const req = store.get('items');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const settings = await new Promise((resolve) => {
      const req = store.get('settings');
      req.onsuccess = () => resolve(req.result || {});
      req.onerror = () => resolve({});
    });

    if (!items || items.length === 0) return;

    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = days[now.getDay()];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    for (const item of items) {
      if (!item.reminderEnabled) continue;
      if (item.day !== 'Daily' && item.day !== currentDayName) continue;

      const [h, m] = item.startTime.split(':').map((n) => parseInt(n, 10) || 0);
      const startMins = h * 60 + m;
      const diff = startMins - currentMins;

      // If class is starting within next 10 minutes or right now (diff between 0 and 10)
      if (diff >= 0 && diff <= 10) {
        const student = settings.studentName || 'Charlie Milan';
        const isAdvance = diff > 0;
        const title = isAdvance
          ? `⏰ Campus Flow (${diff}m Warning): ${item.title}`
          : `🚨 Campus Flow Starting Now: ${item.title}`;
        const body = isAdvance
          ? `Hey ${student}, you have ${item.title} at ${item.venue || 'Class'} in ${diff} minutes!`
          : `Hey ${student}, it's ${item.startTime}! You have ${item.title} at ${item.venue || 'Class'} now!`;

        await self.registration.showNotification(title, {
          tag: `sw-bg-${item.id}-${diff}-${now.toDateString()}`,
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500, 200, 1000],
          data: {
            taskTitle: item.title,
            venue: item.venue,
            startTime: item.startTime,
            minutesBefore: diff,
          },
        });
      }
    }
  } catch (err) {
    console.warn('SW check background reminders failed:', err);
  }
}

// Allow clients to communicate with the Service Worker
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  } else if (event.data.type === 'SCHEDULE_DELAYED_NOTIFICATION') {
    // Schedule delayed notification for closed app test
    const { delayMs, title, options } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, options);
    }, delayMs || 10000);
  } else if (event.data.type === 'SYNC_SCHEDULE') {
    // Store in IndexedDB
    openSWDatabase().then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (event.data.items) store.put(event.data.items, 'items');
      if (event.data.settings) store.put(event.data.settings, 'settings');
      store.put(Date.now(), 'lastUpdated');
    }).catch((e) => console.warn('Could not sync to SW IndexedDB:', e));
  }
});
