// Gezilen agaci SQLite'a yazan katman (saf mantik; db enjekte edilir).
//
// DIFF MODU: Diskteki mevcut kayitlar bellekte yuklenir; tarama sirasinda
// degismeyen (mtime + size + is_dir ayni) kayitlar YENIDEN YAZILMAZ, id'leri
// korunur. Tarama sonunda gorulmeyen kayitlar (silinmis dosyalar) temizlenir.
// Bu, "clear-then-write" riskini (yarida kesilirse indeks bos kalir) ortadan
// kaldirir ve gereksiz yazim/FTS tetikleme yukunu buyuk olcude azaltir.
//
// parent_id cozumlemesi flush aninda yapilir; ust kayit ayni partide olabilir
// (gezme yukaridan asagiya oldugu icin ust her zaman once gelir).

import { normalizePath } from './walkTree.js';

const BATCH_SIZE = 2000;

// Diskteki mevcut kayitlari normalize edilmis yol -> kayit haritasina yukler.
export function loadExistingEntries(db, hwId) {
  const rows = db
    .prepare('SELECT id, path, is_dir, size, mtime FROM entries WHERE hw_id = ?')
    .all(hwId);
  const map = new Map();
  for (const row of rows) {
    map.set(normalizePath(row.path), {
      id: Number(row.id),
      isDir: row.is_dir === 1,
      size: row.size === null ? null : Number(row.size),
      mtime: row.mtime,
    });
  }
  return map;
}

// Yeni bir indeks yazici olusturur.
export function createIndexWriter(db, hwId, { batchSize = BATCH_SIZE, existing } = {}) {
  const insert = db.prepare(
    `INSERT INTO entries (hw_id, parent_id, name, path, is_dir, size, mtime)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const update = db.prepare(
    `UPDATE entries SET parent_id = ?, name = ?, path = ?, is_dir = ?, size = ?, mtime = ?
     WHERE id = ?`
  );
  const deleteStmt = db.prepare('DELETE FROM entries WHERE id = ?');

  const previous = existing ?? loadExistingEntries(db, hwId);
  const pathToId = new Map(); // norm -> id (cozulmus)
  const seenIds = new Set();
  let pending = [];
  let walked = 0;
  let written = 0;
  let skipped = 0;

  // walkTree'nin onEntry cagrisi icin.
  function onEntry(entry) {
    if (entry.error) return; // erisilemeyen klasor atlanir
    walked += 1;

    const norm = normalizePath(entry.path);
    const isDir = Boolean(entry.isDir);
    const size = isDir ? null : entry.size ?? null;
    const mtime = entry.mtime ?? null;
    const parentNorm =
      entry.parentPath === null || entry.parentPath === undefined
        ? null
        : normalizePath(entry.parentPath);

    const prev = previous.get(norm);
    if (prev && sameShape(prev, { isDir, size, mtime })) {
      // Degismemis: yeniden yazma, id'yi koru ve goruldu olarak isaretle.
      pathToId.set(norm, prev.id);
      seenIds.add(prev.id);
      skipped += 1;
      return;
    }

    pending.push({
      norm,
      parentNorm,
      existingId: prev ? prev.id : null,
      values: [hwId, null, entry.name, entry.path, isDir ? 1 : 0, size, mtime],
    });
    if (pending.length >= batchSize) flush();
  }

  // Bekleyen kayitlari tek transaction'da yazar; parent_id'leri bu anda cozer.
  function flush() {
    if (pending.length === 0) return;
    db.exec('BEGIN');
    try {
      for (const item of pending) {
        const parentId =
          item.parentNorm === null ? null : pathToId.get(item.parentNorm) ?? null;
        let id;
        if (item.existingId !== null) {
          update.run(
            parentId,
            item.values[2],
            item.values[3],
            item.values[4],
            item.values[5],
            item.values[6],
            item.existingId
          );
          id = item.existingId;
        } else {
          item.values[1] = parentId;
          id = Number(insert.run(...item.values).lastInsertRowid);
        }
        pathToId.set(item.norm, id);
        seenIds.add(id);
        written += 1;
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    pending = [];
  }

  // Taramayi bitirir: kalan partiyi yazar, silinen kayitlari temizler.
  function finalize() {
    flush();

    const removedIds = [];
    for (const rec of previous.values()) {
      if (!seenIds.has(rec.id)) removedIds.push(rec.id);
    }
    if (removedIds.length > 0) {
      db.exec('BEGIN');
      try {
        for (const id of removedIds) deleteStmt.run(id);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }

    return { walked, written, skipped, removed: removedIds.length };
  }

  return {
    onEntry,
    flush,
    finalize,
    get count() {
      return walked;
    },
  };
}

function sameShape(prev, next) {
  return (
    prev.isDir === next.isDir &&
    prev.size === next.size &&
    (prev.mtime ?? null) === (next.mtime ?? null)
  );
}