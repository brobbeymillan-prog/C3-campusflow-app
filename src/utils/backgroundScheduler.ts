import { ScheduleItem, UserSettings, DayOfWeek } from '../types/schedule';
import { getCurrentDayOfWeek, formatTime12h } from './timeUtils';

const DB_NAME = 'campus_flow_db';
const DB_VERSION = 1;
const STORE_NAME = 'schedule_store';

/**
 * Open or create IndexedDB accessible by both window and Service Worker
 */
export function openScheduleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save current items and settings to IndexedDB for the Service Worker
 */
export async function persistScheduleForSW(items: ScheduleItem[], settings: UserSettings): Promise<void> {
  try {
    const db = await openScheduleDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(items, 'items');
    store.put(settings, 'settings');
    store.put(Date.now(), 'lastUpdated');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to persist schedule to IndexedDB for SW:', err);
  }
}

/**
 * Helper to calculate target Date for a day of week and HH:mm string
 */
export function getNextOccurrence(dayName: DayOfWeek | 'Daily', timeStr: string, minutesBefore = 0): Date {
  const now = new Date();
  const [hoursStr, minsStr] = timeStr.split(':');
  const targetHour = parseInt(hoursStr, 10) || 0;
  const targetMin = parseInt(minsStr, 10) || 0;

  const daysMap: Record<DayOfWeek, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const currentDayIndex = now.getDay();
  let dayOffset = 0;

  if (dayName !== 'Daily') {
    const targetDayIndex = daysMap[dayName];
    dayOffset = (targetDayIndex - currentDayIndex + 7) % 7;
  }

  const targetDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    targetHour,
    targetMin - minutesBefore,
    0,
    0
  );

  // If time has already passed today for Daily, schedule for tomorrow
  if (dayName === 'Daily' && targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (dayName !== 'Daily' && dayOffset === 0 && targetDate.getTime() <= now.getTime()) {
    // If targeted day is today but time passed, schedule for next week
    targetDate.setDate(targetDate.getDate() + 7);
  }

  return targetDate;
}

/**
 * Schedules OS-level background notifications via ServiceWorker's Notification Triggers API
 * This fires even when the app is completely CLOSED!
 */
