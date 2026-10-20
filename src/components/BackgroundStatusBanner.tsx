import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  ExternalLink,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { showOfflineNotification } from '../utils/audioAlert';

export const BackgroundStatusBanner: React.FC = () => {
  const { testBackgroundAlert, settings } = useSchedule();
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        if (res === 'granted') {
          showOfflineNotification(
            '✅ Background Reminders Active!',
            `Hey ${settings.studentName}, Campus Flow will now alert you even when working in other apps or when minimized!`
          );
        }
      } catch (e) {
        console.warn('Error requesting notification permission:', e);
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

  const isGranted = permission === 'granted';

  return (
    <div
      className={`rounded-2xl p-4 sm:p-4.5 border transition-all ${
        isGranted
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40'
          : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/50'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
              isGranted
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400 animate-pulse'
            }`}
          >
            {isGranted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black uppercase tracking-wider ${
                  isGranted ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isGranted
                  ? 'Outside-App Alerts Enabled'
                  : 'Action Needed: Enable Background Alerts'}
              </span>
              <span className="hidden xs:inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/10 text-white border border-white/20">
                Offline Mode
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {isGranted ? (
                <>
                  Campus Flow’s background worker is active. You will get system popups, loud chimes, and voice alerts even when using Word, browsing other sites, or when minimized to your taskbar!
                </>
              ) : (
                <>
                  To hear <strong>"Charlie Milan, you have this at this time"</strong> while using other computer programs or when minimized, tap the button to allow desktop notifications.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
          {!isGranted ? (
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-900/40 transition active:scale-95 flex items-center gap-1.5"
            >
              <Bell className="w-4 h-4" />
              <span>Allow Background Alerts</span>
            </button>
          ) : (
            <button
              onClick={handleStartMinimizationTest}
              disabled={testCountdown !== null}
              title="Schedules an alert for 5 seconds from now so you can minimize the window to test!"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition active:scale-95 flex items-center gap-1.5"
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {testCountdown !== null
                  ? `Minimize window now! (${testCountdown}s)`
                  : 'Test Outside-App Alert (5s)'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
