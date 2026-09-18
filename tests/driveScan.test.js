import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDriveScan,
  normalizeScannedDrive,
  usableDrives,
} from '../src/core/driveScan.js';

test('parseDriveScan: gecerli JSON dizisini ayristirir', () => {
  const raw = JSON.stringify([
    {
      serialNumber: 'WD-ABC123',
      model: 'WD My Book',
      letter: 'F:',
      fsType: 'NTFS',
      volumeLabel: 'YEDEK',
      totalBytes: 4_000_000_000_000,
      freeBytes: 1_000_000_000_000,
    },
  ]);
  const drives = parseDriveScan(raw);
  assert.equal(drives.length, 1);
  assert.equal(drives[0].hwId, 'WD-ABC123');
  assert.equal(drives[0].letter, 'F:');
  assert.equal(drives[0].fsType, 'NTFS');
  assert.equal(drives[0].usedBytes, 3_000_000_000_000);
});

test('parseDriveScan: tek nesne (dizi degil) da kabul edilir', () => {
  const drives = parseDriveScan({ serialNumber: 'X1', letter: 'G:' });
  assert.equal(drives.length, 1);
  assert.equal(drives[0].hwId, 'X1');
});

test('parseDriveScan: bos girdi bos dizi', () => {
  assert.deepEqual(parseDriveScan(''), []);
  assert.deepEqual(parseDriveScan('   '), []);
  assert.deepEqual(parseDriveScan(null), []);
});

test('parseDriveScan: gecersiz JSON hata firlatir', () => {
  assert.throws(() => parseDriveScan('{bozuk'), /gecersiz JSON/);
});

test('normalizeScannedDrive: WMI alan adlarini da esler', () => {
  const d = normalizeScannedDrive({
    SerialNumber: 'SEAGATE-Z',
    DeviceID: 'H:',
    FileSystem: 'NTFS',
    VolumeName: 'FILM',
    Size: 2_000_000_000_000,
    FreeSpace: 500_000_000_000,
  });
  assert.equal(d.hwId, 'SEAGATE-Z');
  assert.equal(d.letter, 'H:');
  assert.equal(d.volumeLabel, 'FILM');
  assert.equal(d.usedBytes, 1_500_000_000_000);
});

test('normalizeScannedDrive: seri yoksa volume serial ile kimlik', () => {
  const d = normalizeScannedDrive({
    SerialNumber: 'None',
    VolumeSerialNumber: 'A1B2C3D4',
    letter: 'F:',
  });
  assert.equal(d.hwId, 'vol:A1B2C3D4');
});

test('normalizeScannedDrive: eksik boyut alanlari null', () => {
  const d = normalizeScannedDrive({ serialNumber: 'X', letter: 'F:' });
  assert.equal(d.totalBytes, null);
  assert.equal(d.freeBytes, null);
  assert.equal(d.usedBytes, null);
});

test('normalizeScannedDrive: nesne degilse null', () => {
  assert.equal(normalizeScannedDrive(null), null);
  assert.equal(normalizeScannedDrive('metin'), null);
});

test('usableDrives: kimliksiz veya harfsiz kayitlari eler', () => {
  const drives = [
    { hwId: 'A', letter: 'F:' },
    { hwId: null, letter: 'G:' },
    { hwId: 'C', letter: null },
  ];
  const usable = usableDrives(drives);
  assert.equal(usable.length, 1);
  assert.equal(usable[0].hwId, 'A');
});