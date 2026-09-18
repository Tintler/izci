import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  openDatabase,
  upsertDrive,
  markAllDisconnected,
  listAllDrives,
} from '../src/core/database.js';

function fresh() {
  return openDatabase(':memory:', { ftsAvailable: false }).db;
}

test('markAllDisconnected + upsert: cikarilan disk bagli degil kalir', () => {
  const db = fresh();
  upsertDrive(db, { hwId: 'A', letter: 'F:', connected: 1 });
  upsertDrive(db, { hwId: 'B', letter: 'G:', connected: 1 });

  // Yeni tarama: yalnizca A goruldu
  markAllDisconnected(db);
  upsertDrive(db, { hwId: 'A', letter: 'F:', connected: 1 });

  const all = listAllDrives(db);
  const a = all.find((d) => d.hwId === 'A');
  const b = all.find((d) => d.hwId === 'B');
  assert.equal(a.connected, true);
  assert.equal(b.connected, false);
});