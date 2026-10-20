/**
 * 100% Offline Audio Alarm and Voice Synthesis Engine
 * Supports:
 * - Native Web Speech Synthesis with Distinct Male & Female voice selections
 * - Advance reminders (e.g. 5m, 10m, 30m before class)
 * - Loud synthesized harmonic campus chimes via Web Audio API
 * - Interactive background notifications via Service Worker and Desktop Web Notifications
 * - Taskbar / window title flashing when minimized outside the app
 * - Haptic mobile vibration
 */

let audioCtx: AudioContext | null = null;
let currentAlarmInterval: number | null = null;
let flashInterval: number | null = null;
let originalTitle = typeof document !== 'undefined' ? document.title : 'Campus Flow';

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Synthesizes a loud, clear university chime pattern.
 * Uses Web Audio API without needing external sound file downloads.
 */
export function playLoudAlarmSound(volume = 0.9): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Harmonic bell sequence: C5, E5, G5, C6 (classic university chime)
    const notes = [
      { freq: 523.25, time: 0, duration: 0.6 },
      { freq: 659.25, time: 0.18, duration: 0.6 },
      { freq: 783.99, time: 0.36, duration: 0.6 },
      { freq: 1046.5, time: 0.54, duration: 1.0 },
      // Urgency alert beeps
      { freq: 880.0, time: 1.2, duration: 0.2 },
      { freq: 1174.66, time: 1.45, duration: 0.2 },
      { freq: 1396.91, time: 1.7, duration: 0.4 },
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(volume, now + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  } catch (err) {
    console.warn('AudioContext playback error (safe to ignore if autoplay paused):', err);
  }
}

/**
 * Triggers physical vibration on supported mobile devices
 */
export function triggerHapticVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 150, 300, 150, 600]);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }
}

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'other';
}

/**
 * Categorizes system voices into Male and Female
 */
export function getCategorizedVoices(): {
  male: VoiceOption[];
  female: VoiceOption[];
  all: VoiceOption[];
} {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { male: [], female: [], all: [] };
  }

  const voices = window.speechSynthesis.getVoices();

  const maleKeywords = [
    'male',
    'david',
    'mark',
    'george',
    'guy',
    'daniel',
    'oliver',
    'arthur',
    'james',
    'john',
    'michael',
    'richard',
    'thomas',
    'charles',
    'brian',
    'alec',
    'fred',
    'stephen',
    'ryan',
    'eric',
    'alex',
    'sfg',
    'rjs#male',
  ];

  const femaleKeywords = [
    'female',
    'zira',
    'jenny',
    'hazel',
    'samantha',
    'victoria',
    'karen',
    'fiona',
    'susan',
    'catherine',
    'linda',
    'elizabeth',
    'mary',
    'sarah',
    'anna',
    'eva',
    'cortana',
    'siri',
    'tpf',
    'rjs#female',
  ];

  const list: VoiceOption[] = voices.map((v) => {
    const nameLower = v.name.toLowerCase();
    let gender: 'male' | 'female' | 'other' = 'other';

    if (maleKeywords.some((k) => nameLower.includes(k))) {
      gender = 'male';
    } else if (femaleKeywords.some((k) => nameLower.includes(k))) {
      gender = 'female';
    } else if (nameLower.includes('male')) {
      gender = 'male';
    } else if (nameLower.includes('female')) {
      gender = 'female';
    } else if (nameLower.includes('uk english male')) {
      gender = 'male';
    } else if (nameLower.includes('uk english female') || nameLower.includes('us english')) {
      gender = 'female';
    } else {
      gender = 'female';
    }

    return {
      voice: v,
      name: v.name,
      lang: v.lang,
      gender,
    };
  });

  return {
    male: list.filter((v) => v.gender === 'male'),
    female: list.filter((v) => v.gender === 'female'),
    all: list,
  };
}

export interface VoiceAlertParams {
  taskTitle: string;
  venue?: string;
  startTime?: string;
  studentName?: string;
  customPhrase?: string;
  rate?: number;
  pitch?: number;
  gender?: 'male' | 'female' | 'auto';
  voiceURI?: string;
  minutesBefore?: number; // 0 for at start time, 5 for 5 min before, 10 for 10 min before, etc.
}

/**
 * Speaks Charlie Milan's voice prompt using native Web Speech Synthesis
 * Supports both object parameter and legacy positional arguments.
 */
