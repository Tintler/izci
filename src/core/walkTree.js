// Ozyinelemeli dosya agaci gezme (saf mantik; fs enjekte edilir, test edilebilir).
// fsOps: { readdir(path, { withFileTypes }) -> Dirent[], stat(path) -> Stats }
// Her giris icin onEntry({ path, name, parentPath, isDir, size, mtime }) cagrilir.
//
// ONEMLI: Gercek yollar (ayraclar korunarak) fs cagrilarinda kullanilir.
// normalizePath yalnizca karsilastirma anahtaridir (haric tutma, harita).

// Bir dizini ozyinelemeli gezer. Kok dizinin kendisi giris olarak bildirilmez;
// yalnizca icindekiler (ve alt klasorlerin icindekiler) bildirilir.
export async function walkTree(root, fsOps, { onEntry, excludeDirs } = {}) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new TypeError('Kok dizin yolu gerekli.');
  }
  const excluded = excludeDirs ?? new Set();

  // Kok dizinin kendisi giris olarak bildirilmez (emitSelf=false).
  await visit(root, null, false);
  return;

  // emitSelf true ise bu klasor onEntry ile bildirilir (kok icin false).
  async function visit(currentPath, parentPath, emitSelf) {
    if (excluded.has(normalizePath(currentPath))) return;

    let dirents = null;
    let readError = null;
    try {
      dirents = await fsOps.readdir(currentPath, { withFileTypes: true });
    } catch (err) {
      readError = err;
    }

    if (readError) {
      // Erisilemeyen klasor tek kayit olarak bildirilir; tarama durmaz.
      onEntry?.({
        path: currentPath,
        name: baseName(currentPath),
        parentPath,
        isDir: true,
        size: null,
        mtime: null,
        error: readError?.code ?? 'EACCES',
      });
      return;
    }

    if (emitSelf) {
      let stat = null;
      try {
        stat = await fsOps.stat(currentPath);
      } catch {
        stat = null;
      }
      onEntry?.({
        path: currentPath,
        name: baseName(currentPath),
        parentPath,
        isDir: true,
        size: null,
        mtime: toIso(stat?.mtime),
      });
    }

    for (const dirent of dirents) {
      const childPath = joinPath(currentPath, dirent.name);
      if (excluded.has(normalizePath(childPath))) continue;

      if (dirent.isDirectory()) {
        await visit(childPath, currentPath, true);
      } else {
        let stat = null;
        try {
          stat = await fsOps.stat(childPath);
        } catch {
          stat = null;
        }
        onEntry?.({
          path: childPath,
          name: dirent.name,
          parentPath: currentPath,
          isDir: false,
          size: Number.isFinite(stat?.size) ? stat.size : null,
          mtime: toIso(stat?.mtime),
        });
      }
    }
  }
}

// Karsilastirma anahtari: ters slash, kucuk harf, sondaki ayrac yok.
// ("F:\\" -> "f:") Yalnizca esitlik/kume aramalari icin; fs'e verilmez.
export function normalizePath(p) {
  return String(p).replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
}

function joinPath(parent, name) {
  const sep = parent.includes('\\') ? '\\' : '/';
  return parent.endsWith(sep) ? `${parent}${name}` : `${parent}${sep}${name}`;
}

function baseName(p) {
  const parts = String(p).replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function toIso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}