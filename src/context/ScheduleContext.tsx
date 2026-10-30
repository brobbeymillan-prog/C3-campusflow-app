import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  ScheduleItem,
  UserSettings,
  ActiveAlarm,
} from '../types/schedule';
import {
  DEFAULT_SCHEDULE_ITEMS,
  DEFAULT_SETTINGS,
} from '../data/defaultSchedule';
import {
  getCurrentDayOfWeek,
  getTodayDateString,
  formatTime12h,
} from '../utils/timeUtils';
import {
  playLoudAlarmSound,
  startAlarmLoop,
  stopAlarmLoop,
  speakVoiceAlert,
  triggerHapticVibration,
  showOfflineNotification,
  flashWindowNotification,
  stopWindowFlash,
} from '../utils/audioAlert';
import {
  scheduleAllBackgroundNotifications,
  scheduleTestClosedAppNotification,
  downloadPhoneCalendarFile,
} from '../utils/backgroundScheduler';

interface ScheduleContextType {
  items: ScheduleItem[];
  settings: UserSettings;
  currentTime: Date;
  activeAlarm: ActiveAlarm | null;
  wakeLockActive: boolean;
  backgroundStatus: { scheduledCount: number; timestampTriggerSupported: boolean };
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  setVoiceGender: (gender: 'male' | 'female') => void;
  setGlobalAdvanceReminderMinutes: (minutes: number[]) => void;
  addItem: (item: Omit<ScheduleItem, 'id'>) => void;
  updateItem: (id: string, updated: Partial<ScheduleItem>) => void;
  deleteItem: (id: string) => void;
  resetToDefaults: () => void;
  toggleTaskCompletion: (id: string) => void;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes?: number) => void;
  testTriggerAlarm: (customItem?: ScheduleItem, minutesBefore?: number) => void;
  testBackgroundAlert: (delaySeconds?: number, customItem?: ScheduleItem) => void;
  scheduleTestClosedAppAlert: (delaySeconds?: number) => Promise<{ success: boolean; method: string }>;
  downloadCalendarAlarms: () => void;
  exportScheduleJson: () => void;
  importScheduleJson: (jsonString: string) => boolean;
  toggleWakeLock: () => Promise<void>;
}

