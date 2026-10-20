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
  isStartingThisMinute,
} from '../utils/timeUtils';
import {
  playLoudAlarmSound,
  startAlarmLoop,
  stopAlarmLoop,
  speakVoiceAlert,
  triggerHapticVibration,
  showOfflineNotification,
} from '../utils/audioAlert';

interface ScheduleContextType {
  items: ScheduleItem[];
  settings: UserSettings;
  currentTime: Date;
  activeAlarm: ActiveAlarm | null;
  wakeLockActive: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  addItem: (item: Omit<ScheduleItem, 'id'>) => void;
  updateItem: (id: string, updated: Partial<ScheduleItem>) => void;
  deleteItem: (id: string) => void;
  resetToDefaults: () => void;
  toggleTaskCompletion: (id: string) => void;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes?: number) => void;
  testTriggerAlarm: (customItem?: ScheduleItem) => void;
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

  // Track triggered minutes to prevent repeated alerts within the same minute
  const lastTriggeredKeysRef = useRef<Set<string>>(new Set());

  // Save items to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save schedule to localStorage:', e);
    }
  }, [items]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  // Clock tick (every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
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

  // Dismiss Alarm
  const dismissAlarm = useCallback(() => {
    stopAlarmLoop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveAlarm(null);
  }, []);

  // Snooze Alarm
  const snoozeAlarm = useCallback(
    (minutes = 5) => {
      stopAlarmLoop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (activeAlarm) {
        const itemToSnooze = activeAlarm.item;
        setActiveAlarm(null);
        // Set timeout to re-trigger after X minutes
        setTimeout(() => {
          triggerAlarmForItem(itemToSnooze, true);
        }, minutes * 60 * 1000);
      }
    },
    [activeAlarm]
  );

  // Trigger Alarm Routine for a specific item
  const triggerAlarmForItem = useCallback(
    (item: ScheduleItem, isSnoozed = false) => {
      const timeFormatted = formatTime12h(item.startTime);
      const msg = `Hey ${settings.studentName}, it's ${timeFormatted} — you have ${item.title} now${
        item.venue ? ` at ${item.venue}` : ''
      }!`;

      setActiveAlarm({
        item,
        triggeredAt: new Date(),
        message: msg,
        isSnoozed,
      });

      // 1. Loud chime alarm loop
      if (settings.loudChimeEnabled) {
        startAlarmLoop(0.95);
      }

      // 2. Vibration
      if (settings.vibrationEnabled) {
        triggerHapticVibration();
      }

      // 3. Spoken voice alert: "Charlie Milan, you have to do this"
      if (settings.voiceAlertEnabled) {
        speakVoiceAlert(
          item.title,
          item.venue,
          timeFormatted,
          settings.studentName,
          settings.customVoicePhrase,
          settings.speechRate,
          settings.speechPitch
        );
      }

      // 4. Offline system notification
      if (settings.notificationsEnabled) {
        showOfflineNotification(
          `Campus Flow: ${item.title}`,
          msg
        );
      }
    },
    [settings]
  );

  // Test trigger function for user verification
  const testTriggerAlarm = useCallback(
    (customItem?: ScheduleItem) => {
      const sampleItem: ScheduleItem = customItem || {
        id: 'test-sample',
        title: 'Intro Mining',
        venue: 'CCG3',
        category: 'class',
        day: 'Monday',
        startTime: `${String(currentTime.getHours()).padStart(2, '0')}:${String(
          currentTime.getMinutes()
        ).padStart(2, '0')}`,
        endTime: '12:00',
        reminderEnabled: true,
        notes: 'Test alarm demonstration',
      };
      triggerAlarmForItem(sampleItem);
    },
    [currentTime, triggerAlarmForItem]
  );

  // Check schedules every 5 seconds for trigger matches
  useEffect(() => {
    const todayDayName = getCurrentDayOfWeek(currentTime);
    const minuteKey = `${todayDayName}_${currentTime.getHours()}:${currentTime.getMinutes()}`;

    // Clean up cache when day changes
    if (lastTriggeredKeysRef.current.size > 100) {
      lastTriggeredKeysRef.current.clear();
    }

    const eligibleItems = items.filter((item) => {
      if (!item.reminderEnabled) return false;
      const isToday = item.day === 'Daily' || item.day === todayDayName;
      return isToday && isStartingThisMinute(item, currentTime);
    });

    for (const item of eligibleItems) {
      const itemKey = `${minuteKey}_${item.id}`;
      if (!lastTriggeredKeysRef.current.has(itemKey)) {
        lastTriggeredKeysRef.current.add(itemKey);
        triggerAlarmForItem(item);
      }
    }
  }, [currentTime, items, triggerAlarmForItem]);

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
        updateSettings,
        addItem,
        updateItem,
        deleteItem,
        resetToDefaults,
        toggleTaskCompletion,
        dismissAlarm,
        snoozeAlarm,
        testTriggerAlarm,
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