export function speakVoiceAlert(
  paramsOrTitle: VoiceAlertParams | string,
  legacyVenue = '',
  legacyStartTime = '',
  legacyStudentName = 'Charlie Milan',
  legacyCustomPhrase = 'Charlie Milan, you have to do this'
): Promise<void> {
  let params: VoiceAlertParams;

  if (typeof paramsOrTitle === 'string') {
    params = {
      taskTitle: paramsOrTitle,
      venue: legacyVenue,
      startTime: legacyStartTime,
      studentName: legacyStudentName,
      customPhrase: legacyCustomPhrase,
      gender: 'female',
      minutesBefore: 0,
    };
  } else {
    params = paramsOrTitle;
  }

  const {
    taskTitle,
    venue = '',
    startTime = '',
    studentName = 'Charlie Milan',
    customPhrase = 'Charlie Milan, you have to do this',
    rate = 0.95,
    pitch: userPitch = 1.0,
    gender = 'female',
    voiceURI,
    minutesBefore = 0,
  } = params;

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    // Construct spoken message based on whether it is an advance warning or starting right now
    const locationPart = venue ? ` at ${venue}` : '';
    let speechContent = '';

    if (minutesBefore > 0) {
      if (minutesBefore === 5) {
        speechContent = `${customPhrase}. Hey ${studentName}, in 5 minutes you have ${taskTitle}${locationPart}${
          startTime ? ` at ${startTime}` : ''
        }!`;
      } else if (minutesBefore === 10) {
        speechContent = `${customPhrase}. Heads up ${studentName}! In 10 minutes you have ${taskTitle}${locationPart}${
          startTime ? ` at ${startTime}` : ''
        }!`;
      } else if (minutesBefore === 30) {
        speechContent = `${customPhrase}. Heads up ${studentName}! In 30 minutes you have ${taskTitle}${locationPart}${
          startTime ? ` at ${startTime}` : ''
        }!`;
      } else {
        speechContent = `${customPhrase}. Hey ${studentName}, in ${minutesBefore} minutes you have ${taskTitle}${locationPart}${
          startTime ? ` at ${startTime}` : ''
        }!`;
      }
    } else {
      speechContent = `${customPhrase}. Hey ${studentName}, it's ${startTime || 'time'} — you have ${taskTitle} now${locationPart}!`;
    }

    const utterance = new SpeechSynthesisUtterance(speechContent);
    utterance.volume = 1.0;

    // Adjust pitch and rate to ensure distinct Male / Female timbre:
    // Male: deeper resonance (pitch ~0.82)
    // Female: crisp and melodic (pitch ~1.14)
    if (gender === 'male') {
      utterance.pitch = userPitch === 1.0 ? 0.82 : userPitch * 0.82;
      utterance.rate = rate * 0.94;
    } else {
      utterance.pitch = userPitch === 1.0 ? 1.14 : userPitch * 1.14;
      utterance.rate = rate * 0.98;
    }

    // Voice Selection
    const categorized = getCategorizedVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (voiceURI) {
      const match = categorized.all.find((v) => v.name === voiceURI || v.voice.voiceURI === voiceURI);
      if (match) selectedVoice = match.voice;
    }

    if (!selectedVoice) {
      if (gender === 'male' && categorized.male.length > 0) {
        selectedVoice =
          categorized.male.find((v) => v.lang.startsWith('en'))?.voice || categorized.male[0]?.voice;
      } else if (gender === 'female' && categorized.female.length > 0) {
        selectedVoice =
          categorized.female.find((v) => v.lang.startsWith('en'))?.voice || categorized.female[0]?.voice;
      } else {
        selectedVoice =
          categorized.all.find((v) => v.lang.startsWith('en'))?.voice || categorized.all[0]?.voice;
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Previews voice immediately so the user can test Male vs Female choice
 */
export function previewVoiceAlert(
  gender: 'male' | 'female',
  studentName = 'Charlie Milan',
  customPhrase = 'Charlie Milan, you have to do this',
  voiceURI?: string
): Promise<void> {
  return speakVoiceAlert({
    taskTitle: 'Paleontology',
    venue: 'CCJ3',
    startTime: '6:00 AM',
    studentName,
    customPhrase,
    gender,
    voiceURI,
    minutesBefore: 0,
  });
}

/**
 * Flashes the document title to attract user attention when window is in background / minimized
 */
export function flashWindowNotification(taskTitle: string, venue: string): void {
  if (typeof document === 'undefined') return;
  stopWindowFlash();

  let toggle = false;
  originalTitle = document.title;
  flashInterval = window.setInterval(() => {
    document.title = toggle
      ? `🚨 [ALERT] ${taskTitle} (${venue || 'Now'})!`
      : `⏰ HEY CHARLIE MILAN! Check Campus Flow`;
    toggle = !toggle;
  }, 900);
}

export function stopWindowFlash(): void {
  if (flashInterval !== null) {
    clearInterval(flashInterval);
    flashInterval = null;
    if (typeof document !== 'undefined') {
      document.title = originalTitle || 'Campus Flow - University Timetable';
    }
  }
}

/**
 * Displays a system notification offline with vibration and lockscreen persistence
 */
export async function showOfflineNotification(
  title: string,
  body: string,
  extraData?: Record<string, unknown>
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return false;
  }

  try {
    // Try service worker notification first (better background display on Android & Windows)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        const swOptions = {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `campus-flow-${Date.now()}`,
          renotify: true,
          requireInteraction: true, // Keeps notification visible until Charlie acknowledges
          vibrate: [300, 150, 300, 150, 600],
          data: extraData || {},
        };
        await reg.showNotification(title, swOptions as NotificationOptions);
        return true;
      }
    }

    // Direct browser notification fallback
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: `campus-flow-${Date.now()}`,
      requireInteraction: true,
    });
    return true;
  } catch (err) {
    console.warn('Could not post system notification:', err);
    return false;
  }
}

/**
 * Starts continuous alarm beeping until dismissed
 */
export function startAlarmLoop(volume = 0.9): () => void {
  stopAlarmLoop();
  playLoudAlarmSound(volume);
  triggerHapticVibration();

  // Re-chime every 4 seconds until user dismisses
  currentAlarmInterval = window.setInterval(() => {
    playLoudAlarmSound(volume);
    triggerHapticVibration();
  }, 4000);

  return stopAlarmLoop;
}

export function stopAlarmLoop(): void {
  if (currentAlarmInterval !== null) {
    clearInterval(currentAlarmInterval);
    currentAlarmInterval = null;
  }
  stopWindowFlash();
}
