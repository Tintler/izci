// Klasor gezintisi (saf mantik; db enjekte edilir).
// Bir diskin kokunu veya bir klasorun cocuklarini listeler.

import { iconKind } from './icons.js';
import { dirName } from './search.js';
import { resolveOrderBy, sortByKind } from './sorting.js';

const DEFAULT_LIMIT = 20000;

const SELECT_COLUMNS = `
  e.id AS id, e.name AS name, e.path AS path, e.is_dir AS is_dir,
  e.size AS size, e.mtime AS mtime, e.hw_id AS hw_id,
  d.custom_label AS custom_label, d.volume_label AS volume_label,
  d.current_letter AS current_letter`;

// parentId null ise diskin kok kayitlari (parent_id IS NULL) doner.
// Aksi halde o klasorun dogrudan cocuklari. Klasorler once, sonra secilen sira.
// sortBy: 'name' | 'size' | 'mtime' | 'kind'; desc: azalan mi.
export function listChildren(
  db,
  hwId,
  parentId = null,
  { limit = DEFAULT_LIMIT, sortBy = 'name', desc = false } = {}
) {
  if (!hwId) throw new Error('Disk kimligi (hwId) zorunlu.');

  const capped = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, 100000));
  const isKindSort = sortBy === 'kind';
  const orderBy = resolveOrderBy(isKindSort ? 'name' : sortBy, desc);

  let rows;
  if (parentId === null || parentId === undefined) {
    rows = db
      .prepare(
        `SELECT ${SELECT_COLUMNS}
         FROM entries e
         JOIN drives d ON d.hw_id = e.hw_id
         WHERE e.hw_id = ? AND e.parent_id IS NULL
         ORDER BY ${orderBy}
         LIMIT ?`
      )
      .all(hwId, capped);
  } else {
    rows = db
      .prepare(
        `SELECT ${SELECT_COLUMNS}
         FROM entries e
         JOIN drives d ON d.hw_id = e.hw_id
         WHERE e.hw_id = ? AND e.parent_id = ?
         ORDER BY ${orderBy}
         LIMIT ?`
      )
      .all(hwId, parentId, capped);
  }

  const mapped = rows.map(mapRow);
  return isKindSort ? sortByKind(mapped, desc) : mapped;
}

// Bir klasorun tek kaydini (breadcrumb/ilerleme icin) dondurur.
export function getEntry(db, id) {
  const row = db
    .prepare(
      `SELECT ${SELECT_COLUMNS}
       FROM entries e
       JOIN drives d ON d.hw_id = e.hw_id
       WHERE e.id = ?`
    )
    .get(id);
  return row ? mapRow(row) : null;
}

// Kokten verilen klasore kadar breadcrumb zinciri (en ustte disk koku).
export function breadcrumb(db, entryId) {
  const chain = [];
  let currentId = entryId;
  const guard = 1000; // dongu koruması (bozuk parent_id)
  let steps = 0;
  while (currentId !== null && currentId !== undefined && steps < guard) {
    const entry = getEntry(db, currentId);
    if (!entry) break;
    chain.unshift({ id: entry.id, name: entry.name, path: entry.path });
    currentId = db.prepare('SELECT parent_id FROM entries WHERE id = ?').get(currentId)?.parent_id;
    steps += 1;
  }
  return chain;
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
    mtime: row.mtime,
    hwId: row.hw_id,
    driveLabel: row.custom_label || row.volume_label || 'Etiketsiz disk',
    letter: row.current_letter,
  };
}