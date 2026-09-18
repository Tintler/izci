// Veritabani semasi (saf SQL tanimlari; Electron bagimliligi yok).

export const SCHEMA_VERSION = 1;

// Temel tablolar. Surucu kimligi hw_id'dir (bkz. driveKey.js).
export const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS drives (
  hw_id          TEXT PRIMARY KEY,
  volume_serial  TEXT,
  current_letter TEXT,
  fs_type        TEXT,
  total_bytes    INTEGER,
  used_bytes     INTEGER,
  free_bytes     INTEGER,
  volume_label   TEXT,
  custom_label   TEXT,
  indexed        INTEGER NOT NULL DEFAULT 0,
  connected      INTEGER NOT NULL DEFAULT 0,
  last_seen      TEXT,
  last_indexed   TEXT
);

CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  hw_id      TEXT NOT NULL REFERENCES drives(hw_id) ON DELETE CASCADE,
  parent_id  INTEGER,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL,
  is_dir     INTEGER NOT NULL DEFAULT 0,
  size       INTEGER,
  mtime      TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_hw_id ON entries(hw_id);
CREATE INDEX IF NOT EXISTS idx_entries_parent ON entries(parent_id);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

// FTS5 varsa olusturulur; yoksa null doner ve arama LIKE tabanina duser.
export const FTS_SCHEMA = `
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  name,
  path,
  content='entries',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS entries_fts_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, name, path) VALUES (new.id, new.name, new.path);
END;
CREATE TRIGGER IF NOT EXISTS entries_fts_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, name, path) VALUES ('delete', old.id, old.name, old.path);
END;
CREATE TRIGGER IF NOT EXISTS entries_fts_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, name, path) VALUES ('delete', old.id, old.name, old.path);
  INSERT INTO entries_fts(rowid, name, path) VALUES (new.id, new.name, new.path);
END;
`;

// FTS5 var mi diye dener; true/false doner, hata firlatmaz.
export function detectFts(db) {
  try {
    db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS __fts_probe USING fts5(x)");
    db.exec('DROP TABLE IF EXISTS __fts_probe');
    return true;
  } catch {
    return false;
  }
}

// Semayi uygular. ftsAvailable true ise FTS tablosu/trigger'lari eklenir.
export function applySchema(db, { ftsAvailable }) {
  db.exec(BASE_SCHEMA);
  if (ftsAvailable) {
    db.exec(FTS_SCHEMA);
  }
  db.prepare(
    'INSERT INTO meta(key, value) VALUES(?, ?) ' +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', String(SCHEMA_VERSION));
}