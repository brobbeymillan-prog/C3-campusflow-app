import { DayOfWeek, ScheduleItem } from '../types/schedule';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Gets the current day of the week in English
 */
export function getCurrentDayOfWeek(date = new Date()): DayOfWeek {
  const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday, ...
  const map: Record<number, DayOfWeek> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return map[dayIndex];
}

/**
 * Converts "HH:MM" 24h format into total minutes since midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

/**
 * Formats "13:30" into "1:30 PM" or "07:00" into "7:00 AM"
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h)) return timeStr;

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 hour becomes 12
  const formattedMinutes = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${formattedMinutes} ${ampm}`;
}

/**
 * Formats "YYYY-MM-DD" date string for completion tracking
 */
export function getTodayDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks if a task is currently ongoing
 */
export function isTaskCurrentlyActive(item: ScheduleItem, now = new Date()): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeStringToMinutes(item.startTime);
  const end = timeStringToMinutes(item.endTime);

  // Normal daytime task
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  // Overnight task (e.g., Sleep 22:30 -> 05:30)
  return currentMinutes >= start || currentMinutes < end;
}

/**
 * Calculates percentage of task completed (0 to 100)
 */
export function getTaskProgressPercent(item: ScheduleItem, now = new Date()): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeStringToMinutes(item.startTime);
  const end = timeStringToMinutes(item.endTime);

  let totalDuration = 0;
  let elapsed = 0;

  if (start < end) {
    totalDuration = end - start;
    elapsed = currentMinutes - start;
  } else {
    // Overnight
    totalDuration = 24 * 60 - start + end;
    elapsed = currentMinutes >= start ? currentMinutes - start : 24 * 60 - start + currentMinutes;
  }

  if (totalDuration <= 0) return 0;
  const pct = Math.round((elapsed / totalDuration) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Returns human readable countdown until end or next event
 */
export function getTimeRemainingText(item: ScheduleItem, now = new Date()): string {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const end = timeStringToMinutes(item.endTime);

  let remaining = 0;
  if (end > currentMinutes) {
    remaining = end - currentMinutes;
  } else {
    remaining = 24 * 60 - currentMinutes + end;
  }

  const hours = Math.floor(remaining / 60);
  const mins = remaining % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m remaining`;
  }
  return `${mins}m remaining`;
}

/**
 * Checks if an event starts right now (within the current minute)
 */
export function isStartingThisMinute(item: ScheduleItem, now = new Date()): boolean {
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMinute = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}`;
  return item.startTime === currentTimeStr;
}

/**
 * Checks if a reminder (either exact time or advance alert like 5m/10m before) is due this minute
 */
export function isReminderDueNow(startTimeStr: string, minutesBefore: number, now = new Date()): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeStringToMinutes(startTimeStr);
  const targetMinutes = (startMinutes - minutesBefore + 1440) % 1440;
  return currentMinutes === targetMinutes;
}

/**
 * Sorts schedule items chronologically by startTime
 */
export function sortScheduleItems(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) => {
    return timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
  });
}
