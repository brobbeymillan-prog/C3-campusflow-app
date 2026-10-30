import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, Monitor, Smartphone, AlertCircle, X, ArrowUpRight } from 'lucide-react';
import { subscribePWAUpdates, applyPWAUpdate, forceCheckForUpdates } from '../utils/pwaUpdater';

export const AppUpdateBanner: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if app is running in installed standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Subscribe to Service Worker updates
    const unsubscribe = subscribePWAUpdates((state) => {
      setNeedRefresh(state.needRefresh);
    });

    return () => unsubscribe();
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    setCheckStatus('Checking server for updates...');
    try {
      const res = await forceCheckForUpdates();
      setCheckStatus(res.message);
    } catch {
      setCheckStatus('Reloading application...');
      window.location.reload();
    } finally {
      setTimeout(() => {
        setIsChecking(false);
        setCheckStatus(null);
      }, 3500);
    }
  };

  const handleClearCacheAndReload = async () => {
    setIsChecking(true);
    setCheckStatus('Clearing old cache and fetching latest version...');
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
    // Hard reload
    window.location.reload();
  };

  return (
    <>
      {/* 1. Floating Banner when a new Service Worker version is detected */}
      {needRefresh && (
        <aside
          aria-label="App update available"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg animate-bounce-subtle shadow-2xl"
        >
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-400/50 shadow-emerald-950/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-white/20 rounded-xl flex-shrink-0 animate-spin">
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-black tracking-tight leading-snug">
                  🎉 New Campus Flow Update Ready!
                </p>
                <p className="text-[11px] text-emerald-100 truncate">
                  Tap to refresh and load your latest schedule changes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => applyPWAUpdate()}
                className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-950 text-xs font-black hover:bg-emerald-50 active:scale-95 transition shadow-md"
              >
                Reload Now
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                title="Dismiss"
                className="p-1 rounded-lg text-emerald-200 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Standalone Installed Mode Sync Header Pill / Quick Helper */}
      {isStandalone && (
        <aside
          aria-label="Installed app offline and sync status"
          className="bg-slate-900/90 border-b border-emerald-500/20 px-3 py-1.5 text-xs text-slate-300"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Installed App (Offline Enabled)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Updating...' : 'Sync Latest Changes'}</span>
              </button>

              <button
                onClick={() => setShowGuideModal(true)}
                className="text-[11px] text-slate-400 hover:text-white underline decoration-dotted transition"
              >
                How updates work?
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 3. Detailed Modal: "How Updates Show in Your Installed App" */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    How Installed App Updates Work
                  </h3>
                  <p className="text-xs text-slate-400">
                    Why changes require a reload & how to see them immediately
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGuideModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
              {/* Core Explanation Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Why doesn’t it update immediately without reloading?
                </div>
                <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                  When you installed Campus Flow on your computer or phone, it saved an offline copy of the files directly on your device so it opens instantly anywhere — even with <strong>zero internet or during data outages in Ghana</strong>.
                </p>
                <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                  Because installed standalone apps hide the browser’s URL bar and reload button, the app needs one click or shortcut to load the new version into memory.
                </p>
              </div>

              {/* 3 Simple Ways to Show Changes */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  3 Ways to make changes show right now:
                </h4>

                {/* Way 1: The in-app button */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs">
                      Click the "Sync & Force Reload" Button Below
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      This instantly clears the local offline cache, updates the service worker, and loads the freshest code.
                    </p>
                  </div>
                </div>

                {/* Way 2: Keyboard shortcut on Desktop */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-white/20 text-white font-black text-xs">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs">
                      Desktop Shortcut: Press <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-600 rounded text-amber-300 font-mono">Ctrl + R</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-600 rounded text-amber-300 font-mono">F5</kbd>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Inside your installed Campus Flow window, simply press <span className="text-white font-semibold">Ctrl + R</span> (or <span className="text-white font-semibold">Ctrl + Shift + R</span>) on Windows, or <span className="text-white font-semibold">Cmd + Shift + R</span> on Mac.
                    </p>
                  </div>
                </div>

                {/* Way 3: Mobile Apps */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-white/20 text-white font-black text-xs">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-xs">
                      Phone / Android: Close & Reopen the App
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Swipe Campus Flow away from your phone’s Recent Apps screen, make sure you are connected to the internet for a second, and reopen the app.
                    </p>
                  </div>
                </div>
              </div>

              {/* Automatic Background Check notice */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-[11px] text-slate-400">
                  Campus Flow now automatically checks for updates in the background every <span className="text-white font-bold">60 seconds</span> and whenever you focus or switch back to the app window!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleClearCacheAndReload}
                  disabled={isChecking}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Updating Now...' : '⚡ Force Clear Cache & Refresh Now'}</span>
                </button>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                >
                  Got It
                </button>
              </div>

              {checkStatus && (
                <p className="text-[11px] text-center text-emerald-400 font-mono animate-pulse">
                  {checkStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
