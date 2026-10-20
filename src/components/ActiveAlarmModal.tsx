import React from 'react';
import { Bell, Volume2, CheckCircle2, Clock, MapPin, AlarmClockOff } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { formatTime12h } from '../utils/timeUtils';
import { speakVoiceAlert } from '../utils/audioAlert';

export const ActiveAlarmModal: React.FC = () => {
  const { activeAlarm, dismissAlarm, snoozeAlarm, settings } = useSchedule();

  if (!activeAlarm) return null;

  const item = activeAlarm.item;
  const timeStr = formatTime12h(item.startTime);
  const minutesBefore = activeAlarm.minutesBefore || 0;

  const handleReplayVoice = () => {
    speakVoiceAlert({
      taskTitle: item.title,
      venue: item.venue,
      startTime: timeStr,
      studentName: settings.studentName,
      customPhrase: settings.customVoicePhrase,
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      gender: settings.voiceGender,
      voiceURI: settings.voiceURI,
      minutesBefore,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20 p-6 text-center overflow-hidden">
        {/* Animated glowing backdrop circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Pulsing Bell Icon */}
        <div className="relative inline-flex items-center justify-center mb-3">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Bell className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-400 animate-bounce" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
          </span>
        </div>

        {/* Advance or Starting Now Badge */}
        <div className="mb-2">
          {activeAlarm.isAdvanceReminder ? (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              In {minutesBefore} Minutes
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Starting Right Now
            </span>
          )}
        </div>

        {/* Spoken phrase quote */}
        <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-wide uppercase inline-block mb-2">
          🗣️ "{settings.customVoicePhrase}"
        </div>

        {/* Main Task Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mt-1">
          {item.title}
        </h2>

        {/* Time and Venue */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-emerald-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            {timeStr}
          </span>
          {item.venue && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-white border border-white/15">
              <MapPin className="w-3.5 h-3.5 text-slate-300" />
              {item.venue}
            </span>
          )}
        </div>

        {/* Personalized Message */}
        <p className="text-sm text-slate-300 mt-4 leading-relaxed font-medium bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
          {activeAlarm.message}
        </p>

        {/* Replay voice button */}
        <button
          onClick={handleReplayVoice}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
        >
          <Volume2 className="w-4 h-4" />
          Hear voice prompt again
        </button>

        {/* Big Action Buttons */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => snoozeAlarm(5)}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <AlarmClockOff className="w-4 h-4 text-slate-400" />
            Snooze 5 Min
          </button>

          <button
            onClick={dismissAlarm}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-slate-950" />
            I'M ON IT!
          </button>
        </div>
      </div>
    </div>
  );
};
