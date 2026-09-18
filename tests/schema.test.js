import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { applySchema, detectFts, SCHEMA_VERSION } from '../src/core/schema.js';

test('applySchema: temel tablolar olusur ve surum yazilir', () => {
  const db = new DatabaseSync(':memory:');
  applySchema(db, { ftsAvailable: false });
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  assert.ok(tables.includes('drives'));
  assert.ok(tables.includes('entries'));
  const v = db.prepare("SELECT value FROM meta WHERE key='schema_version'").get();
  assert.equal(v.value, String(SCHEMA_VERSION));
});

test('detectFts: boolean doner ve hata firlatmaz', () => {
  const db = new DatabaseSync(':memory:');
  const result = detectFts(db);
  assert.equal(typeof result, 'boolean');
});

test('applySchema: ftsAvailable true ise FTS tablosu eklenir', () => {
  const db = new DatabaseSync(':memory:');
  applySchema(db, { ftsAvailable: true });
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  assert.ok(tables.includes('entries_fts'));
});