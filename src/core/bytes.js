// Bayt bicimlendirme yardimcilari (saf mantik, Electron bagimliligi yok).

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

// 1234567890 -> "1.15 GB" (ondalik 1000 tabani)
export function formatBytes(bytes, decimals = 2) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new RangeError(`Gecersiz bayt degeri: ${bytes}`);
  }
  if (bytes === 0) return '0 B';
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const fixed = unit === 0 ? String(value) : value.toFixed(decimals);
  return `${fixed} ${UNITS[unit]}`;
}

// Dolu/toplam oranini yuzde (0..100) dondurur. Toplam 0 ise 0.
export function usedPercent(used, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(used) || used < 0) return 0;
  const pct = (used / total) * 100;
  return Math.min(100, Math.max(0, pct));
}