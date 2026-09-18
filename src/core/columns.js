// Kolon genisligi mantigi (saf; Electron/DOM bagimliligi yok).
// Genislikler YUZDE cinsindendir ve toplamlari ~100'dur; boylece pencere
// boyutu degisince kolonlar orantili esner. Kullanici surukleyerek degistirir,
// program localStorage'da saklar.

export const MIN_COLUMN_PX = 60;
export const COLUMN_COUNT = 4;

// Varsayilan yuzdeler: Ad, Tur/Disk, Yol, Boyut.
export const DEFAULT_PERCENTS = [34, 20, 34, 12];

// Varsayilan genisliklerin kopyasini dondurur.
export function defaultPercents() {
  return [...DEFAULT_PERCENTS];
}

// Tek bir kolonu deltaPx kadar genisletir/daraltir; komsu ters yonde kayar
// (toplam sabit kalir). totalWidth: container genisligi (px).
// minPx altina inilmesini engeller. Uygulanan gercek delta px olarak doner.
export function applyResize(percents, index, deltaPx, totalWidth, { minPx = MIN_COLUMN_PX } = {}) {
  if (!Array.isArray(percents) || index < 0 || index >= percents.length - 1) {
    return { percents: percents ? [...percents] : [], appliedPx: 0 };
  }
  if (!Number.isFinite(totalWidth) || totalWidth <= 0) {
    return { percents: [...percents], appliedPx: 0 };
  }

  const minPct = (minPx / totalWidth) * 100;
  const next = [...percents];
  const a = next[index];
  const b = next[index + 1];

  let deltaPct = (deltaPx / totalWidth) * 100;
  const maxGrow = b - minPct;
  const maxShrink = minPct - a;
  if (deltaPct > maxGrow) deltaPct = maxGrow;
  if (deltaPct < maxShrink) deltaPct = maxShrink;

  next[index] = a + deltaPct;
  next[index + 1] = a + b - next[index];
  return { percents: next, appliedPx: (deltaPct / 100) * totalWidth };
}

// Yuzdeleri localStorage icin metne cevirir (2 ondalik).
export function serializePercents(percents) {
  if (!Array.isArray(percents)) return '';
  return percents.map((p) => Number(p).toFixed(2)).join(',');
}

// Metni yuzde dizisine cevirir. Bozuk/gecersizse null.
export function parsePercents(text, expectedCount = COLUMN_COUNT) {
  if (typeof text !== 'string' || text.trim() === '') return null;
  const parts = text.split(',').map((p) => Number(p.trim()));
  if (parts.length !== expectedCount) return null;
  if (!parts.every((n) => Number.isFinite(n) && n > 0 && n < 100)) return null;
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum < 99 || sum > 101) return null;
  return parts;
}