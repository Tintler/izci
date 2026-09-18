// Surucu tarama ciktisi ayristirma (saf mantik; Electron/PowerShell bagimliligi yok).
// Girdi: PowerShell'in urettigi JSON (dizi veya tek nesne) ya da ham dizi.
// Cikti: normalize edilmis surucu nesneleri.

import { resolveDriveKey, normalizeLetter } from './driveKey.js';

// Ham metin/obje girdisini surucu listesine cevirir.
export function parseDriveScan(raw) {
  if (raw === null || raw === undefined) return [];

  let items = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return [];
    try {
      items = JSON.parse(trimmed);
    } catch {
      throw new Error('Surucu tarama ciktisi gecersiz JSON.');
    }
  }

  if (!Array.isArray(items)) items = [items];

  const drives = [];
  for (const item of items) {
    const drive = normalizeScannedDrive(item);
    if (drive) drives.push(drive);
  }
  return drives;
}

// Tek bir ham kaydi normalize eder. Nesne degilse null.
export function normalizeScannedDrive(item) {
  if (!item || typeof item !== 'object') return null;

  const letter = normalizeLetter(item.letter ?? item.DeviceID ?? item.driveLetter);
  const totalBytes = toNumber(item.totalBytes ?? item.Size);
  const freeBytes = toNumber(item.freeBytes ?? item.FreeSpace);
  const usedBytes =
    totalBytes !== null && freeBytes !== null ? Math.max(0, totalBytes - freeBytes) : null;

  const hwId = resolveDriveKey({
    serialNumber: item.serialNumber ?? item.SerialNumber,
    volumeSerial: item.volumeSerial ?? item.VolumeSerialNumber,
  });

  return {
    hwId,
    letter,
    fsType: str(item.fsType ?? item.FileSystem),
    volumeLabel: str(item.volumeLabel ?? item.VolumeName),
    model: str(item.model),
    totalBytes,
    usedBytes,
    freeBytes,
  };
}

// Kimligi cozulemeyen (harf ile takip edilemeyecek) kayitlari ayiklar.
export function usableDrives(drives) {
  return drives.filter((d) => d.hwId && d.letter);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}