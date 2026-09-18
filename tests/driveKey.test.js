import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeHardwareId,
  resolveDriveKey,
  normalizeLetter,
} from '../src/core/driveKey.js';

test('normalizeHardwareId: gecerli seri numarasini dondurur', () => {
  assert.equal(normalizeHardwareId('  WD-WMC4N12345678  '), 'WD-WMC4N12345678');
});

test('normalizeHardwareId: bos/yer tutucu degerler null', () => {
  assert.equal(normalizeHardwareId(''), null);
  assert.equal(normalizeHardwareId('   '), null);
  assert.equal(normalizeHardwareId('None'), null);
  assert.equal(normalizeHardwareId('00000000'), null);
  assert.equal(normalizeHardwareId(null), null);
});

test('resolveDriveKey: hw_id oncelikli', () => {
  const key = resolveDriveKey({ serialNumber: 'DISK-1', volumeSerial: 'AB12' });
  assert.equal(key, 'DISK-1');
});

test('resolveDriveKey: hw_id yoksa volume serial yedek', () => {
  const key = resolveDriveKey({ serialNumber: 'None', volumeSerial: 'AB12CD34' });
  assert.equal(key, 'vol:AB12CD34');
});

test('resolveDriveKey: hicbiri yoksa null (harf ile kimlik verilmez)', () => {
  const key = resolveDriveKey({ serialNumber: null, volumeSerial: null, letter: 'F:' });
  assert.equal(key, null);
});

test('resolveDriveKey: nesne degilse TypeError', () => {
  assert.throws(() => resolveDriveKey(null), TypeError);
});

test('normalizeLetter: f / F: / F:\\ hepsi "F:"', () => {
  assert.equal(normalizeLetter('f'), 'F:');
  assert.equal(normalizeLetter('F:'), 'F:');
  assert.equal(normalizeLetter('F:\\'), 'F:');
  assert.equal(normalizeLetter('  g:  '), 'G:');
});

test('normalizeLetter: gecersiz girdi null', () => {
  assert.equal(normalizeLetter(''), null);
  assert.equal(normalizeLetter('1'), null);
  assert.equal(normalizeLetter(null), null);
});