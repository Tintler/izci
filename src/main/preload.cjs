// Preload: contextIsolation acikken renderer'a guvenli kopru saglar.
// CommonJS (.cjs) tutulur; boylece "type":"module" ile catismaz.
const { contextBridge, ipcRenderer } = require('electron');

const CH = {
  DRIVE_LIST_INDEXED: 'drive:listIndexed',
  DRIVE_LIST_ALL: 'drive:listAll',
  DRIVE_SCAN: 'drive:scan',
  DRIVE_SET_INDEXED: 'drive:setIndexed',
  DRIVE_SET_LABEL: 'drive:setLabel',
  INDEX_START: 'index:start',
  INDEX_PROGRESS: 'index:progress',
  SEARCH: 'search',
  FOLDER_LIST: 'folder:list',
  FOLDER_BREADCRUMB: 'folder:breadcrumb',
};

contextBridge.exposeInMainWorld('izci', {
  listIndexedDrives: () => ipcRenderer.invoke(CH.DRIVE_LIST_INDEXED),
  listAllDrives: () => ipcRenderer.invoke(CH.DRIVE_LIST_ALL),
  scanDrives: () => ipcRenderer.invoke(CH.DRIVE_SCAN),
  setIndexed: (hwId, indexed) => ipcRenderer.invoke(CH.DRIVE_SET_INDEXED, hwId, indexed),
  setLabel: (hwId, label) => ipcRenderer.invoke(CH.DRIVE_SET_LABEL, hwId, label),
  startIndex: (hwId) => ipcRenderer.invoke(CH.INDEX_START, hwId),
  onIndexProgress: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on(CH.INDEX_PROGRESS, handler);
    return () => ipcRenderer.removeListener(CH.INDEX_PROGRESS, handler);
  },
  search: (query, sortBy, desc) => ipcRenderer.invoke(CH.SEARCH, query, sortBy, desc),
  listFolder: (hwId, parentId, sortBy, desc) =>
    ipcRenderer.invoke(CH.FOLDER_LIST, hwId, parentId, sortBy, desc),
  folderBreadcrumb: (entryId) => ipcRenderer.invoke(CH.FOLDER_BREADCRUMB, entryId),
});