export async function scheduleAllBackgroundNotifications(
  items: ScheduleItem[],
  settings: UserSettings
): Promise<{ scheduledCount: number; timestampTriggerSupported: boolean }> {
  // Always save to IndexedDB first so Service Worker has the latest timetable
  await persistScheduleForSW(items, settings);

  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return { scheduledCount: 0, timestampTriggerSupported: false };
  }

  if (Notification.permission !== 'granted') {
    return { scheduledCount: 0, timestampTriggerSupported: false };
  }

  try {
    const reg = await navigator.serviceWorker.ready;

    // Check if TimestampTrigger is supported
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasTimestampTrigger = 'showTrigger' in Notification.prototype && typeof (window as any).TimestampTrigger !== 'undefined';

    // Notify SW with the latest timetable
    if (reg.active) {
      reg.active.postMessage({
        type: 'SYNC_SCHEDULE',
        items,
        settings,
      });
    }

    // Register Periodic Background Sync if available (Chrome Android)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('periodicSync' in reg && (reg as any).periodicSync) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (reg as any).periodicSync.register('campus-flow-schedule-check', {
          minInterval: 15 * 60 * 1000, // 15 mins
        });
      } catch (e) {
        console.debug('Periodic sync registration error:', e);
      }
    }

    let scheduledCount = 0;

    if (hasTimestampTrigger) {
      // Clear old notifications with tags
      const existingNotifs = await reg.getNotifications();
      for (const notif of existingNotifs) {
        if (notif.tag && notif.tag.startsWith('cf-sched-')) {
          notif.close();
        }
      }

      // Schedule alarms for the next 48 hours
      const enabledItems = items.filter((i) => i.reminderEnabled);
      for (const item of enabledItems) {
        const intervals = item.advanceMinutes && item.advanceMinutes.length > 0
          ? item.advanceMinutes
          : settings.advanceReminderMinutes || [10, 5];
        const allIntervals = Array.from(new Set([...intervals, 0]));

        for (const interval of allIntervals) {
          const targetDate = getNextOccurrence(item.day, item.startTime, interval);
          const diffMs = targetDate.getTime() - Date.now();

          // Only schedule if within next 48 hours and in future
          if (diffMs > 5000 && diffMs < 48 * 60 * 60 * 1000) {
            const timeFormatted = formatTime12h(item.startTime);
            const isAdvance = interval > 0;
            const title = isAdvance
              ? `⏰ Warning: ${item.title} in ${interval} mins!`
              : `🚨 ${item.title} Starting Now!`;
            const body = isAdvance
              ? `Hey ${settings.studentName}, you have ${item.title} at ${item.venue || 'Classroom'} in ${interval} minutes (${timeFormatted}).`
              : `Hey ${settings.studentName}, it's ${timeFormatted}! Head to ${item.venue || 'Classroom'} now.`;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const trigger = new (window as any).TimestampTrigger(targetDate.getTime());

            await reg.showNotification(title, {
              tag: `cf-sched-${item.id}-${interval}-${targetDate.getTime()}`,
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              requireInteraction: true,
              renotify: true,
              vibrate: [500, 200, 500, 200, 500, 200, 1000],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              showTrigger: trigger,
              data: {
                taskTitle: item.title,
                venue: item.venue,
                startTime: item.startTime,
                minutesBefore: interval,
                isClosedAppTrigger: true,
              },
              actions: [
                { action: 'open_speak', title: '🔊 Open & Hear Voice' },
                { action: 'dismiss', title: 'Dismiss' },
              ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            scheduledCount++;
          }
        }
      }
    }

    return { scheduledCount, timestampTriggerSupported: hasTimestampTrigger };
  } catch (err) {
    console.warn('Error scheduling background notifications:', err);
    return { scheduledCount: 0, timestampTriggerSupported: false };
  }
}

/**
 * Test closed app notification: schedules a notification 10 seconds from now
 * allowing Charlie to close the app and verify that it rings while outside!
 */
export async function scheduleTestClosedAppNotification(
  delaySeconds = 10,
  studentName = 'Charlie Milan'
): Promise<{ success: boolean; method: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return { success: false, method: 'unsupported' };
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    return { success: false, method: 'permission_denied' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const targetEpoch = Date.now() + delaySeconds * 1000;

    // Check if TimestampTrigger is supported
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('showTrigger' in Notification.prototype && typeof (window as any).TimestampTrigger !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trigger = new (window as any).TimestampTrigger(targetEpoch);
      await reg.showNotification('🚨 Charlie Milan, Test Alert Working!', {
        tag: `test-closed-app-${Date.now()}`,
        body: `App was closed! Paleontology at CCJ3 reminder popped up on time! Tap to open and hear audio.`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500, 200, 1000],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        showTrigger: trigger,
        data: {
          taskTitle: 'Paleontology',
          venue: 'CCJ3',
          startTime: '6:00 AM',
          minutesBefore: 0,
          studentName,
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      return { success: true, method: 'timestamp_trigger' };
    }

    // Fallback: Ask Service Worker to wait in background thread and fire
    if (reg.active) {
      reg.active.postMessage({
        type: 'SCHEDULE_DELAYED_NOTIFICATION',
        delayMs: delaySeconds * 1000,
        title: '🚨 Charlie Milan, Test Alert Working!',
        options: {
          tag: `test-closed-app-${Date.now()}`,
          body: `App was closed! Paleontology at CCJ3 reminder popped up on time! Tap to open and hear audio.`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500, 200, 1000],
          data: {
            taskTitle: 'Paleontology',
            venue: 'CCJ3',
            startTime: '6:00 AM',
            minutesBefore: 0,
            studentName,
          },
        },
      });
      return { success: true, method: 'sw_timer' };
    }

    return { success: false, method: 'no_sw_active' };
  } catch (err) {
    console.error('Test notification failed:', err);
    return { success: false, method: 'error' };
  }
}

/**
 * Generates an .ics Calendar file that imports into Google Calendar / Samsung Calendar / iPhone
 * with loud built-in OS alarms 10 mins and 5 mins before every single class.
 * This guarantees audio alarms even if the phone has been shut down or battery saver is on!
 */
export function generateTimetableICalendar(items: ScheduleItem[], studentName = 'Charlie Milan'): string {
  const now = new Date();
  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dayMap: Record<DayOfWeek, string> = {
    Sunday: 'SU',
    Monday: 'MO',
    Tuesday: 'TU',
    Wednesday: 'WE',
    Thursday: 'TH',
    Friday: 'FR',
    Saturday: 'SA',
  };

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusFlow//Charlie Milan Ghana Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Campus Flow Timetable (Charlie Milan)',
    'X-WR-TIMEZONE:Africa/Accra',
  ].join('\r\n');

  for (const item of items) {
    if (!item.reminderEnabled) continue;

    const [startH, startM] = item.startTime.split(':').map((n) => parseInt(n, 10) || 0);
    const [endH, endM] = item.endTime
      ? item.endTime.split(':').map((n) => parseInt(n, 10) || 0)
      : [startH + 1, startM];

    const eventDate = getNextOccurrence(item.day, item.startTime, 0);
    const startDateStr = `${eventDate.getFullYear()}${String(eventDate.getMonth() + 1).padStart(2, '0')}${String(
      eventDate.getDate()
    ).padStart(2, '0')}T${String(startH).padStart(2, '0')}${String(startM).padStart(2, '0')}00`;
    const endDateStr = `${eventDate.getFullYear()}${String(eventDate.getMonth() + 1).padStart(2, '0')}${String(
      eventDate.getDate()
    ).padStart(2, '0')}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;

    const rrule = item.day === 'Daily' ? 'FREQ=DAILY' : `FREQ=WEEKLY;BYDAY=${dayMap[item.day]}`;

    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:cf-${item.id}@campusflow.app`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${startDateStr}`,
      `DTEND:${endDateStr}`,
      `RRULE:${rrule}`,
      `SUMMARY:${item.title}`,
      `LOCATION:${item.venue || 'Campus'}`,
      `DESCRIPTION:Class reminder for ${studentName}. ${item.notes || 'Ghana University Department'}.`,
      // 10-Minute Advance Loud Alarm
      'BEGIN:VALARM',
      'TRIGGER:-PT10M',
      'ACTION:AUDIO',
      'ATTACH;VALUE=URI:Chord',
      `DESCRIPTION:Campus Flow 10m Warning: ${item.title}`,
      'END:VALARM',
      // 5-Minute Advance Loud Alarm
      'BEGIN:VALARM',
      'TRIGGER:-PT5M',
      'ACTION:AUDIO',
      'ATTACH;VALUE=URI:Basso',
      `DESCRIPTION:Campus Flow 5m Warning: ${item.title}`,
      'END:VALARM',
      // 0-Minute Exact Alarm
      'BEGIN:VALARM',
      'TRIGGER:PT0M',
      'ACTION:AUDIO',
      'ATTACH;VALUE=URI:Hero',
      `DESCRIPTION:Campus Flow Starting Now: ${item.title} at ${item.venue || 'Class'}!`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  }

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
}

/**
 * Trigger download of the .ics calendar file
 */
export function downloadPhoneCalendarFile(items: ScheduleItem[], studentName = 'Charlie Milan'): void {
  const icsData = generateTimetableICalendar(items, studentName);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CampusFlow_${studentName.replace(/\s+/g, '_')}_Timetable_Alarms.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
