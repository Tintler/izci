// SQLite katmani (Electron bagimliligi yok; test edilebilir saf mantik).
// Node yerlesik node:sqlite modulu kullanilir; native derleme gerektirmez.

import { DatabaseSync } from 'node:sqlite';
import { applySchema, detectFts } from './schema.js';
import { normalizeLetter } from './driveKey.js';

// Veritabani acar ve semayi uygular. ftsAvailable disaridan verilebilir (test).
export function openDatabase(location = ':memory:', { ftsAvailable } = {}) {
  const db = new DatabaseSync(location);
  db.exec('PRAGMA foreign_keys = ON');
  const fts = ftsAvailable === undefined ? detectFts(db) : ftsAvailable;
  applySchema(db, { ftsAvailable: fts });
  return { db, ftsAvailable: fts };
}

// Bagli bir surucu bilgisini (kendi etiketi disinda) kaydeder/gunceller.
// custom_label ve indexed korunur (upsert sirasinda dokunulmaz).
export function upsertDrive(db, drive) {
  const {
    hwId,
    volumeSerial = null,
    letter = null,
    fsType = null,
    totalBytes = null,
    usedBytes = null,
    freeBytes = null,
    volumeLabel = null,
    now = new Date().toISOString(),
    connected = 1,
  } = drive;

  if (!hwId || String(hwId).trim().length === 0) {
    throw new Error('Surucu kimligi (hwId) zorunlu.');
  }

  db.prepare(
    `INSERT INTO drives
       (hw_id, volume_serial, current_letter, fs_type, total_bytes, used_bytes,
        free_bytes, volume_label, indexed, connected, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(hw_id) DO UPDATE SET
       volume_serial  = excluded.volume_serial,
       current_letter = excluded.current_letter,
       fs_type        = excluded.fs_type,
       total_bytes    = excluded.total_bytes,
       used_bytes     = excluded.used_bytes,
       free_bytes     = excluded.free_bytes,
       volume_label   = excluded.volume_label,
       connected      = excluded.connected,
       last_seen      = excluded.last_seen`
  ).run(
    hwId,
    volumeSerial,
    normalizeLetter(letter),
    fsType,
    totalBytes,
    usedBytes,
    freeBytes,
    volumeLabel,
    connected,
    now
  );

  return getDrive(db, hwId);
}

export function getDrive(db, hwId) {
  const row = db.prepare('SELECT * FROM drives WHERE hw_id = ?').get(hwId);
  return row ? mapDriveRow(row) : null;
}

// Ana ekran icin: yalnizca indekslenen diskler.
export function listIndexedDrives(db) {
  const rows = db
    .prepare('SELECT * FROM drives WHERE indexed = 1 ORDER BY custom_label, volume_label')
    .all();
  return rows.map(mapDriveRow);
}

// Bagli disk ekleme ekrani icin: indekslenmeyenler dahil tum diskler.
export function listAllDrives(db) {
  const rows = db.prepare('SELECT * FROM drives ORDER BY indexed DESC, current_letter').all();
  return rows.map(mapDriveRow);
}

// Surucu baglantisi kesildi: connected=0, last_seen korunur.
export function markDisconnected(db, hwId) {
  db.prepare('UPDATE drives SET connected = 0 WHERE hw_id = ?').run(hwId);
  return getDrive(db, hwId);
}

// Bir tarama oncesi tum diskleri bagli degil kabul eder. Ardindan gorulen
// diskler upsertDrive ile connected=1'e doner; boylece cikarilanlar 0 kalir.
export function markAllDisconnected(db) {
  db.prepare('UPDATE drives SET connected = 0').run();
}

export function setDriveIndexed(db, hwId, indexed) {
  db.prepare('UPDATE drives SET indexed = ? WHERE hw_id = ?').run(indexed ? 1 : 0, hwId);
  return getDrive(db, hwId);
}

// Kullanicinin verdigi serbest metin etiket. null ile temizlenir.
export function setCustomLabel(db, hwId, label) {
  const clean = label === null || label === undefined ? null : String(label);
  db.prepare('UPDATE drives SET custom_label = ? WHERE hw_id = ?').run(clean, hwId);
  return getDrive(db, hwId);
}

export function setLastIndexed(db, hwId, when = new Date().toISOString()) {
  db.prepare('UPDATE drives SET last_indexed = ? WHERE hw_id = ?').run(when, hwId);
}

// Bir diskteki dosya/klasor sayisini dondurur.
export function countDriveEntries(db, hwId) {
  const row = db
    .prepare(
      'SELECT COUNT(*) AS total, SUM(CASE WHEN is_dir = 0 THEN 1 ELSE 0 END) AS files ' +
        'FROM entries WHERE hw_id = ?'
    )
    .get(hwId);
  return { total: Number(row.total) || 0, files: Number(row.files) || 0 };
}

function mapDriveRow(row) {
  return {
    hwId: row.hw_id,
    volumeSerial: row.volume_serial,
    currentLetter: row.current_letter,
    fsType: row.fs_type,
    totalBytes: row.total_bytes,
    usedBytes: row.used_bytes,
    freeBytes: row.free_bytes,
    volumeLabel: row.volume_label,
    customLabel: row.custom_label,
    indexed: row.indexed === 1,
    connected: row.connected === 1,
    lastSeen: row.last_seen,
    lastIndexed: row.last_indexed,
  };
}