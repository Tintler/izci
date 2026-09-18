import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultPercents,
  applyResize,
  serializePercents,
  parsePercents,
  DEFAULT_PERCENTS,
} from '../src/core/columns.js';

test('defaultPercents: varsayilan kopya, toplam ~100', () => {
  const p = defaultPercents();
  assert.deepEqual(p, DEFAULT_PERCENTS);
  assert.equal(Math.round(p.reduce((a, b) => a + b, 0)), 100);
});

test('applyResize: komsu ters kayar, toplam sabit', () => {
  const { percents, appliedPx } = applyResize([34, 20, 34, 12], 0, 50, 1000);
  assert.equal(Math.round(appliedPx), 50);
  assert.equal(Math.round(percents[0]), 39); // +5%
  assert.equal(Math.round(percents[1]), 15); // -5%
  assert.equal(Math.round(percents.reduce((a, b) => a + b, 0)), 100);
});

test('applyResize: min px siniri asilamaz', () => {
  // total 1000, min 60px => 6%. b=7% ise a en fazla +1% buyur.
  const { percents, appliedPx } = applyResize([34, 7, 47, 12], 0, 500, 1000);
  assert.equal(Math.round(percents[1]), 6);
  assert.equal(Math.round(appliedPx), 10); // 1% of 1000
});

test('applyResize: daraltma min sinirinda durur', () => {
  const { percents } = applyResize([7, 34, 47, 12], 0, -500, 1000);
  assert.equal(Math.round(percents[0]), 6);
});

test('applyResize: son kolon rezerve (index son ise degismez)', () => {
  const { percents, appliedPx } = applyResize([34, 20, 34, 12], 3, 50, 1000);
  assert.equal(appliedPx, 0);
  assert.deepEqual(percents, [34, 20, 34, 12]);
});

test('applyResize: gecersiz totalWidth degisiklik yapmaz', () => {
  const { appliedPx } = applyResize([34, 20, 34, 12], 0, 50, 0);
  assert.equal(appliedPx, 0);
});

test('serialize/parse: gidis-donus', () => {
  const p = [34, 20, 34, 12];
  const text = serializePercents(p);
  assert.deepEqual(parsePercents(text, 4), p);
});

test('parsePercents: bozuk girdi null', () => {
  assert.equal(parsePercents('', 4), null);
  assert.equal(parsePercents('1,2,3', 4), null);        // eksik
  assert.equal(parsePercents('10,20,30,20', 4), null);  // toplam 80
  assert.equal(parsePercents('0,50,50,0', 4), null);    // sifir yuzde
  assert.equal(parsePercents(null, 4), null);
});