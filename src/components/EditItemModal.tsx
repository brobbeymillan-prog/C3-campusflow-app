import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  Tag,
  Calendar,
  Bell,
  Trash2,
  Check,
  BookOpen,
  Sparkles,
  Sliders,
  Plus,
} from 'lucide-react';
import { ScheduleItem, DayOfWeek, Category } from '../types/schedule';
import { DAYS_OF_WEEK } from '../utils/timeUtils';
import { useSchedule } from '../context/ScheduleContext';

interface EditItemModalProps {
  item: ScheduleItem | null; // null if creating a new item
  isOpen: boolean;
  onClose: () => void;
  defaultDay?: DayOfWeek;
  defaultCategory?: Category;
}

const VENUE_PRESETS = [
  'CCJ3',
  'CCG3',
  'CCF2',
  'LH1',
  'VLE',
  'GEO LAB only',
  'Mini Aud',
  'Field',
  'Room / Hostel',
  'Library',
  'Cafeteria',
];

const COURSE_PRESETS = [
  'Paleontology',
  'Crystallography and Mineralogy',
  'Intro Mining',
  'Optical Mineralogy',
  'PG & RS',
  'S.Geology',
  'Sed Petrology',
  'Maths Method',
  'G.Psychology',
];

const PRESET_LEAD_TIMES = [5, 10, 15, 30, 60];

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isOpen,
  onClose,
  defaultDay = 'Monday',
  defaultCategory = 'class',
}) => {
  const { addItem, updateItem, deleteItem, settings } = useSchedule();

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState<Category>('class');
  const [day, setDay] = useState<DayOfWeek | 'Daily'>('Monday');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [advanceMinutes, setAdvanceMinutes] = useState<number[]>([10, 5]);
  const [customMinInput, setCustomMinInput] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setVenue(item.venue || '');
      setCategory(item.category);
      setDay(item.day);
      setStartTime(item.startTime);
      setEndTime(item.endTime);
      setReminderEnabled(item.reminderEnabled);
      setAdvanceMinutes(
        item.advanceMinutes && item.advanceMinutes.length > 0
          ? item.advanceMinutes
          : settings.advanceReminderMinutes || [10, 5]
      );
      setNotes(item.notes || '');
    } else {
      // Defaults for new item
      setTitle('');
      setVenue(defaultCategory === 'class' ? 'CCJ3' : 'Hostel');
      setCategory(defaultCategory);
      setDay(defaultCategory === 'class' ? defaultDay : 'Daily');
      setStartTime('08:00');
      setEndTime('09:00');
      setReminderEnabled(true);
      setAdvanceMinutes(settings.advanceReminderMinutes || [10, 5]);
      setNotes('');
    }
  }, [item, isOpen, defaultDay, defaultCategory, settings.advanceReminderMinutes]);

  if (!isOpen) return null;

  const toggleLeadTime = (mins: number) => {
    if (advanceMinutes.includes(mins)) {
      setAdvanceMinutes(advanceMinutes.filter((m) => m !== mins));
    } else {
      setAdvanceMinutes([...advanceMinutes, mins].sort((a, b) => b - a));
    }
  };

  const handleAddCustomMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMinInput.trim(), 10);
    if (!isNaN(val) && val > 0 && val <= 180 && !advanceMinutes.includes(val)) {
      setAdvanceMinutes([...advanceMinutes, val].sort((a, b) => b - a));
      setCustomMinInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (item) {
      updateItem(item.id, {
        title: title.trim(),
        venue: venue.trim(),
        category,
        day,
        startTime,
        endTime,
        reminderEnabled,
        advanceMinutes,
        notes: notes.trim(),
      });
    } else {
      addItem({
        title: title.trim(),
        venue: venue.trim(),
        category,
        day,
        startTime,
        endTime,
        reminderEnabled,
        advanceMinutes,
        notes: notes.trim(),
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (item && confirm(`Are you sure you want to delete "${item.title}"?`)) {
      deleteItem(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                category === 'class'
                  ? 'bg-white/15 text-white'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {category === 'class' ? <BookOpen className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {item ? 'Edit Timetable Entry' : 'Add New Schedule Entry'}
              </h3>
              <p className="text-xs text-slate-400">
                Adjust lecture or routine times & reminder warnings
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Category Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory('class')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  category === 'class'
                    ? 'bg-white text-slate-950 border-white shadow-sm font-black'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                🎓 Academic Class (White)
              </button>
              <button
                type="button"
                onClick={() => setCategory('personal')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  category === 'personal'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm font-black'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                🌿 Personal Routine (Green)
              </button>
            </div>
          </div>

          {/* Title with Quick Course Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Title / Course Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Paleontology, Crystallography and Mineralogy, Intro Mining"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500 font-bold"
            />
            {/* Quick Course Suggestions */}
            {category === 'class' && (
              <div className="flex flex-wrap gap-1 mt-2">
                {COURSE_PRESETS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setTitle(c)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:text-white hover:bg-slate-700 transition"
                  >
                    + {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Venue / Location & Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Venue / Location
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. CCJ3, CCG3, VLE, LH1, GEO LAB only, Hostel"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500 font-medium"
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VENUE_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setVenue(p)}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border transition ${
                    venue === p
                      ? 'bg-white text-slate-950 border-white font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Day of Week
            </label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as DayOfWeek | 'Daily')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="Daily">Daily (Every Day Routine)</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Start and End Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Start Time (24h)
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                End Time (24h)
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Reminder Toggle & Lead Times Configuration */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Voice & Alarm Reminders</p>
                  <p className="text-[11px] text-slate-400">
                    Speaks voice & plays chime offline
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded bg-slate-700 border-slate-600 focus:ring-emerald-500"
              />
            </div>

            {reminderEnabled && (
              <div className="pt-2 border-t border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    When to remind you (Lead Times):
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    Always alerts at 0m (start)
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LEAD_TIMES.map((m) => {
                    const active = advanceMinutes.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleLeadTime(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          active
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {active ? `✓ ${m}m before` : `${m}m before`}
                      </button>
                    );
                  })}
                </div>

                {/* Custom minute entry */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">Custom warning:</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    placeholder="e.g. 20"
                    value={customMinInput}
                    onChange={(e) => setCustomMinInput(e.target.value)}
                    className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400">mins</span>
                  <button
                    type="button"
                    onClick={handleAddCustomMinutes}
                    className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Notes / Course Checklist (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bring thin section kit, VLE password, revision chapters 1-4"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            {item ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 border border-rose-900/60 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-white hover:bg-slate-200 text-slate-950 shadow-md shadow-white/10 transition active:scale-95"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                {item ? 'Save Changes' : 'Add to Timetable'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
