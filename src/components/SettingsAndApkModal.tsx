import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Volume2,
  Bell,
  Vibrate,
  Eye,
  RotateCcw,
  Download,
  Upload,
  Check,
  Sparkles,
  Layers,
  Terminal,
  ExternalLink,
  Monitor,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import {
  playLoudAlarmSound,
  triggerHapticVibration,
  speakVoiceAlert,
  previewVoiceAlert,
  getCategorizedVoices,
} from '../utils/audioAlert';

interface SettingsAndApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'settings' | 'apk';
  onOpenShare?: () => void;
}

const PRESET_LEAD_OPTIONS = [5, 10, 15, 30, 60];

export const SettingsAndApkModal: React.FC<SettingsAndApkModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'settings',
  onOpenShare,
}) => {
  const {
    settings,
    updateSettings,
    setVoiceGender,
    resetToDefaults,
    exportScheduleJson,
    importScheduleJson,
    testTriggerAlarm,
    testBackgroundAlert,
    wakeLockActive,
    toggleWakeLock,
  } = useSchedule();

  const [activeTab, setActiveTab] = useState<'settings' | 'apk'>(initialTab);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const categorizedVoices = getCategorizedVoices();

  if (!isOpen) return null;

  const handleRequestNotification = async () => {
    if (typeof Notification !== 'undefined') {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        updateSettings({ notificationsEnabled: true });
        // Immediate test
        speakVoiceAlert({
          taskTitle: 'Paleontology',
          venue: 'CCJ3',
          startTime: '6:00 AM',
          studentName: settings.studentName,
          customPhrase: settings.customVoicePhrase,
          gender: settings.voiceGender,
        });
      }
    }
  };

  const handleStartMinimizationTest = () => {
    setTestCountdown(5);
    testBackgroundAlert(5);

    const interval = window.setInterval(() => {
      setTestCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const toggleLeadTime = (mins: number) => {
    const current = settings.advanceReminderMinutes || [10, 5];
    const exists = current.includes(mins);
    let updated: number[];
    if (exists) {
      updated = current.filter((m) => m !== mins);
      if (updated.length === 0) updated = [5];
    } else {
      updated = [...current, mins].sort((a, b) => b - a);
    }
    updateSettings({ advanceReminderMinutes: updated });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importScheduleJson(content);
      if (success) {
        setImportStatus('Schedule imported successfully!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Invalid JSON timetable format.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Campus Flow Hub</h3>
              <p className="text-xs text-slate-400">
                Voice Selection, Background Alerts & Reminders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
            Voice, Alerts & Reminders
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'apk'
                ? 'bg-white text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-slate-900" />
            Android APK & Offline PWA
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
          {activeTab === 'settings' ? (
            <div className="space-y-5">
              {/* Voice Selection: Male and Female Voice Choice */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Spoken Voice: Choose Female or Male
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Works 100% offline
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Female Voice Card */}
                  <div
                    className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between gap-3 ${
                      settings.voiceGender === 'female'
                        ? 'bg-slate-800 border-white shadow-md shadow-white/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">👩</span>
                        {settings.voiceGender === 'female' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase">
                            Active Voice
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white mt-2">
                        Female Voice
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Clear, friendly & melodic pronunciation with higher pitch.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/50">
                      <button
                        type="button"
                        onClick={() =>
                          previewVoiceAlert(
                            'female',
                            settings.studentName,
                            settings.customVoicePhrase
                          )
                        }
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVoiceGender('female');
                          previewVoiceAlert(
                            'female',
                            settings.studentName,
                            settings.customVoicePhrase
                          );
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${
                          settings.voiceGender === 'female'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-white hover:bg-slate-200 text-slate-950'
                        }`}
                      >
                        {settings.voiceGender === 'female' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Selected
                          </>
                        ) : (
                          "I Like This"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Male Voice Card */}
                  <div
                    className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between gap-3 ${
                      settings.voiceGender === 'male'
                        ? 'bg-slate-800 border-white shadow-md shadow-white/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">👨</span>
                        {settings.voiceGender === 'male' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase">
                            Active Voice
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white mt-2">
                        Male Voice
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Deep, authoritative & resonant timbre with lower pitch.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/50">
                      <button
                        type="button"
                        onClick={() =>
                          previewVoiceAlert(
                            'male',
                            settings.studentName,
                            settings.customVoicePhrase
                          )
                        }
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVoiceGender('male');
                          previewVoiceAlert(
                            'male',
                            settings.studentName,
                            settings.customVoicePhrase
                          );
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${
                          settings.voiceGender === 'male'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-white hover:bg-slate-200 text-slate-950'
                        }`}
                      >
                        {settings.voiceGender === 'male' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Selected
                          </>
                        ) : (
                          "I Like This"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Student Name Spoken in Alerts
                </label>
                <input
                  type="text"
                  value={settings.studentName}
                  onChange={(e) => updateSettings({ studentName: e.target.value })}
                  placeholder="e.g. Charlie Milan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              {/* Spoken Voice Phrase */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Wake-up Spoken Phrase
                </label>
                <input
                  type="text"
                  value={settings.customVoicePhrase}
                  onChange={(e) => updateSettings({ customVoicePhrase: e.target.value })}
                  placeholder="Charlie Milan, you have to do this"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Spoken before: "Hey Charlie Milan, it's 6:00 AM — you have Paleontology at CCJ3 now!"
                </p>
              </div>

              {/* Reminder Lead Times (Advance Warnings) */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Advance Reminder Lead Times
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Always alerts at 0m (start)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Choose when you want to receive pre-class warnings:
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_LEAD_OPTIONS.map((m) => {
                    const isSelected = settings.advanceReminderMinutes?.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleLeadTime(m)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{m} min before</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outside-App & Background Notification Guide & Test */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    How Background Reminders Work Outside The App
                  </h4>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  On computers & laptops, keep Campus Flow minimized in your taskbar. Our isolated background Web Worker continuously monitors your schedule. When class time arrives, it triggers:
                </p>

                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>Desktop system banner notification with course & lecture hall</li>
                  <li>Flashing window title in your taskbar</li>
                  <li>Loud university chime alarm & voice prompt</li>
                </ul>

                {/* Test Outside App Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartMinimizationTest}
                    disabled={testCountdown !== null}
                    className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 text-slate-950 text-xs font-black shadow-md transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Monitor className="w-4 h-4 text-emerald-600" />
                    {testCountdown !== null
                      ? `Minimize window now! Testing in ${testCountdown}s`
                      : 'Test Outside-App Alert (Minimizes in 5s)'}
                  </button>

                  {notificationPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={handleRequestNotification}
                      className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                    >
                      Allow Desktop Notifications
                    </button>
                  )}
                </div>
              </div>

              {/* Alert Options Toggles */}
              <div className="space-y-2 pt-1">
                {/* Voice Reminder Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Voice Speech Alert</p>
                      <p className="text-[11px] text-slate-400">
                        Speaks: "{settings.customVoicePhrase}"
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voiceAlertEnabled}
                    onChange={(e) => updateSettings({ voiceAlertEnabled: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded bg-slate-700 border-slate-600 focus:ring-emerald-500"
                  />
                </div>

                {/* Loud University Bell Chime */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/10 text-white">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Loud University Chime</p>
                      <p className="text-[11px] text-slate-400">
                        Plays high-audibility synthesizer chimes
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.loudChimeEnabled}
                    onChange={(e) => updateSettings({ loudChimeEnabled: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded bg-slate-700 border-slate-600 focus:ring-emerald-500"
                  />
                </div>

                {/* Haptic Vibration */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                      <Vibrate className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Haptic Vibration</p>
                      <p className="text-[11px] text-slate-400">
                        Vibrates phone at class start time
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.vibrationEnabled}
                    onChange={(e) => updateSettings({ vibrationEnabled: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded bg-slate-700 border-slate-600 focus:ring-purple-500"
                  />
                </div>

                {/* Screen Keep Awake (Wake Lock) */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Screen Keep Awake</p>
                      <p className="text-[11px] text-slate-400">
                        Keep screen on while on study desk or in lectures
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleWakeLock}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      wakeLockActive
                        ? 'bg-teal-500 text-slate-950 border-teal-400'
                        : 'bg-slate-700 text-slate-300 border-slate-600'
                    }`}
                  >
                    {wakeLockActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Backup & Reset */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-slate-300">Data Management & Backup</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={exportScheduleJson}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Export Backup
                  </button>

                  <label className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Import Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {importStatus && (
                  <p className="text-xs text-center font-bold text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800">
                    {importStatus}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'Reset all classes and routine back to Charlie Milan’s original university timetable?'
                      )
                    ) {
                      resetToDefaults();
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-xs font-bold text-rose-300 border border-rose-900/60 flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Original Ghana University Timetable
                </button>
              </div>
            </div>
          ) : (
            /* APK & PWA Tab */
            <div className="space-y-4">
              {/* Troubleshooting Notice for Android Users */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-sm font-bold text-emerald-300">
                    Fix for "Downloading..." or Installation Issues
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  If the download was stuck or you couldn't find the app on your phone:
                </p>
                <div className="bg-slate-900/90 p-3 rounded-xl text-xs text-slate-200 space-y-2 border border-slate-800">
                  <p>
                    <strong>1. Open outside AI Studio preview:</strong> If you are inside this preview frame, Chrome cannot complete Android APK installation. Open the link directly in the real Google Chrome app:
                  </p>
                  <a
                    href={
                      typeof window !== 'undefined' && window.location.origin.includes('ais-dev-')
                        ? window.location.origin.replace('ais-dev-', 'ais-pre-')
                        : typeof window !== 'undefined' ? window.location.origin : '#'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-black shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Full Google Chrome App
                  </a>
                  <p className="pt-1">
                    <strong>2. Fast 1-Second Install in Chrome:</strong> In Google Chrome on your phone, tap the <strong>3 dots (⋮)</strong> at top right &rarr; tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                  </p>
                  <p>
                    <strong>3. Where to find it:</strong> Swipe down your phone's notification bar to see Chrome's install notification, or look on your home screen or App Drawer for <strong>"Campus Flow"</strong>.
                  </p>
                </div>
              </div>

              {/* Option 1: Native WebAPK */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/20 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white text-slate-950 font-black flex items-center justify-center text-xs">
                    1
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    Direct Android WebAPK (1 Tap in Chrome)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Google Chrome automatically compiles this app into a real native <strong>WebAPK</strong> with an app launcher icon, standalone window (no address bar), and offline background cache.
                </p>
                <div className="bg-slate-900 p-3 rounded-xl text-xs text-slate-300 space-y-1 border border-white/10">
                  <p>1. Open this page in <strong>Google Chrome</strong> on your Android phone.</p>
                  <p>2. Tap the three dots (<strong>⋮</strong>) in the top-right corner.</p>
                  <p>3. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
                  <p>4. Campus Flow will install directly onto your phone launcher!</p>
                </div>
              </div>

              {/* Option 2: Download Standalone Android Package (.ZIP) */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                    2
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    Direct Download: Standalone Android Project (.ZIP)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Download the complete offline Android source files directly to your device. No third-party websites, no 404 errors, and works 100% offline:
                </p>
                <div className="bg-slate-950/60 p-3 rounded-xl text-xs text-slate-300 space-y-2.5 border border-slate-800">
                  <p>Includes AndroidManifest.xml, app icons, Capacitor config, and build instructions:</p>
                  <button
                    type="button"
                    onClick={async () => {
                      const { downloadAndroidProjectZip } = await import('../utils/apkGenerator');
                      await downloadAndroidProjectZip(settings.studentName);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-black text-xs shadow-md transition active:scale-95"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    Download Android Package (.ZIP) Now
                  </button>
                </div>
              </div>

              {/* Option 3: Why Friends Got Access Denied & How to Share */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/20 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white text-slate-950 font-black flex items-center justify-center text-xs">
                    3
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    How to Share with Friends (Fix "Access Denied")
                  </h4>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl text-xs text-slate-300 space-y-2 border border-white/10">
                  <p>
                    <strong>Why friends got "Access Denied":</strong> You are currently in Google AI Studio private developer mode.
                  </p>
                  <p>
                    <strong>How to make it public for everyone:</strong> Look at the <strong>top right corner of your Google AI Studio screen</strong> (above this preview). Click the blue <strong>"Share"</strong> button and enable <strong>"Anyone with the link"</strong>.
                  </p>
                  <p>
                    Once shared, anyone can open and install Campus Flow on their phone without any Google login!
                  </p>
                </div>
              </div>

              {/* Option 4: Capacitor / Android Studio */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">
                    Capacitor / Local Build (For Developers)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  If you want to build raw APK in Android Studio:
                </p>
                <pre className="p-3 rounded-xl bg-slate-950 text-[11px] font-mono text-emerald-300 overflow-x-auto border border-slate-800">
{`npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Campus Flow" "com.campusflow.ghana"
npm run build
npx cap add android
npx cap open android
# In Android Studio: Build > Build APK`}
                </pre>
              </div>

              {/* Share with Friends Quick Trigger */}
              {onOpenShare && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white">Share with Coursemates</h5>
                    <p className="text-[11px] text-slate-400">Show QR Code or send WhatsApp invite</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenShare();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-xs font-black text-slate-950 transition active:scale-95"
                  >
                    Open Share & QR
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-slate-200 text-slate-950 transition active:scale-95 shadow-md shadow-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
