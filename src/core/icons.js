// Sonuc satiri icin ikon turu belirleme (saf mantik; Electron bagimliligi yok).
// Donen tur: 'folder' | 'image' | 'video' | 'audio' | 'file'

const IMAGE_EXT = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tif', 'tiff',
  'heic', 'heif', 'avif', 'ico', 'raw', 'cr2', 'nef',
]);

const VIDEO_EXT = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg',
  'mpeg', '3gp', 'ts', 'm2ts', 'vob', 'rmvb', 'ogv',
]);

const AUDIO_EXT = new Set([
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'aiff',
  'aif', 'alac', 'ape', 'mid', 'midi',
]);

// Dosya adindan uzantiyi (kucuk harf, nokta olmadan) dondurur. Yoksa ''.
export function extensionOf(name) {
  if (name === null || name === undefined) return '';
  const s = String(name);
  const dot = s.lastIndexOf('.');
  if (dot <= 0 || dot === s.length - 1) return '';
  return s.slice(dot + 1).toLowerCase();
}

// Satir icin ikon turunu belirler. Klasorler her zaman 'folder'.
export function iconKind(name, isDir) {
  if (isDir) return 'folder';
  const ext = extensionOf(name);
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  if (AUDIO_EXT.has(ext)) return 'audio';
  return 'file';
}