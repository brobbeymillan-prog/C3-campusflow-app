/**
 * 100% Offline Audio Alarm and Voice Synthesis Engine
 * Works completely offline with zero external audio assets or network requests.
 */

let audioCtx: AudioContext | null = null;
let currentAlarmInterval: number | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Synthesizes a loud, clear, attention-grabbing university chime pattern.
 * Uses Web Audio API without needing any external audio file downloads.
 */
export function playLoudAlarmSound(volume = 0.9): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Harmonic chimes: C5, E5, G5, C6 (University bell sequence)
    const notes = [
      { freq: 523.25, time: 0, duration: 0.6 },
      { freq: 659.25, time: 0.18, duration: 0.6 },
      { freq: 783.99, time: 0.36, duration: 0.6 },
      { freq: 1046.50, time: 0.54, duration: 1.0 },
      // Second burst - louder urgency beeps
      { freq: 880.00, time: 1.2, duration: 0.2 },
      { freq: 1174.66, time: 1.45, duration: 0.2 },
      { freq: 1396.91, time: 1.7, duration: 0.4 },
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Rich bell-like timbre using triangle wave
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      // Attack and exponential decay
      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(volume, now + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  } catch (err) {
    console.warn('AudioContext playback error (safe to ignore if blocked by autoplay):', err);
  }
}

/**
 * Triggers physical vibration on supported mobile devices
 */
export function triggerHapticVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Urgent rhythm: buzz-pause-buzz-pause-long buzz
      navigator.vibrate([300, 150, 300, 150, 600]);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }
}

/**
 * Speaks Charlie Milan's voice prompt using native Web Speech Synthesis
 * Offline: Works on all modern Android devices and desktops without internet.
 */
export function speakVoiceAlert(
  taskTitle: string,
  venue: string,
  startTime: string,
  studentName = 'Charlie Milan',
  customPhrase = 'Charlie Milan, you have to do this',
  rate = 0.95,
  pitch = 1.0
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    // Cancel previous utterance
    window.speechSynthesis.cancel();

    // Construct the spoken message:
    // 1. "Charlie Milan, you have to do this."
    // 2. "Hey Charlie Milan, it's [TIME] — you have [TASK] now at [VENUE]."
    const locationPart = venue ? ` at ${venue}` : '';
    const fullText = `${customPhrase}. Hey ${studentName}, it's ${startTime} — you have ${taskTitle} now${locationPart}!`;

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    // Pick best available voice (English preferably)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        (v.lang.startsWith('en-GB') || v.lang.startsWith('en-US') || v.lang.startsWith('en')) &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Mobile') || !v.localService)
    ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Displays a system notification offline
 */
export async function showOfflineNotification(
  title: string,
  body: string
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
    // Try service worker notification first (better background display on Android)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        const swOptions = {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: `campus-flow-${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          vibrate: [300, 150, 300, 150, 600],
        };
        await reg.showNotification(title, swOptions as NotificationOptions);
        return true;
      }
    }

    // Direct browser notification fallback
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: `campus-flow-${Date.now()}`,
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
}