const STORAGE_KEY_ITEMS = 'campus_flow_items_v2';
const STORAGE_KEY_SETTINGS = 'campus_flow_settings_v2';

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Load initial items from LocalStorage or defaults
  const [items, setItems] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading items from localStorage:', e);
    }
    return DEFAULT_SCHEDULE_ITEMS;
  });

  // Load initial settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error reading settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState<{ scheduledCount: number; timestampTriggerSupported: boolean }>({
    scheduledCount: 0,
    timestampTriggerSupported: false,
  });

  // Track triggered keys to prevent repeated alerts within the same minute
  const lastTriggeredKeysRef = useRef<Set<string>>(new Set());

  // Save items to localStorage whenever they change & auto-sync to Service Worker
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save schedule to localStorage:', e);
    }
    // Schedule OS-level background notifications that fire even if app is closed
    scheduleAllBackgroundNotifications(items, settings).then((res) => {
      setBackgroundStatus(res);
    });
  }, [items, settings]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  // Clean up window title flashing when user focuses back on the app
  useEffect(() => {
    const handleFocus = () => {
      stopWindowFlash();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('click', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('click', handleFocus);
    };
  }, []);

  // Background Worker: Ticks every second even when app is minimized or locked!
  useEffect(() => {
    let worker: Worker | null = null;
    let fallbackTimer: number | null = null;

    try {
      worker = new Worker('/alarmWorker.js');
      worker.onmessage = (e) => {
        if (e.data && e.data.type === 'TICK') {
          setCurrentTime(new Date());
        }
      };
      worker.postMessage({ type: 'START' });
    } catch (err) {
      console.warn('Dedicated WebWorker unavailable, falling back to interval:', err);
      fallbackTimer = window.setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }

    return () => {
      if (worker) {
        worker.postMessage({ type: 'STOP' });
        worker.terminate();
      }
      if (fallbackTimer !== null) {
        clearInterval(fallbackTimer);
      }
    };
  }, []);

  // Screen WakeLock toggle
  const toggleWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          setWakeLockActive(false);
        } else {
          const sentinel = await navigator.wakeLock.request('screen');
          wakeLockRef.current = sentinel;
          setWakeLockActive(true);
          sentinel.addEventListener('release', () => {
            setWakeLockActive(false);
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn('WakeLock not granted or failed:', err);
      }
    }
  }, []);

  // Update Settings
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Fast switch for voice gender
  const setVoiceGender = useCallback((gender: 'male' | 'female') => {
    setSettings((prev) => ({ ...prev, voiceGender: gender }));
  }, []);

  // Fast set for advance reminder minutes
  const setGlobalAdvanceReminderMinutes = useCallback((minutes: number[]) => {
    setSettings((prev) => ({ ...prev, advanceReminderMinutes: minutes }));
  }, []);

  // Dismiss Alarm
  const dismissAlarm = useCallback(() => {
    stopAlarmLoop();
    stopWindowFlash();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveAlarm(null);
  }, []);

  // Snooze Alarm
  const snoozeAlarm = useCallback(
    (minutes = 5) => {
      stopAlarmLoop();
      stopWindowFlash();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (activeAlarm) {
        const itemToSnooze = activeAlarm.item;
        setActiveAlarm(null);
        setTimeout(() => {
          triggerAlarmForItem(itemToSnooze, true, 0);
        }, minutes * 60 * 1000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAlarm]
  );

  // Trigger Alarm Routine for a specific item (supports advance reminder minutes)
  const triggerAlarmForItem = useCallback(
    (item: ScheduleItem, isSnoozed = false, minutesBefore = 0) => {
      const timeFormatted = formatTime12h(item.startTime);
      const isAdvance = minutesBefore > 0;

      let msg = '';
      let notifTitle = '';

      if (isAdvance) {
        msg = `Hey ${settings.studentName}, in ${minutesBefore} minutes you have ${item.title}${
          item.venue ? ` at ${item.venue}` : ''
        } (${timeFormatted})!`;
        notifTitle = `Campus Flow (${minutesBefore}m Warning): ${item.title}`;
      } else {
        msg = `Hey ${settings.studentName}, it's ${timeFormatted} — you have ${item.title} now${
          item.venue ? ` at ${item.venue}` : ''
        }!`;
        notifTitle = `Campus Flow: ${item.title} Starting Now`;
      }

      setActiveAlarm({
        item,
        triggeredAt: new Date(),
        message: msg,
        isSnoozed,
        minutesBefore,
        isAdvanceReminder: isAdvance,
      });

      // If outside the app / tab is in background, flash the document title
      if (typeof document !== 'undefined' && document.hidden) {
        flashWindowNotification(item.title, item.venue);
      }

      // 1. Loud chime alarm loop
      if (settings.loudChimeEnabled) {
        startAlarmLoop(0.95);
      }

      // 2. Vibration
      if (settings.vibrationEnabled) {
        triggerHapticVibration();
      }

      // 3. Spoken voice alert (with Male/Female selection)
      if (settings.voiceAlertEnabled) {
        speakVoiceAlert({
          taskTitle: item.title,
          venue: item.venue,
          startTime: timeFormatted,
          studentName: settings.studentName,
          customPhrase: settings.customVoicePhrase,
          rate: settings.speechRate,
          pitch: settings.speechPitch,
          gender: settings.voiceGender,
          voiceURI: settings.voiceURI,
          minutesBefore,
        });
      }

      // 4. Offline system notification (Service Worker & Desktop Notification)
      if (settings.notificationsEnabled) {
        showOfflineNotification(notifTitle, msg, {
          taskTitle: item.title,
          venue: item.venue,
          startTime: timeFormatted,
          minutesBefore,
        });
      }
    },
    [settings]
  );

  // Listen for Service Worker notification clicks (brings app up and acknowledges)
  useEffect(() => {
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        const { taskTitle, minutesBefore } = event.data.data || {};
        const matchingItem = items.find((i) => i.title === taskTitle);
        if (matchingItem) {
          triggerAlarmForItem(matchingItem, false, minutesBefore || 0);
        }
      }
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, [items, triggerAlarmForItem]);

  // When app is launched directly from a closed notification via deep link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from_notification') === '1') {
      const taskTitle = urlParams.get('title') || 'Paleontology';
      const venue = urlParams.get('venue') || 'CCJ3';
      const mins = parseInt(urlParams.get('mins') || '0', 10);

      const matchingItem = items.find((i) => i.title === taskTitle) || {
        id: 'closed-app-notif',
        title: taskTitle,
        venue,
        startTime: '6:00',
        endTime: '8:00',
        category: 'class' as const,
        day: 'Monday' as const,
        reminderEnabled: true,
        completedDates: [],
      };

      // Clean query params so refresh doesn't re-trigger
      window.history.replaceState({}, document.title, window.location.pathname);

      // Trigger loud chime and voice alert after small mount delay
      setTimeout(() => {
        triggerAlarmForItem(matchingItem, false, mins);
      }, 700);
    }
  }, [items, triggerAlarmForItem]);

  // Test trigger function for user verification
  const testTriggerAlarm = useCallback(
    (customItem?: ScheduleItem, minutesBefore = 0) => {
      const sampleItem: ScheduleItem = customItem || {
        id: 'test-sample',
        title: 'Paleontology',
        venue: 'CCJ3',
        category: 'class',
        day: 'Monday',
        startTime: `${String(currentTime.getHours()).padStart(2, '0')}:${String(
          currentTime.getMinutes()
        ).padStart(2, '0')}`,
        endTime: '12:00',
        reminderEnabled: true,
        notes: 'Test alarm demonstration',
      };
      triggerAlarmForItem(sampleItem, false, minutesBefore);
    },
    [currentTime, triggerAlarmForItem]
  );

  // Schedule a delayed test alert so user can minimize window and verify outside-app notification!
  const testBackgroundAlert = useCallback(
    (delaySeconds = 5, customItem?: ScheduleItem) => {
      const sampleItem: ScheduleItem = customItem || {
        id: 'test-bg-sample',
        title: 'Paleontology',
        venue: 'CCJ3',
        category: 'class',
        day: 'Monday',
        startTime: '06:00',
        endTime: '07:00',
        reminderEnabled: true,
        notes: 'Background outside-app test',
      };

      // Request permission first if needed
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }

      setTimeout(() => {
        triggerAlarmForItem(sampleItem, false, 0);
      }, delaySeconds * 1000);
    },
    [triggerAlarmForItem]
  );

  // Schedule a real closed-app alert: user can close the app or lock phone, and it fires
  const scheduleTestClosedAppAlert = useCallback(
    async (delaySeconds = 10) => {
      return scheduleTestClosedAppNotification(delaySeconds, settings.studentName);
    },
    [settings.studentName]
  );

  // Download complete phone calendar .ics with built-in 10m & 5m loud ringing alarms
  const downloadCalendarAlarms = useCallback(() => {
    downloadPhoneCalendarFile(items, settings.studentName);
  }, [items, settings.studentName]);

  // Check schedules every second for trigger matches (both exact start and advance reminders)
  useEffect(() => {
    const todayDayName = getCurrentDayOfWeek(currentTime);
    const currentMinsTotal = currentTime.getHours() * 60 + currentTime.getMinutes();
    const minuteKey = `${todayDayName}_${currentMinsTotal}`;

    // Clean up cache periodically
    if (lastTriggeredKeysRef.current.size > 200) {
      lastTriggeredKeysRef.current.clear();
    }

    const eligibleItems = items.filter((item) => {
      if (!item.reminderEnabled) return false;
      return item.day === 'Daily' || item.day === todayDayName;
    });

    for (const item of eligibleItems) {
      // Determine reminder intervals: custom on item or global settings, always including 0 (start time)
      const baseIntervals =
        item.advanceMinutes && item.advanceMinutes.length > 0
          ? item.advanceMinutes
          : settings.advanceReminderMinutes || [10, 5];
      const allIntervals = Array.from(new Set([...baseIntervals, 0]));

      for (const interval of allIntervals) {
        const itemKey = `${minuteKey}_${item.id}_before_${interval}`;
        if (!lastTriggeredKeysRef.current.has(itemKey)) {
          // Check if due this exact minute
          const startMins =
            (parseInt(item.startTime.split(':')[0], 10) || 0) * 60 +
            (parseInt(item.startTime.split(':')[1], 10) || 0);
          const targetMins = (startMins - interval + 1440) % 1440;

          if (currentMinsTotal === targetMins) {
            lastTriggeredKeysRef.current.add(itemKey);
            triggerAlarmForItem(item, false, interval);
          }
        }
      }
    }
  }, [currentTime, items, settings.advanceReminderMinutes, triggerAlarmForItem]);

  // Add Item
  const addItem = useCallback((itemData: Omit<ScheduleItem, 'id'>) => {
    const newItem: ScheduleItem = {
      ...itemData,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      completedDates: [],
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  // Update Item
  const updateItem = useCallback((id: string, updated: Partial<ScheduleItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
  }, []);

  // Delete Item
  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Reset to original defaults
  const resetToDefaults = useCallback(() => {
    setItems(DEFAULT_SCHEDULE_ITEMS);
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY_ITEMS);
      localStorage.removeItem(STORAGE_KEY_SETTINGS);
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
  }, []);

  // Toggle today completion
  const toggleTaskCompletion = useCallback((id: string) => {
    const todayStr = getTodayDateString(new Date());
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const currentCompleted = item.completedDates || [];
        const isDoneToday = currentCompleted.includes(todayStr);
        const updatedCompleted = isDoneToday
          ? currentCompleted.filter((d) => d !== todayStr)
          : [...currentCompleted, todayStr];
        return { ...item, completedDates: updatedCompleted };
      })
    );
  }, []);

  // Export JSON backup
  const exportScheduleJson = useCallback(() => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      studentName: settings.studentName,
      settings,
      items,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CampusFlow_Schedule_${settings.studentName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items, settings]);

  // Import JSON backup
  const importScheduleJson = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.items)) {
        setItems(parsed.items);
        if (parsed.settings) {
          setSettings((prev) => ({ ...prev, ...parsed.settings }));
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to parse imported JSON:', e);
    }
    return false;
  }, []);

  return (
    <ScheduleContext.Provider
      value={{
        items,
        settings,
        currentTime,
        activeAlarm,
        wakeLockActive,
        backgroundStatus,
        updateSettings,
        setVoiceGender,
        setGlobalAdvanceReminderMinutes,
        addItem,
        updateItem,
        deleteItem,
        resetToDefaults,
        toggleTaskCompletion,
        dismissAlarm,
        snoozeAlarm,
        testTriggerAlarm,
        testBackgroundAlert,
        scheduleTestClosedAppAlert,
        downloadCalendarAlarms,
        exportScheduleJson,
        importScheduleJson,
        toggleWakeLock,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export function useSchedule(): ScheduleContextType {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
