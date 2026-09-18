import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/core/database.js';
import { createIndexWriter } from '../src/core/indexWriter.js';

function fresh() {
  const { db } = openDatabase(':memory:', { ftsAvailable: false });
  db.prepare(
    "INSERT INTO drives(hw_id, current_letter, indexed, connected) VALUES('D1','F:',1,1)"
  ).run();
  return db;
}

function entry(over) {
  return {
    path: 'F:\\',
    name: 'F:',
    parentPath: null,
    isDir: true,
    size: null,
    mtime: null,
    ...over,
  };
}

test('indexWriter: yeni kayitlari yazar ve sayar', () => {
  const db = fresh();
  const w = createIndexWriter(db, 'D1');
  w.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w.onEntry(entry({ path: 'F:\\a.txt', name: 'a.txt', parentPath: 'F:\\', isDir: false, size: 10 }));
  const res = w.finalize();

  const rows = db.prepare('SELECT id, name, is_dir, size, parent_id FROM entries ORDER BY id').all();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'F:');
  assert.equal(rows[0].is_dir, 1);
  assert.equal(rows[1].name, 'a.txt');
  assert.equal(rows[1].size, 10);
  assert.equal(rows[1].parent_id, rows[0].id);
  assert.equal(res.written, 2);
});

test('indexWriter: parent_id ayni partide cozulur (derin agac)', () => {
  const db = fresh();
  const w = createIndexWriter(db, 'D1', { batchSize: 1000 });
  w.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w.onEntry(entry({ path: 'F:\\alt', name: 'alt', parentPath: 'F:\\' }));
  w.onEntry(entry({ path: 'F:\\alt\\x.txt', name: 'x.txt', parentPath: 'F:\\alt', isDir: false, size: 5 }));
  w.finalize();

  const root = db.prepare("SELECT id FROM entries WHERE name='F:'").get();
  const alt = db.prepare("SELECT id, parent_id FROM entries WHERE name='alt'").get();
  const x = db.prepare("SELECT parent_id FROM entries WHERE name='x.txt'").get();
  assert.equal(alt.parent_id, root.id);
  assert.equal(x.parent_id, alt.id);
});

test('indexWriter: hatali kayitlar atlanir', () => {
  const db = fresh();
  const w = createIndexWriter(db, 'D1');
  w.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w.onEntry(entry({ path: 'F:\\bad', name: 'bad', parentPath: 'F:\\', error: 'EACCES' }));
  w.finalize();
  const count = db.prepare('SELECT COUNT(*) AS c FROM entries').get().c;
  assert.equal(count, 1);
});

test('indexWriter: batchSize asilinca otomatik flush olur', () => {
  const db = fresh();
  const w = createIndexWriter(db, 'D1', { batchSize: 2 });
  w.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w.onEntry(entry({ path: 'F:\\a', name: 'a', parentPath: 'F:\\', isDir: false, size: 1 }));
  w.onEntry(entry({ path: 'F:\\b', name: 'b', parentPath: 'F:\\', isDir: false, size: 1 }));
  const written = db.prepare('SELECT COUNT(*) AS c FROM entries').get().c;
  assert.ok(written >= 2);
  w.finalize();
  assert.equal(w.count, 3);
});

// ---- DIFF MODU ----

test('diff: degismeyen kayit yeniden yazilmaz, id korunur', () => {
  const db = fresh();
  const w1 = createIndexWriter(db, 'D1');
  w1.onEntry(entry({ path: 'F:\\', name: 'F:', mtime: '2026-01-01T00:00:00.000Z' }));
  w1.onEntry(entry({ path: 'F:\\a.txt', name: 'a.txt', parentPath: 'F:\\', isDir: false, size: 10, mtime: '2026-01-01T00:00:00.000Z' }));
  w1.finalize();
  const idBefore = db.prepare("SELECT id FROM entries WHERE name='a.txt'").get().id;

  // Ayni mtime/size ile ikinci tarama
  const w2 = createIndexWriter(db, 'D1');
  w2.onEntry(entry({ path: 'F:\\', name: 'F:', mtime: '2026-01-01T00:00:00.000Z' }));
  w2.onEntry(entry({ path: 'F:\\a.txt', name: 'a.txt', parentPath: 'F:\\', isDir: false, size: 10, mtime: '2026-01-01T00:00:00.000Z' }));
  const res = w2.finalize();

  assert.equal(res.skipped, 2);
  assert.equal(res.written, 0);
  const idAfter = db.prepare("SELECT id FROM entries WHERE name='a.txt'").get().id;
  assert.equal(idAfter, idBefore);
});

test('diff: degisen dosya guncellenir, ayni id kalir', () => {
  const db = fresh();
  const w1 = createIndexWriter(db, 'D1');
  w1.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w1.onEntry(entry({ path: 'F:\\a.txt', name: 'a.txt', parentPath: 'F:\\', isDir: false, size: 10, mtime: '2026-01-01T00:00:00.000Z' }));
  w1.finalize();
  const idBefore = db.prepare("SELECT id FROM entries WHERE name='a.txt'").get().id;

  const w2 = createIndexWriter(db, 'D1');
  w2.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w2.onEntry(entry({ path: 'F:\\a.txt', name: 'a.txt', parentPath: 'F:\\', isDir: false, size: 99, mtime: '2026-02-02T00:00:00.000Z' }));
  const res = w2.finalize();

  assert.equal(res.written, 1);
  const row = db.prepare("SELECT id, size FROM entries WHERE name='a.txt'").get();
  assert.equal(row.size, 99);
  assert.equal(row.id, idBefore);
});

test('diff: silinen dosya tarama sonunda temizlenir', () => {
  const db = fresh();
  const w1 = createIndexWriter(db, 'D1');
  w1.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w1.onEntry(entry({ path: 'F:\\gone.txt', name: 'gone.txt', parentPath: 'F:\\', isDir: false, size: 5 }));
  w1.finalize();

  // Ikinci tarama: gone.txt artik yok
  const w2 = createIndexWriter(db, 'D1');
  w2.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  const res = w2.finalize();

  assert.equal(res.removed, 1);
  const count = db.prepare('SELECT COUNT(*) AS c FROM entries').get().c;
  assert.equal(count, 1);
});

test('diff: yeni dosya eklenir', () => {
  const db = fresh();
  const w1 = createIndexWriter(db, 'D1');
  w1.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w1.finalize();

  const w2 = createIndexWriter(db, 'D1');
  w2.onEntry(entry({ path: 'F:\\', name: 'F:' }));
  w2.onEntry(entry({ path: 'F:\\new.txt', name: 'new.txt', parentPath: 'F:\\', isDir: false, size: 7 }));
  const res = w2.finalize();

  assert.equal(res.written, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM entries').get().c, 2);
});