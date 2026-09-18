import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveOrderBy, sortByKind, SORT_KEYS } from '../src/core/sorting.js';

test('resolveOrderBy: bilinmeyen anahtar name sayilir', () => {
  assert.match(resolveOrderBy('bilinmeyen'), /e\.name COLLATE NOCASE ASC/);
});

test('resolveOrderBy: klasorler once (varsayilan)', () => {
  assert.match(resolveOrderBy('name'), /^e\.is_dir DESC/);
});

test('resolveOrderBy: klasorler once kapatilabilir', () => {
  const s = resolveOrderBy('name', false, { foldersFirst: false });
  assert.ok(!s.includes('is_dir'));
});

test('resolveOrderBy: desc yonu', () => {
  assert.match(resolveOrderBy('size', true), /e\.size DESC/);
});

test('resolveOrderBy: size icin NULL sona atilir', () => {
  // SQLite'ta "x IS NULL" false(0) < true(1) oldugundan NULL'lar sona gelir.
  assert.match(resolveOrderBy('size'), /e\.size IS NULL/);
});

test('resolveOrderBy: gecersiz anahtar injection uretmez', () => {
  const s = resolveOrderBy('name; DROP TABLE entries');
  assert.ok(!s.includes('DROP'));
  assert.ok(!s.includes(';'));
});

test('SORT_KEYS: beklenen anahtarlar', () => {
  assert.deepEqual(SORT_KEYS, ['name', 'size', 'mtime', 'kind']);
});

test('sortByKind: tur sirasi folder->image->video->audio->file', () => {
  const rows = [
    { name: 'z.txt', iconKind: 'file', isDir: false },
    { name: 'a.mkv', iconKind: 'video', isDir: false },
    { name: 'Klasor', iconKind: 'folder', isDir: true },
    { name: 'b.png', iconKind: 'image', isDir: false },
    { name: 'c.mp3', iconKind: 'audio', isDir: false },
  ];
  const sorted = sortByKind(rows);
  assert.deepEqual(sorted.map((r) => r.iconKind), ['folder', 'image', 'video', 'audio', 'file']);
});

test('sortByKind: ayni tur icinde isme gore', () => {
  const rows = [
    { name: 'b.png', iconKind: 'image', isDir: false },
    { name: 'a.png', iconKind: 'image', isDir: false },
  ];
  const sorted = sortByKind(rows);
  assert.deepEqual(sorted.map((r) => r.name), ['a.png', 'b.png']);
});

test('sortByKind: desc ters cevirir', () => {
  const rows = [
    { name: 'Klasor', iconKind: 'folder', isDir: true },
    { name: 'z.txt', iconKind: 'file', isDir: false },
  ];
  const sorted = sortByKind(rows, true);
  assert.equal(sorted[0].iconKind, 'file');
});