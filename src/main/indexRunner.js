// Indeksleme orkestrasyonu (ince kabuk; gercek fs + DB + ilerleme olaylari).
// Gezme/yazma mantigi ../core altindaki saf modullerde ve orada test edilir.
//
// DIFF MODU: Indeks once silinmez. Mevcut kayitlar yuklenir, degismeyenler
// atlanir, silinenler tarama sonunda temizlenir (bkz. indexWriter.js).

import { promises as fs } from 'node:fs';
import { walkTree } from '../core/walkTree.js';
import { createIndexWriter, loadExistingEntries } from '../core/indexWriter.js';
import { setLastIndexed, countDriveEntries } from '../core/database.js';

// fsOps: walkTree'nin bekledigi arayuz.
const fsOps = {
  readdir: (p, opts) => fs.readdir(p, opts),
  stat: (p) => fs.stat(p),
};

// Bir diski indeksler (fark tabanli). onProgress({ scanned, done }) periyodik cagrilir.
export async function indexDrive(db, hwId, letter, { onProgress, excludeDirs } = {}) {
  if (!letter) {
    throw new Error('Indekslenecek surucu harfi bilinmiyor.');
  }
  const root = `${letter}\\`;

  const existing = loadExistingEntries(db, hwId);
  const writer = createIndexWriter(db, hwId, { existing });
  let lastReport = 0;

  await walkTree(root, fsOps, {
    excludeDirs,
    onEntry: (entry) => {
      writer.onEntry(entry);
      if (onProgress && writer.count - lastReport >= 5000) {
        lastReport = writer.count;
        onProgress({ scanned: writer.count });
      }
    },
  });

  const result = writer.finalize();
  setLastIndexed(db, hwId);
  const counts = countDriveEntries(db, hwId);
  onProgress?.({ scanned: writer.count, done: true });
  return { ...counts, ...result };
}