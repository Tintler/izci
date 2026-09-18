// Surucu kimligi cozumleme (saf mantik, Electron bagimliligi yok).
// Surucu HARFI asla kimlik olarak kullanilmaz; tak/cikar ile harf degisebilir.
// Birincil kimlik: fiziksel disk seri numarasi (hw_id).
// Yedek anahtar: volume serial number (format atilinca degisebilir).

const ASCII_ONLY = /[^\x20-\x7E]/g;

// Fiziksel disk seri numarasini normalize eder. Bos/gecersizse null doner.
export function normalizeHardwareId(serial) {
  if (serial === null || serial === undefined) return null;
  const trimmed = String(serial).trim();
  if (trimmed.length === 0) return null;
  const placeholders = new Set(['none', 'default', '00000000', '0', 'n/a']);
  if (placeholders.has(trimmed.toLowerCase())) return null;
  return trimmed.replace(ASCII_ONLY, '') || null;
}

// Bir surucu icin kimlik secer: once hw_id, yoksa volume_serial, yoksa null.
export function resolveDriveKey(drive) {
  if (!drive || typeof drive !== 'object') {
    throw new TypeError('Surucu nesnesi gerekli.');
  }
  const hw = normalizeHardwareId(drive.serialNumber);
  if (hw) return hw;
  const vol = drive.volumeSerial;
  if (vol !== null && vol !== undefined && String(vol).trim().length > 0) {
    const clean = String(vol).trim().replace(ASCII_ONLY, '');
    if (clean.length > 0) return `vol:${clean}`;
  }
  return null;
}

// Surucu harfini normalize eder: "f" -> "F:", "F:\\" -> "F:".
export function normalizeLetter(letter) {
  if (letter === null || letter === undefined) return null;
  const match = String(letter).trim().toUpperCase().match(/^([A-Z]):?/);
  return match ? `${match[1]}:` : null;
}