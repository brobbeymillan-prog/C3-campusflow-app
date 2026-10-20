export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type Category = 'class' | 'personal';

export interface ScheduleItem {
  id: string;
  title: string;
  venue: string; // e.g. CCG3, VLE, LH1, GEO LAB only, Hostel
  category: Category;
  day: DayOfWeek | 'Daily'; // Daily applies to everyday routines
  startTime: string; // "HH:MM" 24h format (e.g. "07:00", "13:30")
  endTime: string;   // "HH:MM" 24h format (e.g. "08:00", "14:30")
  reminderEnabled: boolean;
  notes?: string;
  completedDates?: string[]; // array of YYYY-MM-DD
}

export interface UserSettings {
  studentName: string; // "Charlie Milan"
  voiceAlertEnabled: boolean;
  loudChimeEnabled: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean; // Keep screen on during lectures/study
  notificationsEnabled: boolean;
  customVoicePhrase: string; // "Charlie Milan, you have to do this"
  themeMode: 'dark' | 'amoled' | 'blue-night';
  speechRate: number; // 0.8 - 1.2
  speechPitch: number; // 0.8 - 1.2
}

export interface ActiveAlarm {
  item: ScheduleItem;
  triggeredAt: Date;
  message: string;
  isSnoozed?: boolean;
}
