import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, resolveLang, isSupportedLang, keysOf, LANGS, DEFAULT_LANG } from '../src/core/i18n.js';

test('resolveLang: gecerli dil korunur, gecersiz varsayilana duser', () => {
  assert.equal(resolveLang('en'), 'en');
  assert.equal(resolveLang('tr'), 'tr');
  assert.equal(resolveLang('de'), DEFAULT_LANG);
  assert.equal(resolveLang(null), DEFAULT_LANG);
});

test('isSupportedLang', () => {
  assert.equal(isSupportedLang('en'), true);
  assert.equal(isSupportedLang('fr'), false);
});

test('t: bilinen anahtar cevrilir', () => {
  assert.equal(t('en', 'nav.drives'), 'Drives');
  assert.equal(t('tr', 'nav.drives'), 'Diskler');
});

test('t: bilinmeyen dil varsayilana duser', () => {
  assert.equal(t('xx', 'nav.search'), t(DEFAULT_LANG, 'nav.search'));
});

test('t: parametre yer tutuculari degistirilir', () => {
  assert.equal(t('en', 'search.results', { q: 'film', n: 12 }), '12 results for “film”');
  assert.equal(t('tr', 'search.results', { q: 'film', n: 12 }), '“film” için 12 sonuç');
});

test('t: verilmeyen parametre yer tutucu olarak kalir', () => {
  assert.equal(t('en', 'card.scanFailed', { error: 'X' }), 'Scan failed: X');
  assert.match(t('en', 'card.scanFailed', {}), /\{error\}/);
});

test('t: eksik anahtar anahtarin kendisini doner', () => {
  assert.equal(t('en', 'yok.boyle.anahtar'), 'yok.boyle.anahtar');
});

test('tr ve en ayni anahtar kumesine sahip', () => {
  const tr = keysOf('tr').sort();
  const en = keysOf('en').sort();
  assert.deepEqual(tr, en);
});

test('LANGS: tr ve en icerir', () => {
  assert.deepEqual(LANGS, ['tr', 'en']);
});