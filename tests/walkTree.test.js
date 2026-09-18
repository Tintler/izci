import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkTree, normalizePath } from '../src/core/walkTree.js';

// Sahte dosya sistemi: agac tanimi { 'yol': ['alt','dosya'] } seklinde degil,
// daha kolay kurmak icin map tabanli.
function fakeFs(tree) {
  // tree: { 'f:\\': [{name,dir}], 'f:\\alt': [...] }
  const statMap = tree.__stats || {};
  return {
    async readdir(p, _opts) {
      const key = p.toLowerCase();
      const entry = tree[key] ?? tree[p];
      if (entry === undefined) {
        const err = new Error('yok');
        err.code = 'ENOENT';
        throw err;
      }
      return entry.map((e) => ({
        name: e.name,
        isDirectory: () => Boolean(e.dir),
      }));
    },
    async stat(p) {
      const key = p.toLowerCase();
      const s = statMap[key] ?? statMap[p];
      if (!s) {
        const err = new Error('yok');
        err.code = 'ENOENT';
        throw err;
      }
      return { size: s.size ?? 0, mtime: s.mtime ?? new Date('2026-01-01T00:00:00Z') };
    },
  };
}

test('walkTree: dosya ve klasorleri ozyinelemeli gezer', async () => {
  const tree = {
    'f:\\': [{ name: 'a.txt', dir: false }, { name: 'alt', dir: true }],
    'f:\\alt': [{ name: 'b.txt', dir: false }],
    __stats: {
      'f:\\a.txt': { size: 100 },
      'f:\\alt\\b.txt': { size: 200 },
    },
  };
  const seen = [];
  await walkTree('F:\\', fakeFs(tree), { onEntry: (e) => seen.push(e) });

  const paths = seen.map((e) => normalizePath(e.path)).sort();
  assert.deepEqual(paths, ['f:\\a.txt', 'f:\\alt', 'f:\\alt\\b.txt']);

  const b = seen.find((e) => e.name === 'b.txt');
  assert.equal(b.isDir, false);
  assert.equal(b.size, 200);
  assert.equal(normalizePath(b.parentPath), 'f:\\alt');
});

test('walkTree: excludeDirs ile dal atlanir', async () => {
  const tree = {
    'f:\\': [{ name: 'keep', dir: true }, { name: 'skip', dir: true }],
    'f:\\keep': [{ name: 'x.txt', dir: false }],
    'f:\\skip': [{ name: 'y.txt', dir: false }],
    __stats: { 'f:\\keep\\x.txt': { size: 1 }, 'f:\\skip\\y.txt': { size: 1 } },
  };
  const seen = [];
  await walkTree('F:\\', fakeFs(tree), {
    onEntry: (e) => seen.push(e),
    excludeDirs: new Set([normalizePath('F:\\skip')]),
  });
  const names = seen.map((e) => e.name);
  assert.ok(names.includes('x.txt'));
  assert.ok(!names.includes('y.txt'));
});

test('walkTree: erisilemeyen klasor hata ile bildirilir, tarama durmaz', async () => {
  const tree = {
    'f:\\': [{ name: 'locked', dir: true }],
    // 'f:\\locked' tanimli degil -> readdir ENOENT firlatir
    __stats: {},
  };
  const seen = [];
  await walkTree('F:\\', fakeFs(tree), { onEntry: (e) => seen.push(e) });
  const locked = seen.find((e) => e.name === 'locked');
  assert.ok(locked);
  assert.equal(locked.error, 'ENOENT');
});

test('walkTree: gecersiz kok hata firlatir', async () => {
  await assert.rejects(() => walkTree('', fakeFs({})), TypeError);
});

test('normalizePath: ters slash + kucuk harf + sondaki ayrac temizlenir', () => {
  assert.equal(normalizePath('F:/Alt/Dir/'), 'f:\\alt\\dir');
  assert.equal(normalizePath('F:\\Alt'), 'f:\\alt');
});