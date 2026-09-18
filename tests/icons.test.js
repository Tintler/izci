import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extensionOf, iconKind } from '../src/core/icons.js';

test('extensionOf: uzantiyi kucuk harf dondurur', () => {
  assert.equal(extensionOf('Film.MKV'), 'mkv');
  assert.equal(extensionOf('a.tar.gz'), 'gz');
});

test('extensionOf: uzanti yoksa bos string', () => {
  assert.equal(extensionOf('README'), '');
  assert.equal(extensionOf('.gitignore'), '');
  assert.equal(extensionOf('sondaki.'), '');
  assert.equal(extensionOf(null), '');
});

test('iconKind: klasor her zaman folder', () => {
  assert.equal(iconKind('Medya', true), 'folder');
  assert.equal(iconKind('resim.png', true), 'folder');
});

test('iconKind: resim uzantilari', () => {
  assert.equal(iconKind('a.jpg', false), 'image');
  assert.equal(iconKind('a.PNG', false), 'image');
  assert.equal(iconKind('a.svg', false), 'image');
});

test('iconKind: video uzantilari', () => {
  assert.equal(iconKind('film.mkv', false), 'video');
  assert.equal(iconKind('film.MP4', false), 'video');
});

test('iconKind: ses uzantilari', () => {
  assert.equal(iconKind('sarki.flac', false), 'audio');
  assert.equal(iconKind('sarki.MP3', false), 'audio');
});

test('iconKind: bilinmeyen/uzantisiz dosya -> file', () => {
  assert.equal(iconKind('notes.txt', false), 'file');
  assert.equal(iconKind('README', false), 'file');
  assert.equal(iconKind('veri.xyz', false), 'file');
});