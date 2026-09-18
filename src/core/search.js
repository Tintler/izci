// Arama (saf mantik; db enjekte edilir).
// FTS5 varsa MATCH (onek arama + rank sirasi), yoksa LIKE tabanina duser.

import { iconKind } from './icons.js';
import { resolveOrderBy, sortByKind } from './sorting.js';

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 100000;

// Sorguyu bosluga gore jetonlara ayirir. Bos/gecersiz girdi -> [].
export function tokenizeQuery(raw) {
  if (raw === null || raw === undefined) return [];
  return String(raw)
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// FTS5 MATCH ifadesi uretir: her jeton tirnaklanir ve onek (*) eklenir.
// Tirnak, FTS5 sozdizimi ozel karakterlerini notrler (guvenli).
export function buildFtsQuery(raw) {
  const tokens = tokenizeQuery(raw);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"*`).join(' ');
}

// LIKE icin ozel karakterleri kacirir (%, _, \).
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Bir yolun ebeveyn dizinini dondurur (dosya adini icermez).
// "F:\\Medya\\film.mkv" -> "F:\\Medya"; "F:\\notes.txt" -> "F:\\"; "F:\\" -> "F:\\"
// Windows ve Unix ayraclari birlikte desteklenir.
export function dirName(p) {
  const s = String(p).replace(/[\\/]+$/, '');
  const idx = Math.max(s.lastIndexOf('\\'), s.lastIndexOf('/'));
  if (idx < 0) return '';
  const parent = s.slice(0, idx);
  if (parent.length === 0) return s.slice(0, idx + 1); // "\\foo" -> "\\"
  if (/^[A-Za-z]:$/.test(parent)) return `${parent}\\`; // "F:" -> "F:\\"
  return parent;
}

const SELECT_COLUMNS = `
  e.id AS id, e.name AS name, e.path AS path, e.is_dir AS is_dir,
  e.size AS size, e.hw_id AS hw_id,
  d.custom_label AS custom_label, d.volume_label AS volume_label,
  d.current_letter AS current_letter`;

// Arama yapar; normalize edilmis sonuc dizisi dondurur.
// sortBy: 'name' | 'size' | 'mtime' | 'kind'; desc: azalan mi.
export function searchEntries(
  db,
  { query, ftsAvailable = false, limit = DEFAULT_LIMIT, sortBy = 'name', desc = false } = {}
) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const capped = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT));
  const isKindSort = sortBy === 'kind';
  // Tur sirasi DB'de hesaplanamaz; once isimle alip bellekte siralariz.
  const orderBy = resolveOrderBy(isKindSort ? 'name' : sortBy, desc);

  let rows;
  if (ftsAvailable) {
    const match = buildFtsQuery(query);
    rows = db
      .prepare(
        `SELECT ${SELECT_COLUMNS}
         FROM entries_fts f
         JOIN entries e ON e.id = f.rowid
         JOIN drives d ON d.hw_id = e.hw_id
         WHERE entries_fts MATCH ?
         ORDER BY ${orderBy}
         LIMIT ?`
      )
      .all(match, capped);
  } else {
    const clauses = tokens
      .map(() => "(e.name LIKE ? ESCAPE '\\' OR e.path LIKE ? ESCAPE '\\')")
      .join(' AND ');
    const params = [];
    for (const t of tokens) {
      const like = `%${escapeLike(t)}%`;
      params.push(like, like);
    }
    params.push(capped);
    rows = db
      .prepare(
        `SELECT ${SELECT_COLUMNS}
         FROM entries e
         JOIN drives d ON d.hw_id = e.hw_id
         WHERE ${clauses}
         ORDER BY ${orderBy}
         LIMIT ?`
      )
      .all(...params);
  }

  const mapped = rows.map(mapRow);
  return isKindSort ? sortByKind(mapped, desc) : mapped;
}

function mapRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    path: row.path,
    dir: dirName(row.path),
    iconKind: iconKind(row.name, row.is_dir === 1),
    isDir: row.is_dir === 1,
    size: row.size === null ? null : Number(row.size),
    hwId: row.hw_id,
    driveLabel: row.custom_label || row.volume_label || 'Etiketsiz disk',
    letter: row.current_letter,
  };
}