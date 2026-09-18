import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  openDatabase,
  upsertDrive,
  listIndexedDrives,
  listAllDrives,
  markDisconnected,
  setDriveIndexed,
  setCustomLabel,
} from '../src/core/database.js';

function fresh() {
  // Testte FTS zorunlu degil; sema temel tablolarla dogrulanir.
  const { db } = openDatabase(':memory:', { ftsAvailable: false });
  return db;
}

test('upsertDrive: yeni surucu indekssiz gelir', () => {
  const db = fresh();
  const d = upsertDrive(db, {
    hwId: 'DISK-1',
    letter: 'F:',
    fsType: 'NTFS',
    totalBytes: 4_000_000_000_000,
    usedBytes: 2_000_000_000_000,
    volumeLabel: 'YEDEK',
  });
  assert.equal(d.hwId, 'DISK-1');
  assert.equal(d.indexed, false);
  assert.equal(d.connected, true);
  assert.equal(d.customLabel, null);
});

test('upsertDrive: ayni hw_id ile harf degisince tek kayit kalir', () => {
  const db = fresh();
  upsertDrive(db, { hwId: 'DISK-1', letter: 'F:' });
  upsertDrive(db, { hwId: 'DISK-1', letter: 'G:' });
  const all = listAllDrives(db);
  assert.equal(all.length, 1);
  assert.equal(all[0].currentLetter, 'G:');
});

test('upsertDrive: custom_label ve indexed korunur', () => {
  const db = fresh();
  upsertDrive(db, { hwId: 'DISK-1', letter: 'F:' });
  setCustomLabel(db, 'DISK-1', 'Film Arsivi');
  setDriveIndexed(db, 'DISK-1', true);
  // Yeniden takilma: ayni hw_id tekrar upsert edilir
  upsertDrive(db, { hwId: 'DISK-1', letter: 'H:' });
  const d = listAllDrives(db)[0];
  assert.equal(d.customLabel, 'Film Arsivi');
  assert.equal(d.indexed, true);
});

test('listIndexedDrives: yalnizca indexed=1 dondurur', () => {
  const db = fresh();
  upsertDrive(db, { hwId: 'A', letter: 'F:' });
  upsertDrive(db, { hwId: 'B', letter: 'G:' });
  setDriveIndexed(db, 'B', true);
  const indexed = listIndexedDrives(db);
  assert.equal(indexed.length, 1);
  assert.equal(indexed[0].hwId, 'B');
});

test('markDisconnected: connected=0, kayit durur', () => {
  const db = fresh();
  upsertDrive(db, { hwId: 'A', letter: 'F:' });
  markDisconnected(db, 'A');
  const d = listAllDrives(db)[0];
  assert.equal(d.connected, false);
});

test('upsertDrive: hwId bos ise hata', () => {
  const db = fresh();
  assert.throws(() => upsertDrive(db, { hwId: '  ' }));
});