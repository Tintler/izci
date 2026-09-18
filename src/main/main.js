// Electron main process: ince kabuk. Is mantigi ../core altindaki saf modullerde.
import { app, BrowserWindow, ipcMain, nativeImage, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  openDatabase,
  listIndexedDrives,
  listAllDrives,
  setDriveIndexed,
  setCustomLabel,
  upsertDrive,
  markAllDisconnected,
  getDrive,
} from '../core/database.js';
import { usableDrives } from '../core/driveScan.js';
import { scanDrives } from './driveProbe.js';
import { indexDrive } from './indexRunner.js';
import { searchEntries } from '../core/search.js';
import { listChildren, breadcrumb } from '../core/browse.js';
import { CHANNELS } from '../shared/channels.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Proje koku: src/main -> ../../
const projectRoot = join(__dirname, '..', '..');
let db = null;
let ftsAvailable = false;

// Veritabani konumu.
// - Portable exe: exe'nin bulundugu klasor (PORTABLE_EXECUTABLE_DIR).
// - Aksi halde (dev/normal): kullanicinin uygulama veri klasoru.
function databasePath() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir && portableDir.trim() !== '') {
    return join(portableDir, 'izci.db');
  }
  return join(app.getPath('userData'), 'izci.db');
}

// Pencere/uygulama ikonu (build/izci.ico). Yoksa sessizce atlanir.
function appIconPath() {
  const ico = join(projectRoot, 'build', 'izci.ico');
  if (existsSync(ico)) return ico;
  const png = join(projectRoot, 'build', 'izci-mark-256.png');
  if (existsSync(png)) return png;
  return null;
}

function createWindow() {
  const iconPath = appIconPath();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f1115',
    title: 'İzci',
    ...(iconPath ? { icon: nativeImage.createFromPath(iconPath) } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(join(__dirname, '../../dist/renderer/index.html'));
  }
}

function registerIpc() {
  ipcMain.handle(CHANNELS.DRIVE_LIST_INDEXED, () => listIndexedDrives(db));
  ipcMain.handle(CHANNELS.DRIVE_LIST_ALL, () => listAllDrives(db));
  ipcMain.handle(CHANNELS.DRIVE_SET_INDEXED, (_e, hwId, indexed) =>
    setDriveIndexed(db, hwId, Boolean(indexed))
  );
  ipcMain.handle(CHANNELS.DRIVE_SET_LABEL, (_e, hwId, label) =>
    setCustomLabel(db, hwId, label)
  );
  ipcMain.handle(CHANNELS.DRIVE_SCAN, () => refreshDrives());
  ipcMain.handle(CHANNELS.INDEX_START, (event, hwId) => startIndex(event, hwId));
  ipcMain.handle(CHANNELS.SEARCH, (_e, query, sortBy, desc) =>
    searchEntries(db, { query, ftsAvailable, sortBy, desc })
  );
  ipcMain.handle(CHANNELS.FOLDER_LIST, (_e, hwId, parentId, sortBy, desc) =>
    listChildren(db, hwId, parentId ?? null, { sortBy, desc })
  );
  ipcMain.handle(CHANNELS.FOLDER_BREADCRUMB, (_e, entryId) =>
    breadcrumb(db, entryId ?? null)
  );
}

// Tek bir diski indeksler; ilerlemeyi renderer'a bildirir.
async function startIndex(event, hwId) {
  const drive = getDrive(db, hwId);
  if (!drive) throw new Error('Disk bulunamadi.');
  if (!drive.connected) throw new Error('Disk bagli degil; indeksleme icin once takin.');

  const sender = event.sender;
  try {
    const counts = await indexDrive(db, hwId, drive.currentLetter, {
      onProgress: (p) => {
        if (!sender.isDestroyed()) sender.send(CHANNELS.INDEX_PROGRESS, { hwId, ...p });
      },
    });
    return { ok: true, ...counts };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Bagli diskleri tarar, DB'ye isler ve guncel listeyi dondurur.
async function refreshDrives() {
  const scanned = await scanDrives();
  const drives = usableDrives(scanned);
  markAllDisconnected(db);
  for (const d of drives) {
    upsertDrive(db, {
      hwId: d.hwId,
      letter: d.letter,
      fsType: d.fsType,
      volumeLabel: d.volumeLabel,
      totalBytes: d.totalBytes,
      usedBytes: d.usedBytes,
      freeBytes: d.freeBytes,
      connected: 1,
    });
  }
  return listAllDrives(db);
}

app.whenReady().then(() => {
  // Varsayilan File/Edit/Window menusunu kaldir.
  Menu.setApplicationMenu(null);
  const iconPath = appIconPath();
  if (iconPath) app.setAppUserModelId('com.izci.app');
  const dbPath = databasePath();
  const opened = openDatabase(dbPath);
  db = opened.db;
  ftsAvailable = opened.ftsAvailable;

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});