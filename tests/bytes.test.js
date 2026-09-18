import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, usedPercent } from '../src/core/bytes.js';

test('formatBytes: 0 -> "0 B"', () => {
  assert.equal(formatBytes(0), '0 B');
});

test('formatBytes: taban 1000 ile birim yukseltir', () => {
  assert.equal(formatBytes(1000), '1.00 KB');
  assert.equal(formatBytes(1_500_000), '1.50 MB');
  assert.equal(formatBytes(2_000_000_000), '2.00 GB');
  assert.equal(formatBytes(4_000_000_000_000), '4.00 TB');
});

test('formatBytes: 1000 altindaki degerler B kalir', () => {
  assert.equal(formatBytes(999), '999 B');
});

test('formatBytes: negatif/gecersiz deger hata firlatir', () => {
  assert.throws(() => formatBytes(-1), RangeError);
  assert.throws(() => formatBytes(NaN), RangeError);
  assert.throws(() => formatBytes(Infinity), RangeError);
});

test('usedPercent: normal oran', () => {
  assert.equal(usedPercent(50, 200), 25);
});

test('usedPercent: toplam 0 veya gecersizse 0', () => {
  assert.equal(usedPercent(10, 0), 0);
  assert.equal(usedPercent(10, null), 0);
});

test('usedPercent: asla 100 ustune cikmaz ve negatif olmaz', () => {
  assert.equal(usedPercent(300, 200), 100);
  assert.equal(usedPercent(-5, 200), 0);
});