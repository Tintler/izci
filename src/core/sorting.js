// Siralama mantigi (saf; db/DOM bagimliligi yok).
// ORDER BY parcasini whitelist uzerinden uretir (SQL injection'a kapali).

export const SORT_KEYS = ['name', 'size', 'mtime', 'kind'];

// sortBy -> SQL kolon ifadesi. Bilinmeyen anahtar 'name' sayilir.
const COLUMN_MAP = {
  name: 'e.name COLLATE NOCASE',
  size: 'e.size',
  mtime: 'e.mtime',
};

// sortBy ve yone gore guvenli bir ORDER BY ifadesi uretir.
// foldersFirst: klasorler her zaman ustte (varsayilan true).
// Tur (kind) DB'de hesaplanamadigi icin 'name'e duser (render'da tekrar sirala).
export function resolveOrderBy(sortBy, desc = false, { foldersFirst = true } = {}) {
  const key = SORT_KEYS.includes(sortBy) ? sortBy : 'name';
  const column = COLUMN_MAP[key] || COLUMN_MAP.name;
  const dir = desc ? 'DESC' : 'ASC';
  const parts = [];
  if (foldersFirst) parts.push('e.is_dir DESC');
  // NULL'lari sonda tut (ASC'te once gelmesinler).
  if (key === 'size' || key === 'mtime') parts.push(`${column} IS NULL`);
  parts.push(`${column} ${dir}`);
  return parts.join(', ');
}

// Bellekteki sonuc dizisini 'tur' (iconKind) icin siralar; diger anahtarlar
// zaten SQL'de siralanmistir. Saf fonksiyon (kucuk kumeler icin).
export function sortByKind(rows, desc = false) {
  const order = ['folder', 'image', 'video', 'audio', 'file'];
  const rank = (r) => {
    const i = order.indexOf(r.iconKind);
    return i < 0 ? order.length : i;
  };
  const sorted = [...rows].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1; // klasorler once
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return String(a.name).localeCompare(String(b.name), 'tr');
  });
  return desc ? sorted.reverse() : sorted;
}