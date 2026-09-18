// Coklu dil (saf mantik; Electron/DOM bagimliligi yok).
// t(lang, key, params) -> cevrilmis metin. Eksik anahtar varsa anahtar doner.

export const LANGS = ['tr', 'en'];
export const DEFAULT_LANG = 'tr';

const STRINGS = {
  tr: {
    'topbar.searchPlaceholder': 'Dosya veya klasör ara… (Enter)',
    'topbar.admin': '● Yönetici',
    'topbar.refresh': 'Yenile',
    'topbar.refreshing': 'Taranıyor…',
    'topbar.langTitle': 'Dil',

    'nav.drives': 'Diskler',
    'nav.add': 'Disk ekle',
    'nav.browse': 'Gezinti',
    'nav.search': 'Arama',

    'view.compact': 'Kompakt',
    'view.normal': 'Normal',
    'view.toCompact': 'Kompakt görünüme geç',
    'view.toNormal': 'Normal görünüme geç',

    'drives.title': 'Diskler',
    'drives.sub': 'Yalnızca indekslediğin diskler burada görünür.',
    'drives.empty': 'Henüz indekslenen disk yok. “Disk ekle”den başla.',
    'drives.loadFailed': 'Diskler yüklenemedi.',

    'add.title': 'Disk ekle',
    'add.sub': 'Bağlı diskler. İndekslemek istediklerini işaretle.',
    'add.empty': 'Bağlı disk bulunamadı. “Yenile”ye bas.',

    'browse.back': '← Geri',
    'browse.atRoot': 'En üst dizindesin',
    'browse.empty': 'Bu klasör boş ya da indekslenmemiş.',

    'search.title': 'Arama',
    'search.hint': "Üstteki kutuya yazıp Enter'a bas.",
    'search.searching': 'Aranıyor…',
    'search.noResults': '“{q}” için sonuç yok.',
    'search.results': '“{q}” için {n} sonuç',
    'search.failed': 'Arama başarısız.',

    'col.name': 'Ad',
    'col.kind': 'Tür',
    'col.path': 'Yol',
    'col.size': 'Boyut',
    'col.disk': 'Disk',

    'card.noLabel': 'Etiketsiz disk',
    'card.connected': 'Bağlı',
    'card.disconnected': 'Bağlı değil',
    'card.used': 'dolu',
    'card.free': 'boş',
    'card.clickToBrowse': 'Gezmek için karta tıkla',
    'card.index': 'İndeksle',
    'card.editLabel': 'Etiketi düzenle',
    'card.scanNow': 'Şimdi tara',
    'card.scanNotConnected': "Disk bağlı değil. Önce takıp Yenile'ye bas.",
    'card.scanDone': 'Tarama bitti: {total} kayıt ({files} dosya).',
    'card.scanStats': 'Gezilen: {walked} · Yazılan: {written} · Atlanan: {skipped} · Silinen: {removed}',
    'card.scanFailed': 'Tarama başarısız: {error}',
    'card.scanning': 'Taranıyor… {n} kayıt',
    'card.scanComplete': 'Tarama tamamlandı.',

    'totals.drives': 'Disk: <b>{n}</b> (bağlı {connected})',
    'totals.capacity': 'Toplam kapasite:',
    'totals.used': 'Dolu:',
    'totals.free': 'Boş:',

    'modal.title': 'Disk etiketi',
    'modal.placeholder': 'Örn. Yedek 4TB',
    'modal.cancel': 'İptal',
    'modal.save': 'Kaydet',
    'modal.confirm': 'Onayla',
    'confirm.disableTitle': 'İndekslemeyi kapat?',
    'confirm.disableBody': '“{label}” artık ana ekranda görünmeyecek. Kayıtlı indeks verisi silinmez; yeniden açtığında geri gelir.',

    'kind.folder': 'Klasör',
    'kind.file': 'Dosya',
    'common.root': 'Kök',
  },

  en: {
    'topbar.searchPlaceholder': 'Search files or folders… (Enter)',
    'topbar.admin': '● Administrator',
    'topbar.refresh': 'Refresh',
    'topbar.refreshing': 'Scanning…',
    'topbar.langTitle': 'Language',

    'nav.drives': 'Drives',
    'nav.add': 'Add drive',
    'nav.browse': 'Browse',
    'nav.search': 'Search',

    'view.compact': 'Compact',
    'view.normal': 'Normal',
    'view.toCompact': 'Switch to compact view',
    'view.toNormal': 'Switch to normal view',

    'drives.title': 'Drives',
    'drives.sub': 'Only the drives you indexed appear here.',
    'drives.empty': 'No indexed drives yet. Start from “Add drive”.',
    'drives.loadFailed': 'Could not load drives.',

    'add.title': 'Add drive',
    'add.sub': 'Connected drives. Tick the ones you want to index.',
    'add.empty': 'No connected drives found. Press “Refresh”.',

    'browse.back': '← Back',
    'browse.atRoot': 'You are at the top level',
    'browse.empty': 'This folder is empty or not indexed.',

    'search.title': 'Search',
    'search.hint': 'Type in the box above and press Enter.',
    'search.searching': 'Searching…',
    'search.noResults': 'No results for “{q}”.',
    'search.results': '{n} results for “{q}”',
    'search.failed': 'Search failed.',

    'col.name': 'Name',
    'col.kind': 'Type',
    'col.path': 'Path',
    'col.size': 'Size',
    'col.disk': 'Drive',

    'card.noLabel': 'Unlabeled drive',
    'card.connected': 'Connected',
    'card.disconnected': 'Not connected',
    'card.used': 'used',
    'card.free': 'free',
    'card.clickToBrowse': 'Click the card to browse',
    'card.index': 'Index',
    'card.editLabel': 'Edit label',
    'card.scanNow': 'Scan now',
    'card.scanNotConnected': 'Drive is not connected. Plug it in and press Refresh.',
    'card.scanDone': 'Scan finished: {total} entries ({files} files).',
    'card.scanStats': 'Visited: {walked} · Written: {written} · Skipped: {skipped} · Removed: {removed}',
    'card.scanFailed': 'Scan failed: {error}',
    'card.scanning': 'Scanning… {n} entries',
    'card.scanComplete': 'Scan complete.',

    'totals.drives': 'Drives: <b>{n}</b> ({connected} connected)',
    'totals.capacity': 'Total capacity:',
    'totals.used': 'Used:',
    'totals.free': 'Free:',

    'modal.title': 'Drive label',
    'modal.placeholder': 'e.g. Backup 4TB',
    'modal.cancel': 'Cancel',
    'modal.save': 'Save',
    'modal.confirm': 'Confirm',
    'confirm.disableTitle': 'Turn off indexing?',
    'confirm.disableBody': '“{label}” will no longer appear on the main screen. The stored index is not deleted; it comes back if you re-enable it.',

    'kind.folder': 'Folder',
    'kind.file': 'File',
    'common.root': 'Root',
  },
};

// Gecerli dil kodu mu?
export function isSupportedLang(lang) {
  return LANGS.includes(lang);
}

// Kayitli/istenen dili normalize eder; desteklenmiyorsa varsayilana duser.
export function resolveLang(lang) {
  return isSupportedLang(lang) ? lang : DEFAULT_LANG;
}

// Ceviri dondurur; {param} yer tutuculari params ile degistirilir.
// Eksik anahtar varsa anahtarin kendisi doner (sessiz bos metin yerine gorunur).
export function t(lang, key, params = {}) {
  const resolved = resolveLang(lang);
  const table = STRINGS[resolved];
  let value = table[key];
  if (value === undefined) {
    value = STRINGS[DEFAULT_LANG][key];
  }
  if (value === undefined) return key;
  return value.replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m
  );
}

// Bir dilin tum anahtarlarini dondurur (test/arac amacli).
export function keysOf(lang) {
  return Object.keys(STRINGS[resolveLang(lang)]);
}