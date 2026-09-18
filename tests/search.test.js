import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/core/database.js';
import {
  tokenizeQuery,
  buildFtsQuery,
  searchEntries,
  dirName,
} from '../src/core/search.js';

function setup({ ftsAvailable }) {
  const { db, ftsAvailable: fts } = openDatabase(':memory:', { ftsAvailable });
  db.prepare(
    "INSERT INTO drives(hw_id, current_letter, volume_label, custom_label, indexed, connected) " +
      "VALUES('D1','F:','YEDEK','Film Arsivi',1,1)"
  ).run();
  const ins = db.prepare(
    'INSERT INTO entries(hw_id, parent_id, name, path, is_dir, size, mtime) VALUES(?,?,?,?,?,?,?)'
  );
  ins.run('D1', null, 'Medya', 'F:\\Medya', 1, null, null);
  ins.run('D1', 1, 'film_arsivi_2024.mkv', 'F:\\Medya\\film_arsivi_2024.mkv', 0, 100, null);
  ins.run('D1', 1, 'belgesel.mkv', 'F:\\Medya\\belgesel.mkv', 0, 200, null);
  ins.run('D1', null, 'notes.txt', 'F:\\notes.txt', 0, 5, null);
  return { db, ftsAvailable: fts };
}

test('tokenizeQuery: bosluga gore ayirir, bos girdi []', () => {
  assert.deepEqual(tokenizeQuery('film  arsiv'), ['film', 'arsiv']);
  assert.deepEqual(tokenizeQuery('   '), []);
  assert.deepEqual(tokenizeQuery(null), []);
});

test('buildFtsQuery: jetonlara onek ve tirnak ekler', () => {
  assert.equal(buildFtsQuery('film arsiv'), '"film"* "arsiv"*');
  assert.equal(buildFtsQuery(''), null);
});

test('buildFtsQuery: tirnak iceren jeton guvenli kacirilir', () => {
  assert.equal(buildFtsQuery('a"b'), '"a""b"*');
});

test('detectFts: bu ortamda FTS5 kullanilabilir olmali', () => {
  const { ftsAvailable } = setup({ ftsAvailable: undefined });
  assert.equal(ftsAvailable, true, 'node:sqlite FTS5 desteklemiyor');
});

test('searchEntries (FTS): onek eslesmesi bulur', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  assert.equal(ftsAvailable, true);
  const res = searchEntries(db, { query: 'film', ftsAvailable });
  assert.equal(res.length, 1);
  assert.equal(res[0].name, 'film_arsivi_2024.mkv');
  assert.equal(res[0].driveLabel, 'Film Arsivi');
});

test('searchEntries (FTS): yol uzerinden de bulur', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const res = searchEntries(db, { query: 'Medya', ftsAvailable });
  const names = res.map((r) => r.name);
  assert.ok(names.includes('Medya'));
  assert.ok(names.includes('film_arsivi_2024.mkv'));
});

test('searchEntries (LIKE): FTS yokken de calisir', () => {
  const { db } = setup({ ftsAvailable: false });
  const res = searchEntries(db, { query: 'belgesel', ftsAvailable: false });
  assert.equal(res.length, 1);
  assert.equal(res[0].name, 'belgesel.mkv');
});

test('searchEntries (LIKE): % ozel karakteri literal aranir', () => {
  const { db } = setup({ ftsAvailable: false });
  // hicbir kayitta '%' yok; yanlis eslesme olmamali
  const res = searchEntries(db, { query: '%', ftsAvailable: false });
  assert.equal(res.length, 0);
});

test('searchEntries: bos sorgu bos sonuc', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  assert.deepEqual(searchEntries(db, { query: '  ', ftsAvailable }), []);
});

test('searchEntries: limit uygulanir', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const res = searchEntries(db, { query: 'mkv', ftsAvailable, limit: 1 });
  assert.equal(res.length, 1);
});

test('searchEntries: sonuc alanlari normalize edilir', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const res = searchEntries(db, { query: 'belgesel', ftsAvailable });
  const r = res[0];
  assert.equal(r.isDir, false);
  assert.equal(r.size, 200);
  assert.equal(r.hwId, 'D1');
  assert.equal(r.letter, 'F:');
});

test('dirName: dosya adini cikarip dizini dondurur', () => {
  assert.equal(dirName('F:\\Medya\\film.mkv'), 'F:\\Medya');
  assert.equal(dirName('F:\\Medya\\Alt\\x.txt'), 'F:\\Medya\\Alt');
});

test('dirName: kok seviye dosyada surucu koku', () => {
  assert.equal(dirName('F:\\notes.txt'), 'F:\\');
});

test('dirName: klasor yolu ve sondaki ayrac', () => {
  assert.equal(dirName('F:\\Medya\\'), 'F:\\');
  assert.equal(dirName('F:\\Medya'), 'F:\\');
  assert.equal(dirName('F:\\Medya\\Alt'), 'F:\\Medya');
});

test('dirName: ileri slash da desteklenir', () => {
  assert.equal(dirName('F:/Medya/film.mkv'), 'F:/Medya');
});

test('searchEntries: sonucta dir alani dosya adini icermez', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const res = searchEntries(db, { query: 'belgesel', ftsAvailable });
  assert.equal(res[0].dir, 'F:\\Medya');
  assert.ok(!res[0].dir.includes('belgesel'));
});

test('searchEntries: klasorler dosyalardan once gelir', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const res = searchEntries(db, { query: 'Medya', ftsAvailable });
  assert.equal(res[0].name, 'Medya');
  assert.equal(res[0].isDir, true);
  // klasorden sonra gelenler dosya olmali
  assert.ok(res.slice(1).every((r) => !r.isDir));
});

test('searchEntries: iconKind alani dogru hesaplanir', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const folder = searchEntries(db, { query: 'Medya', ftsAvailable })[0];
  assert.equal(folder.iconKind, 'folder');
  const video = searchEntries(db, { query: 'belgesel', ftsAvailable })[0];
  assert.equal(video.iconKind, 'video');
});

test('searchEntries: size ile azalan siralama', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const res = searchEntries(db, { query: 'mkv', ftsAvailable, sortBy: 'size', desc: true });
  assert.equal(res[0].name, 'belgesel.mkv'); // 200 > 100
  assert.equal(res[1].name, 'film_arsivi_2024.mkv');
});

test('searchEntries: kind ile siralama (klasor once)', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const res = searchEntries(db, { query: 'Medya', ftsAvailable, sortBy: 'kind' });
  assert.equal(res[0].iconKind, 'folder');
});

test('searchEntries: size siralama klasorleri ustte tutar', () => {
  const { db, ftsAvailable } = setup({ ftsAvailable: undefined });
  const res = searchEntries(db, { query: 'Medya', ftsAvailable, sortBy: 'size', desc: true });
  assert.equal(res[0].isDir, true);
});