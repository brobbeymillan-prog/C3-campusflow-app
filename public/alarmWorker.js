/**
 * Dedicated Background Web Worker for Campus Flow
 * Unlike main thread timers, Web Workers run on an isolated OS thread
 * and are NOT throttled or suspended when the PWA window is minimized or hidden.
 */
let timerId = null;

self.onmessage = function (e) {
  if (e.data && e.data.type === 'START') {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      self.postMessage({ type: 'TICK', timestamp: Date.now() });
    }, 1000);
  } else if (e.data && e.data.type === 'STOP') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
