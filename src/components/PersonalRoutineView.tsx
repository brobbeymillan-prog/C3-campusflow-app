import React from 'react';
import {
  Sparkles,
  Clock,
  MapPin,
  Plus,
  Volume2,
  Edit2,
  Trash2,
  Bell,
  BellOff,
  Heart,
  Coffee,
  GraduationCap,
  Bed,
  BookOpen,
  Film,
  Flame,
} from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import { useSchedule } from '../context/ScheduleContext';
import {
  formatTime12h,
  sortScheduleItems,
  isTaskCurrentlyActive,
} from '../utils/timeUtils';

interface PersonalRoutineViewProps {
  onEditItem: (item: ScheduleItem) => void;
  onAddNewRoutine: () => void;
}

export const PersonalRoutineView: React.FC<PersonalRoutineViewProps> = ({
  onEditItem,
  onAddNewRoutine,
}) => {
  const { items, currentTime, deleteItem, updateItem, testTriggerAlarm } = useSchedule();

  // Filter personal routine items
  const routineItems = sortScheduleItems(
    items.filter((item) => item.category === 'personal')
  );

  const getRoutineIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('god') || t.includes('devotion') || t.includes('prayer')) {
      return <Heart className="w-5 h-5 text-rose-400" />;
    }
    if (t.includes('prep') || t.includes('breakfast') || t.includes('food')) {
      return <Coffee className="w-5 h-5 text-amber-400" />;
    }
    if (t.includes('class')) {
      return <GraduationCap className="w-5 h-5 text-blue-400" />;
    }
    if (t.includes('rest') || t.includes('nap')) {
      return <Bed className="w-5 h-5 text-teal-400" />;
    }
    if (t.includes('reading') || t.includes('revision') || t.includes('study')) {
      return <BookOpen className="w-5 h-5 text-emerald-400" />;
    }
    if (t.includes('movie') || t.includes('chill') || t.includes('call')) {
      return <Film className="w-5 h-5 text-indigo-400" />;
    }
    if (t.includes('sleep')) {
      return <Bed className="w-5 h-5 text-purple-400" />;
    }
    return <Sparkles className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-emerald-950/40 p-4 rounded-2xl border border-emerald-900/50">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Daily Master Rhythm
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Personal Routine
          </h2>
          <p className="text-xs text-slate-400">
            {routineItems.length} daily habit blocks designed for discipline, university success & well-being
          </p>
        </div>

        <button
          onClick={onAddNewRoutine}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-900/40 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Routine Block
        </button>
      </div>

      {/* Routine Blocks List */}
      <div className="space-y-3">
        {routineItems.length === 0 ? (
          <div className="text-center py-14 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white">No personal routines configured</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add your daily rituals like devotion, breakfast, study blocks, and sleep.
            </p>
            <button
              onClick={onAddNewRoutine}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Routine
            </button>
          </div>
        ) : (
          routineItems.map((block) => {
            const isActive = isTaskCurrentlyActive(block, currentTime);

            return (
              <div
                key={block.id}
                onClick={() => onEditItem(block)}
                className={`relative group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500'
                    : 'border-emerald-900/40 bg-slate-900/80 hover:border-emerald-500/50 hover:bg-slate-900 shadow-md shadow-slate-950/40'
                }`}
              >
                {/* Left vertical emerald line */}
                <div
                  className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${
                    isActive ? 'bg-emerald-400' : 'bg-emerald-600/60'
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getRoutineIcon(block.title)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          {formatTime12h(block.startTime)} – {formatTime12h(block.endTime)}
                        </span>

                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Daily
                        </span>

                        {block.reminderEnabled && (
                          <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/60 flex items-center gap-1">
                            <Bell className="w-2.5 h-2.5 text-emerald-400" />
                            {(block.advanceMinutes && block.advanceMinutes.length > 0
                              ? block.advanceMinutes
                              : [10, 5]
                            )
                              .map((m) => `${m}m`)
                              .join(', ')}{' '}
                            + start
                          </span>
                        )}

                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                            Active Now
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 truncate">
                        {block.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {block.venue && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {block.venue}
                          </span>
                        )}

                        {block.notes && (
                          <span className="text-xs text-slate-400 truncate max-w-sm hidden xs:inline">
                            • {block.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {/* Toggle reminder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItem(block.id, { reminderEnabled: !block.reminderEnabled });
                      }}
                      title={block.reminderEnabled ? 'Reminder enabled' : 'Reminder muted'}
                      className={`p-2 rounded-xl text-xs font-medium border transition ${
                        block.reminderEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {block.reminderEnabled ? (
                        <Bell className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>

                    {/* Speak reminder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testTriggerAlarm(block);
                      }}
                      title="Speak voice alert"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditItem(block);
                      }}
                      title="Edit routine block"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove "${block.title}" from daily routine?`)) {
                          deleteItem(block.id);
                        }
                      }}
                      title="Delete routine"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-900 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
