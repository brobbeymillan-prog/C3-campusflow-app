/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  GraduationCap,
  Sparkles,
  Settings as SettingsIcon,
  Plus,
  Share2,
} from 'lucide-react';
import { ScheduleProvider, useSchedule } from './context/ScheduleContext';
import { Header } from './components/Header';
import { TodayView } from './components/TodayView';
import { ClassTimetableView } from './components/ClassTimetableView';
import { PersonalRoutineView } from './components/PersonalRoutineView';
import { EditItemModal } from './components/EditItemModal';
import { ActiveAlarmModal } from './components/ActiveAlarmModal';
import { SettingsAndApkModal } from './components/SettingsAndApkModal';
import { ShareModal } from './components/ShareModal';
import { ScheduleItem, DayOfWeek, Category } from './types/schedule';
import { getCurrentDayOfWeek } from './utils/timeUtils';

type ActiveTab = 'today' | 'classes' | 'routine';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'settings' | 'apk'>('settings');
  const [defaultDayForNew, setDefaultDayForNew] = useState<DayOfWeek>('Monday');
  const [defaultCategoryForNew, setDefaultCategoryForNew] = useState<Category>('class');

  const { currentTime } = useSchedule();
  const todayDayName = getCurrentDayOfWeek(currentTime);

  const handleEditItem = (item: ScheduleItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleAddNewGeneral = () => {
    setEditingItem(null);
    setDefaultDayForNew(todayDayName === 'Saturday' || todayDayName === 'Sunday' ? 'Monday' : todayDayName);
    setDefaultCategoryForNew('class');
    setIsEditModalOpen(true);
  };

  const handleAddNewClass = (day: DayOfWeek) => {
    setEditingItem(null);
    setDefaultDayForNew(day);
    setDefaultCategoryForNew('class');
    setIsEditModalOpen(true);
  };

  const handleAddNewRoutine = () => {
    setEditingItem(null);
    setDefaultDayForNew('Monday');
    setDefaultCategoryForNew('personal');
    setIsEditModalOpen(true);
  };

  const handleOpenSettings = () => {
    setSettingsInitialTab('settings');
    setIsSettingsOpen(true);
  };

  const handleOpenApkGuide = () => {
    setSettingsInitialTab('apk');
    setIsSettingsOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top App Header */}
      <Header
        onOpenSettings={handleOpenSettings}
        onOpenApkGuide={handleOpenApkGuide}
        onOpenShare={() => setIsShareOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3.5 sm:p-6 pb-24">
        {/* Top Desktop/Tablet Navigation Tabs */}
        <div className="hidden sm:flex items-center gap-2 mb-6 p-1.5 rounded-2xl bg-slate-900 border border-white/10">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'today'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Today's Schedule
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'classes'
                ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Class TimeTable (White)
          </button>

          <button
            onClick={() => setActiveTab('routine')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'routine'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Personal Routine (Green)
          </button>
        </div>

        {/* View Routing */}
        {activeTab === 'today' && (
          <TodayView
            onEditItem={handleEditItem}
            onAddNew={handleAddNewGeneral}
          />
        )}

        {activeTab === 'classes' && (
          <ClassTimetableView
            onEditItem={handleEditItem}
            onAddNewClass={handleAddNewClass}
          />
        )}

        {activeTab === 'routine' && (
          <PersonalRoutineView
            onEditItem={handleEditItem}
            onAddNewRoutine={handleAddNewRoutine}
          />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation Bar (Thumb Friendly) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'today'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px]">Today</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'classes'
              ? 'text-white font-black scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px]">Classes</span>
        </button>

        <button
          onClick={() => setActiveTab('routine')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'routine'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">Routine</span>
        </button>

        <button
          onClick={() => setIsShareOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-slate-400 hover:text-white transition"
        >
          <Share2 className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px]">Share / QR</span>
        </button>

        <button
          onClick={handleOpenSettings}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition"
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>

      {/* Floating Action Button (FAB) for quick add on mobile */}
      <button
        onClick={handleAddNewGeneral}
        title="Add timetable event"
        className="sm:hidden fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full bg-gradient-to-tr from-white to-emerald-400 text-slate-950 shadow-xl shadow-black/60 flex items-center justify-center active:scale-90 transition border border-white/40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      <EditItemModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        defaultDay={defaultDayForNew}
        defaultCategory={defaultCategoryForNew}
      />

      <ActiveAlarmModal />

      <SettingsAndApkModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
        onOpenShare={() => setIsShareOpen(true)}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ScheduleProvider>
      <MainApp />
    </ScheduleProvider>
  );
}
