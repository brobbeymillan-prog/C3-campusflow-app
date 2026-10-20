import React, { useState } from 'react';
import {
  Bell,
  Clock,
  MapPin,
  ChevronRight,
  Sliders,
  Check,
  Plus,
  Volume2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import { useSchedule } from '../context/ScheduleContext';
import {
  getCurrentDayOfWeek,
  formatTime12h,
  sortScheduleItems,
  timeStringToMinutes,
} from '../utils/timeUtils';

interface UpcomingReminderPoint {
  item: ScheduleItem;
  minutesBefore: number;
  triggerMinutes: number; // minute of the day (0-1439)
  minutesUntilTrigger: number; // positive minutes from now until it triggers
  type: 'advance' | 'start';
}

const PRESET_LEAD_OPTIONS = [
  { value: 5, label: '5m Before' },
  { value: 10, label: '10m Before' },
  { value: 15, label: '15m Before' },
  { value: 30, label: '30m Before' },
  { value: 60, label: '1h Before' },
];

export const UpcomingRemindersRadar: React.FC<{
  onEditItem?: (item: ScheduleItem) => void;
}> = ({ onEditItem }) => {
  const {
    items,
    settings,
    currentTime,
    updateSettings,
    testTriggerAlarm,
  } = useSchedule();

  const [isEditingTimes, setIsEditingTimes] = useState(false);
  const [customMinInput, setCustomMinInput] = useState('');

  const todayDayName = getCurrentDayOfWeek(currentTime);
  const currentMinutesNow = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Eligible tasks for today
  const todayTasks = items.filter(
    (item) => item.reminderEnabled && (item.day === 'Daily' || item.day === todayDayName)
  );

  // Calculate upcoming reminder trigger points for the next 12 hours
  const reminderPoints: UpcomingReminderPoint[] = [];

  for (const item of todayTasks) {
    const itemStartMins = timeStringToMinutes(item.startTime);
    const intervals =
      item.advanceMinutes && item.advanceMinutes.length > 0
        ? item.advanceMinutes
        : settings.advanceReminderMinutes || [10, 5];

    const allIntervals = Array.from(new Set([...intervals, 0]));

    for (const minsBefore of allIntervals) {
      const triggerTime = (itemStartMins - minsBefore + 1440) % 1440;
      let diff = triggerTime - currentMinutesNow;
      // If today and in future
      if (diff >= 0 && diff <= 720) {
        reminderPoints.push({
          item,
          minutesBefore: minsBefore,
          triggerMinutes: triggerTime,
          minutesUntilTrigger: diff,
          type: minsBefore === 0 ? 'start' : 'advance',
        });
      }
    }
  }

  // Sort by earliest trigger first
  reminderPoints.sort((a, b) => a.minutesUntilTrigger - b.minutesUntilTrigger);

  // Take top 4 upcoming alerts
  const displayPoints = reminderPoints.slice(0, 4);

  const toggleLeadTime = (mins: number) => {
    const current = settings.advanceReminderMinutes || [10, 5];
    const exists = current.includes(mins);
    let updated: number[];
    if (exists) {
      updated = current.filter((m) => m !== mins);
      if (updated.length === 0) updated = [5]; // Keep at least one
    } else {
      updated = [...current, mins].sort((a, b) => b - a);
    }
    updateSettings({ advanceReminderMinutes: updated });
  };

  const handleAddCustomMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMinInput.trim(), 10);
    if (!isNaN(val) && val > 0 && val <= 180) {
      const current = settings.advanceReminderMinutes || [10, 5];
      if (!current.includes(val)) {
        updateSettings({
          advanceReminderMinutes: [...current, val].sort((a, b) => b - a),
        });
      }
      setCustomMinInput('');
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-white/15 p-4 sm:p-5 shadow-lg shadow-black/40 space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Upcoming Reminders Radar</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Advance reminders notify you before classes & routines start
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditingTimes(!isEditingTimes)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
            isEditingTimes
              ? 'bg-white text-slate-950 border-white font-black'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isEditingTimes ? 'Done Editing' : 'Edit Alert Times'}</span>
        </button>
      </div>

      {/* Editable Reminder Times Panel */}
      {isEditingTimes && (
        <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 animate-fade-in">
          <div>
            <p className="text-xs font-bold text-white mb-1">
              Set When Reminders Sound (Lead Times)
            </p>
            <p className="text-[11px] text-slate-400">
              Campus Flow will play voice alerts and send notifications at these exact minutes before each class:
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_LEAD_OPTIONS.map((opt) => {
              const isSelected = settings.advanceReminderMinutes?.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleLeadTime(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}

            {/* Always at start time */}
            <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
              ✓ At Start Time (0m)
            </span>
          </div>

          {/* Custom Minute Input */}
          <form onSubmit={handleAddCustomMinutes} className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-300 font-medium">Add custom lead time:</span>
            <input
              type="number"
              min="1"
              max="180"
              placeholder="e.g. 20"
              value={customMinInput}
              onChange={(e) => setCustomMinInput(e.target.value)}
              className="w-20 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-400">mins before</span>
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-950 text-xs font-black transition active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              Add
            </button>
          </form>
        </div>
      )}

      {/* Radar Cards List */}
      <div className="space-y-2">
        {displayPoints.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
            No further classes or reminders scheduled for today. Check your Class Timetable tab for the week!
          </div>
        ) : (
          displayPoints.map((point, idx) => {
            const isAdvance = point.type === 'advance';
            const formattedStartTime = formatTime12h(point.item.startTime);

            return (
              <div
                key={`${point.item.id}-${point.minutesBefore}-${idx}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-white/10 hover:border-white/25 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-black flex-shrink-0 ${
                      point.minutesUntilTrigger <= 10
                        ? 'bg-emerald-500 text-slate-950 animate-pulse'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    {point.minutesUntilTrigger === 0
                      ? 'NOW'
                      : `${point.minutesUntilTrigger}m`}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {isAdvance
                          ? `In ${point.minutesBefore} mins: ${point.item.title}`
                          : `Starts now: ${point.item.title}`}
                      </span>

                      {point.item.venue && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 px-1.5 py-0.2 rounded bg-white/10 border border-white/15 truncate">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          {point.item.venue}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Class time: {formattedStartTime} • Triggering in {point.minutesUntilTrigger} min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => testTriggerAlarm(point.item, point.minutesBefore)}
                    title={`Test voice alert for ${point.item.title}`}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  {onEditItem && (
                    <button
                      onClick={() => onEditItem(point.item)}
                      title="Edit this task"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
