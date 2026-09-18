import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/core/database.js';
import { listChildren, getEntry, breadcrumb } from '../src/core/browse.js';

function setup() {
  const { db } = openDatabase(':memory:', { ftsAvailable: false });
  db.prepare(
    "INSERT INTO drives(hw_id, current_letter, volume_label, custom_label, indexed, connected) " +
      "VALUES('D1','F:','YEDEK','Film Arsivi',1,1)"
  ).run();
  const ins = db.prepare(
    'INSERT INTO entries(hw_id, parent_id, name, path, is_dir, size, mtime) VALUES(?,?,?,?,?,?,?)'
  );
  // kok: bir klasor + bir dosya
  const medya = ins.run('D1', null, 'Medya', 'F:\\Medya', 1, null, null).lastInsertRowid;
  const notes = ins.run('D1', null, 'notes.txt', 'F:\\notes.txt', 0, 5, null).lastInsertRowid;
  const film = ins.run('D1', medya, 'film.mkv', 'F:\\Medya\\film.mkv', 0, 100, null).lastInsertRowid;
  const alt = ins.run('D1', medya, 'Alt', 'F:\\Medya\\Alt', 1, null, null).lastInsertRowid;
  return { db, medya: Number(medya), notes: Number(notes), film: Number(film), alt: Number(alt) };
}

test('listChildren: kok icerik (parent_id IS NULL), klasorler once', () => {
  const { db } = setup();
  const rows = listChildren(db, 'D1', null);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Medya');
  assert.equal(rows[0].isDir, true);
  assert.equal(rows[0].iconKind, 'folder');
  assert.equal(rows[1].name, 'notes.txt');
  assert.equal(rows[1].iconKind, 'file');
});

test('listChildren: bir klasorun cocuklari', () => {
  const { db, medya } = setup();
  const rows = listChildren(db, 'D1', medya);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Alt'); // klasor once
  assert.equal(rows[1].name, 'film.mkv');
  assert.equal(rows[1].iconKind, 'video');
});

test('listChildren: baska diskin cocuklari gelmez', () => {
  const { db, medya } = setup();
  db.prepare(
    "INSERT INTO drives(hw_id, current_letter, indexed, connected) VALUES('D2','G:',1,1)"
  ).run();
  db.prepare(
    'INSERT INTO entries(hw_id, parent_id, name, path, is_dir) VALUES(?,?,?,?,?)'
  ).run('D2', null, 'other.txt', 'G:\\other.txt', 0);
  const rows = listChildren(db, 'D2', null);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'other.txt');
});

test('listChildren: hwId yoksa hata', () => {
  const { db } = setup();
  assert.throws(() => listChildren(db, '', null));
});

test('listChildren: dir alani dosya adini icermez', () => {
  const { db, medya } = setup();
  const rows = listChildren(db, 'D1', medya);
  const film = rows.find((r) => r.name === 'film.mkv');
  assert.equal(film.dir, 'F:\\Medya');
});

test('breadcrumb: kokten hedefe zincir', () => {
  const { db, film } = setup();
  const chain = breadcrumb(db, film);
  const names = chain.map((c) => c.name);
  assert.deepEqual(names, ['Medya', 'film.mkv']);
});

test('breadcrumb: kok seviye kayitta tek eleman', () => {
  const { db, notes } = setup();
  const chain = breadcrumb(db, notes);
  assert.deepEqual(chain.map((c) => c.name), ['notes.txt']);
});

test('getEntry: kaydi dondurur, yoksa null', () => {
  const { db, notes } = setup();
  assert.equal(getEntry(db, notes).name, 'notes.txt');
  assert.equal(getEntry(db, 999999), null);
});

test('listChildren: size ile azalan siralama (klasorler ustte)', () => {
  const { db, medya } = setup();
  const rows = listChildren(db, 'D1', medya, { sortBy: 'size', desc: true });
  assert.equal(rows[0].isDir, true);           // Alt klasoru once
  assert.equal(rows[1].name, 'film.mkv');      // 100 > (Alt: null)
});

test('listChildren: kind ile siralama', () => {
  const { db, medya } = setup();
  const rows = listChildren(db, 'D1', medya, { sortBy: 'kind' });
  assert.deepEqual(rows.map((r) => r.iconKind), ['folder', 'video']);
});