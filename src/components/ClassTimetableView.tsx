import React, { useState } from 'react';
import {
  GraduationCap,
  Clock,
  MapPin,
  Plus,
  Volume2,
  Edit2,
  Trash2,
  Bell,
  BellOff,
  Video,
  Building,
  Compass,
} from 'lucide-react';
import { ScheduleItem, DayOfWeek } from '../types/schedule';
import { useSchedule } from '../context/ScheduleContext';
import {
  DAYS_OF_WEEK,
  getCurrentDayOfWeek,
  formatTime12h,
  sortScheduleItems,
  timeStringToMinutes,
  isTaskCurrentlyActive,
} from '../utils/timeUtils';

interface ClassTimetableViewProps {
  onEditItem: (item: ScheduleItem) => void;
  onAddNewClass: (day: DayOfWeek) => void;
}

const CLASS_DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const ClassTimetableView: React.FC<ClassTimetableViewProps> = ({
  onEditItem,
  onAddNewClass,
}) => {
  const { items, currentTime, deleteItem, updateItem, testTriggerAlarm } = useSchedule();

  const currentDay = getCurrentDayOfWeek(currentTime);
  const initialDay: DayOfWeek = CLASS_DAYS.includes(currentDay) ? currentDay : 'Monday';
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(initialDay);

  // Filter classes for the selected day
  const classesForDay = sortScheduleItems(
    items.filter((item) => item.category === 'class' && item.day === selectedDay)
  );

  const totalClasses = classesForDay.length;
  const vleCount = classesForDay.filter((c) => c.venue.toUpperCase().includes('VLE')).length;
  const physicalCount = totalClasses - vleCount;

  return (
    <div className="space-y-4 pb-20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Academic Timetable
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Class Schedule
          </h2>
          <p className="text-xs text-slate-400">
            {totalClasses} classes scheduled for {selectedDay} ({physicalCount} on-campus, {vleCount} VLE online)
          </p>
        </div>

        <button
          onClick={() => onAddNewClass(selectedDay)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-200 text-xs font-black text-slate-950 shadow-md shadow-white/10 transition active:scale-95"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          Add Class to {selectedDay}
        </button>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-white/10 overflow-x-auto">
        {CLASS_DAYS.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = currentDay === day;
          const count = items.filter((i) => i.category === 'class' && i.day === day).length;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-white text-slate-950 font-black shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold tracking-tight">
                {day.slice(0, 3)}
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-slate-200 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Today" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Class List */}
      <div className="space-y-3">
        {classesForDay.length === 0 ? (
          <div className="text-center py-14 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white">No classes on {selectedDay}</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You are free or haven’t added any lecture periods for this day yet.
            </p>
            <button
              onClick={() => onAddNewClass(selectedDay)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-200 text-slate-950"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Class
            </button>
          </div>
        ) : (
          classesForDay.map((lecture) => {
            const isActive = isTaskCurrentlyActive(lecture, currentTime) && currentDay === selectedDay;
            const isVle = lecture.venue.toUpperCase().includes('VLE');
            const isLab = lecture.venue.toUpperCase().includes('LAB');
            const isField = lecture.venue.toUpperCase().includes('FIELD');

            return (
              <div
                key={lecture.id}
                onClick={() => onEditItem(lecture)}
                className={`relative group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500'
                    : 'border-white/15 bg-slate-900/80 hover:border-white/35 hover:bg-slate-900 shadow-md shadow-slate-950/40'
                }`}
              >
                {/* Left vertical accent line */}
                <div
                  className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${
                    isActive
                      ? 'bg-emerald-400'
                      : isVle
                      ? 'bg-purple-400'
                      : isLab
                      ? 'bg-amber-400'
                      : isField
                      ? 'bg-emerald-400'
                      : 'bg-white'
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-2">
                  <div className="min-w-0">
                    {/* Time & Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-mono font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        {formatTime12h(lecture.startTime)} – {formatTime12h(lecture.endTime)}
                      </span>

                      {isActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                          Active Now
                        </span>
                      )}

                      {/* Venue Badge */}
                      {isVle ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          <Video className="w-3 h-3" />
                          VLE Online
                        </span>
                      ) : isLab ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Building className="w-3 h-3" />
                          GEO LAB ONLY
                        </span>
                      ) : isField ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <Compass className="w-3 h-3" />
                          Fieldwork
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                          <MapPin className="w-3 h-3 text-slate-300" />
                          {lecture.venue}
                        </span>
                      )}

                      {lecture.reminderEnabled && (
                        <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/60 flex items-center gap-1">
                          <Bell className="w-2.5 h-2.5 text-emerald-400" />
                          {(lecture.advanceMinutes && lecture.advanceMinutes.length > 0
                            ? lecture.advanceMinutes
                            : [10, 5]
                          )
                            .map((m) => `${m}m`)
                            .join(', ')}{' '}
                          + start
                        </span>
                      )}
                    </div>

                    {/* Big Bold Class Title */}
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 truncate">
                      {lecture.title}
                    </h3>

                    {lecture.notes && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {lecture.notes}
                      </p>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {/* Toggle reminder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItem(lecture.id, { reminderEnabled: !lecture.reminderEnabled });
                      }}
                      title={lecture.reminderEnabled ? 'Reminder enabled' : 'Reminder muted'}
                      className={`p-2 rounded-xl text-xs font-medium border transition ${
                        lecture.reminderEnabled
                          ? 'bg-white/15 text-white border-white/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {lecture.reminderEnabled ? (
                        <Bell className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>

                    {/* Speak reminder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testTriggerAlarm(lecture);
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
                        onEditItem(lecture);
                      }}
                      title="Edit class"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove "${lecture.title}" from ${selectedDay}?`)) {
                          deleteItem(lecture.id);
                        }
                      }}
                      title="Delete class"
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
