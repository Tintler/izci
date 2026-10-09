// WM_DEVICECHANGE yardimcilari (saf; Electron'a bagimli degil).
// Uygulama yalnizca acikken pencereye gelen mesajlar dinlenir; polling yok.

export const WM_DEVICECHANGE = 0x0219;
export const DBT_DEVICEARRIVAL = 0x8000;
export const DBT_DEVICEREMOVECOMPLETE = 0x8004;
export const DBT_DEVNODES_CHANGED = 0x0007;

const DRIVE_EVENTS = new Set([
  DBT_DEVICEARRIVAL,
  DBT_DEVICEREMOVECOMPLETE,
  DBT_DEVNODES_CHANGED,
]);

// hookWindowMessage wParam'i Buffer olarak verir (32/64 bit). Sayi da kabul edilir.
export function readEventCode(wParam) {
  if (typeof wParam === 'number') return wParam >>> 0;
  if (wParam && typeof wParam.readUInt32LE === 'function' && wParam.length >= 4) {
    return wParam.readUInt32LE(0);
  }
  return null;
}

// Disk listesini etkileyebilecek bir olay mi?
export function isDriveChangeEvent(wParam) {
  const code = readEventCode(wParam);
  return code !== null && DRIVE_EVENTS.has(code);
}

// Kisa surede gelen olay yagmurunu tek cagriya indirir ve cagrilari siralar:
// - Son olaydan `delayMs` sonra `fn` bir kez calisir.
// - `fn` calisirken yeni olay gelirse, bittikten sonra bir kez daha calisir.
// `timers` test icin enjekte edilebilir.
export function createCoalescer(fn, delayMs, timers = { setTimeout, clearTimeout }) {
  let timer = null;
  let running = false;
  let pending = false;

  async function run() {
    timer = null;
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      await fn();
    } catch {
      // Hata cagiranin fn'i icinde ele alinir; zamanlayici bozulmaz.
    } finally {
      running = false;
      if (pending) {
        pending = false;
        trigger();
      }
    }
  }

  function trigger() {
    if (timer !== null) timers.clearTimeout(timer);
    timer = timers.setTimeout(run, delayMs);
  }

  function cancel() {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
    pending = false;
  }

  return { trigger, cancel };
}
