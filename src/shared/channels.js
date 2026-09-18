// IPC kanal isimleri (main <-> renderer sozlesmesi; saf sabitler).

export const CHANNELS = {
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