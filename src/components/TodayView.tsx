import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Bell,
  BellOff,
  Edit2,
  Volume2,
  Calendar,
  Sparkles,
  ChevronRight,
  BookOpen,
  Coffee,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScheduleItem } from '../types/schedule';
import { useSchedule } from '../context/ScheduleContext';
import {
  getCurrentDayOfWeek,
  getTodayDateString,
  formatTime12h,
  isTaskCurrentlyActive,
  getTaskProgressPercent,
  getTimeRemainingText,
  sortScheduleItems,
  timeStringToMinutes,
} from '../utils/timeUtils';

interface TodayViewProps {
  onEditItem: (item: ScheduleItem) => void;
  onAddNew: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onEditItem, onAddNew }) => {
  const { items, currentTime, toggleTaskCompletion, testTriggerAlarm, settings } = useSchedule();
  const [filter, setFilter] = useState<'all' | 'class' | 'personal'>('all');

  const todayDayName = getCurrentDayOfWeek(currentTime);
  const todayStr = getTodayDateString(currentTime);

  // Get items for today (either matching today or marked Daily)
  const todayItems = items.filter(
    (item) => item.day === 'Daily' || item.day === todayDayName
  );

  const sortedTodayItems = sortScheduleItems(todayItems);

  const filteredItems = sortedTodayItems.filter((item) => {
    if (filter === 'class') return item.category === 'class';
    if (filter === 'personal') return item.category === 'personal';
    return true;
  });

  // Find currently active item
  const currentActiveItem = sortedTodayItems.find((item) =>
    isTaskCurrentlyActive(item, currentTime)
  );

  // Find up next item
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const upNextItem = sortedTodayItems.find((item) => {
    const startMins = timeStringToMinutes(item.startTime);
    return startMins > currentMinutes;
  });

  const handleCompleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskCompletion(id);
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#4ade80', '#38bdf8', '#fbbf24'],
    });
  };

  const getVenueTypeBadge = (venue: string) => {
    const vUpper = venue.toUpperCase();
    if (vUpper.includes('VLE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Virtual VLE
        </span>
      );
    }
    if (vUpper.includes('LAB')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
          🧪 Lab Session
        </span>
      );
    }
    if (vUpper.includes('FIELD')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          🌿 Fieldwork
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
        <MapPin className="w-3 h-3 text-slate-300" />
        {venue}
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Today Header Sub-bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Live Day Tracker
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            {todayDayName}’s Schedule
          </h2>
          <p className="text-xs text-slate-400">
            {todayItems.filter((i) => i.completedDates?.includes(todayStr)).length} of{' '}
            {todayItems.length} activities completed today
          </p>
        </div>

        <button
          onClick={onAddNew}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition active:scale-95"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          Add Schedule Item
        </button>
      </div>

      {/* HIGHLIGHTED HERO: Currently Active Task */}
      {currentActiveItem ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/70 via-slate-900/90 to-emerald-950/40 border-2 border-emerald-500 shadow-xl shadow-emerald-950/50 p-4 sm:p-5 transition-all">
          {/* Glowing background accent */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                NOW HAPPENING
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
                {currentActiveItem.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm font-semibold text-emerald-300 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime12h(currentActiveItem.startTime)} – {formatTime12h(currentActiveItem.endTime)}
                </span>
                {getVenueTypeBadge(currentActiveItem.venue)}
              </div>
            </div>

            <button
              onClick={() => onEditItem(currentActiveItem)}
              className="p-2 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-700/50 transition active:scale-95"
              title="Edit this task"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar & Countdown */}
          <div className="mt-4 pt-3 border-t border-emerald-800/40 relative z-10">
            <div className="flex items-center justify-between text-xs text-emerald-200/90 font-medium mb-1.5">
              <span>Time Remaining:</span>
              <span className="font-bold text-emerald-300">
                {getTimeRemainingText(currentActiveItem, currentTime)}
              </span>
            </div>
            <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden p-[1px] border border-emerald-900/50">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${getTaskProgressPercent(currentActiveItem, currentTime)}%` }}
              />
            </div>
          </div>

          {/* Action buttons inside Active Card */}
          <div className="mt-4 flex flex-wrap items-center gap-2 relative z-10">
            <button
              onClick={(e) => handleCompleteClick(currentActiveItem.id, e)}
              className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                currentActiveItem.completedDates?.includes(todayStr)
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {currentActiveItem.completedDates?.includes(todayStr)
                ? 'Completed Today ✓'
                : 'Mark as Finished'}
            </button>

            <button
              onClick={() => testTriggerAlarm(currentActiveItem)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition active:scale-95"
              title="Hear voice reminder for this task"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Voice Alert</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Coffee className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Break Time / Transition
              </p>
              <h4 className="text-base font-bold text-white">
                No active task at this moment
              </h4>
            </div>
          </div>
          {upNextItem && (
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400">Up next:</span>
              <p className="text-xs font-bold text-white truncate max-w-[150px]">
                {upNextItem.title} ({formatTime12h(upNextItem.startTime)})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Up Next Preview for small screens if available */}
      {upNextItem && !currentActiveItem && (
        <div className="sm:hidden px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 font-bold">Up Next:</span>
            <span className="text-xs text-white font-semibold truncate max-w-[180px]">
              {upNextItem.title}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-300">
            {formatTime12h(upNextItem.startTime)}
          </span>
        </div>
      )}

      {/* Filter Tabs: All, Classes, Personal Routine */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
            filter === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({todayItems.length})
        </button>
        <button
          onClick={() => setFilter('class')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
            filter === 'class'
              ? 'bg-white text-slate-950 font-black shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Classes ({todayItems.filter((i) => i.category === 'class').length})
        </button>
        <button
          onClick={() => setFilter('personal')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
            filter === 'personal'
              ? 'bg-emerald-600 text-white font-black shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Routine ({todayItems.filter((i) => i.category === 'personal').length})
        </button>
      </div>

      {/* Today's Schedule Timeline List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white">No items found for today</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no {filter === 'all' ? '' : filter} schedule entries configured for{' '}
              {todayDayName}.
            </p>
            <button
              onClick={onAddNew}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-200 text-slate-950"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Item
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = isTaskCurrentlyActive(item, currentTime);
            const isCompleted = item.completedDates?.includes(todayStr);
            const isClass = item.category === 'class';

            return (
              <div
                key={item.id}
                onClick={() => onEditItem(item)}
                className={`group relative flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : isClass
                    ? 'border-white/15 bg-slate-900/75 hover:border-white/35 hover:bg-slate-900'
                    : 'border-emerald-900/40 bg-slate-900/75 hover:border-emerald-600/60 hover:bg-slate-900'
                } ${isCompleted ? 'opacity-70' : 'opacity-100'}`}
              >
                {/* Left check circle & details */}
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={(e) => handleCompleteClick(item.id, e)}
                    className="mt-1 flex-shrink-0 text-slate-500 hover:text-emerald-400 transition"
                    title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                          isClass
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isClass ? 'Class' : 'Routine'}
                      </span>

                      {isActive && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                          Now
                        </span>
                      )}

                      <span className="text-xs font-mono font-semibold text-slate-300">
                        {formatTime12h(item.startTime)} – {formatTime12h(item.endTime)}
                      </span>
                    </div>

                    <h4
                      className={`text-base sm:text-lg font-bold tracking-tight mt-1 truncate ${
                        isCompleted
                          ? 'line-through text-slate-500'
                          : isActive
                          ? 'text-emerald-300'
                          : 'text-white'
                      }`}
                    >
                      {item.title}
                    </h4>

                    {/* Venue / Location & Notes */}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {getVenueTypeBadge(item.venue)}

                      {item.notes && (
                        <span className="text-xs text-slate-400 truncate max-w-xs hidden xs:inline">
                          {item.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      testTriggerAlarm(item);
                    }}
                    title="Speak reminder offline"
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditItem(item);
                    }}
                    title="Edit task time & venue"
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
