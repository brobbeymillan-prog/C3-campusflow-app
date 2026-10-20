import React from 'react';
import { Volume2, Settings as SettingsIcon, Share2, Eye, EyeOff } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { PWAInstallButton } from './PWAInstallButton';
import { previewVoiceAlert } from '../utils/audioAlert';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenApkGuide: () => void;
  onOpenShare: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenApkGuide, onOpenShare }) => {
  const {
    currentTime,
    testTriggerAlarm,
    wakeLockActive,
    toggleWakeLock,
    settings,
    setVoiceGender,
  } = useSchedule();

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handleToggleVoiceGender = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextGender = settings.voiceGender === 'female' ? 'male' : 'female';
    setVoiceGender(nextGender);
    previewVoiceAlert(nextGender, settings.studentName, settings.customVoicePhrase);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-white/10 px-3 py-2.5 sm:px-6 sm:py-3 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-white via-slate-200 to-emerald-500 p-[2px] shadow-lg shadow-black/60">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden">
              <span className="text-sm sm:text-base font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-400">
                CF
              </span>
            </div>
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-slate-950 flex items-center justify-center text-[7px] font-bold text-slate-950"
              title="Ghana Student Edition"
            >
              ★
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                Campus Flow
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-white/10 text-white border border-white/20">
                Offline
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {settings.studentName}’s Schedule
            </p>
          </div>
        </div>

        {/* Live Clock & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Live Digital Clock Badge */}
          <div className="hidden md:flex flex-col items-end px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10">
            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 tracking-tight leading-none">
              {formattedTime}
            </span>
            <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
              {formattedDate}
            </span>
          </div>

          {/* Quick Male / Female Voice Selector Pill */}
          <button
            onClick={handleToggleVoiceGender}
            title={`Current Voice: ${settings.voiceGender === 'male' ? 'Male Voice' : 'Female Voice'} (Click to switch & preview)`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold border border-white/15 transition active:scale-95"
          >
            <span className="text-sm leading-none">
              {settings.voiceGender === 'male' ? '👨' : '👩'}
            </span>
            <span className="hidden sm:inline text-white">
              {settings.voiceGender === 'male' ? 'Male Voice' : 'Female Voice'}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono ml-0.5">
              (Switch)
            </span>
          </button>

          {/* Quick Test Voice & Alarm */}
          <button
            onClick={() => testTriggerAlarm()}
            title="Test Voice Alert: 'Charlie Milan, you have to do this'"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all active:scale-95"
          >
            <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Test Alert</span>
          </button>

          {/* Share App & QR Code button */}
          <button
            onClick={onOpenShare}
            title="Share app with friends & coursemates"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* WakeLock / Keep Awake */}
          {'wakeLock' in (typeof navigator !== 'undefined' ? navigator : {}) && (
            <button
              onClick={toggleWakeLock}
              title={wakeLockActive ? 'Screen will stay awake during study' : 'Enable screen keep-awake'}
              className={`p-2 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                wakeLockActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {wakeLockActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}

          {/* PWA / APK install */}
          <PWAInstallButton onOpenApkGuide={onOpenApkGuide} />

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="Settings & Edit Routine"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
