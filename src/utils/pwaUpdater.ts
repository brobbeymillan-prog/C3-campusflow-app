import { registerSW } from 'virtual:pwa-register';

export interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateApp: (reloadPage?: boolean) => Promise<void>;
  checkForUpdates: () => Promise<boolean>;
  lastChecked: Date | null;
}

let updateFunction: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
const listeners: Array<(state: { needRefresh: boolean; offlineReady: boolean }) => void> = [];

let currentState = {
  needRefresh: false,
  offlineReady: false,
};

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...currentState }));
}

/**
 * Initialize service worker registration with automatic update checks
 */
export function initPWAUpdater() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    updateFunction = registerSW({
      immediate: true,
      onNeedRefresh() {
        currentState.needRefresh = true;
        notifyListeners();
        console.log('[Campus Flow PWA] New version detected and ready to reload.');
      },
      onOfflineReady() {
        currentState.offlineReady = true;
        notifyListeners();
        console.log('[Campus Flow PWA] App is cached and ready for offline use.');
      },
      onRegisteredSW(_swUrl, r) {
        if (r) {
          swRegistration = r;

          // Check for updates periodically every 60 seconds
          setInterval(() => {
            if (navigator.onLine && r) {
              r.update().catch((err) => console.warn('[PWA] SW update check failed:', err));
            }
          }, 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.error('[Campus Flow PWA] Service worker registration failed:', error);
      },
    });

    // Check for updates whenever the user switches back to the installed app window
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine && swRegistration) {
        swRegistration.update().catch(() => {});
      }
    });

    window.addEventListener('focus', () => {
      if (navigator.onLine && swRegistration) {
        swRegistration.update().catch(() => {});
      }
    });
  } catch (err) {
    console.warn('[Campus Flow PWA] registerSW init failed:', err);
  }
}

/**
 * Force check for updates and refresh caches
 */
export async function forceCheckForUpdates(): Promise<{ updated: boolean; message: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { updated: false, message: 'Service workers are not supported on this browser.' };
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      swRegistration = reg;
      await reg.update();
      if (reg.waiting) {
        // A new service worker is waiting
        if (updateFunction) {
          await updateFunction(true);
        } else {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
        return { updated: true, message: 'New update found and applied!' };
      }
    }

    // In standalone or browser mode, trigger reload to activate updated assets
    window.location.reload();
    return { updated: true, message: 'App reloaded with latest version.' };
  } catch (error) {
    console.error('Error checking for updates:', error);
    window.location.reload();
    return { updated: false, message: 'Reloading app...' };
  }
}

/**
 * Hook or listener subscriber for React components
 */
export function subscribePWAUpdates(callback: (state: { needRefresh: boolean; offlineReady: boolean }) => void) {
  listeners.push(callback);
  callback({ ...currentState });
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function applyPWAUpdate() {
  if (updateFunction) {
    updateFunction(true);
  } else {
    window.location.reload();
  }
}
