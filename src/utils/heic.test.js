// Pruebas de cómo se reconoce una foto HEIC. No necesitan navegador, se pasan con npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { esCabeceraHeic, esHeic, esHeicPorNombre, marcasFtyp } from './heic.js';

// Caja ftyp con su tamaño, la marca principal, la versión y las marcas compatibles
function ftyp(principal, ...compatibles) {
  const marcas = [principal, '\0\0\0\0', ...compatibles].join('');
  const tamano = 8 + marcas.length;
  const bytes = new Uint8Array(tamano + 8);
  new DataView(bytes.buffer).setUint32(0, tamano);
  bytes.set([...'ftyp' + marcas].map((c) => c.charCodeAt(0)), 4);
  return bytes;
}

// Principio de la HEIC que hace sips en un Mac (caso F03 del banco), igual que las del iPhone
const HEIC_SIPS = ftyp('heic', 'mif1', 'miaf', 'MiHB', 'heic');
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);

test('lee las marcas de la caja ftyp, la principal primero', () => {
  assert.deepEqual(marcasFtyp(HEIC_SIPS), ['heic', 'mif1', 'miaf', 'MiHB', 'heic']);
  assert.deepEqual(marcasFtyp(JPEG), []);
  assert.deepEqual(marcasFtyp(new Uint8Array(4)), []);
});

test('reconoce las HEIC del iPhone, de los Android y las HEIF genéricas', () => {
  assert.equal(esCabeceraHeic(HEIC_SIPS), true);
  assert.equal(esCabeceraHeic(ftyp('heix', 'mif1', 'heix')), true);
  assert.equal(esCabeceraHeic(ftyp('mif1', 'mif1', 'heic')), true);
  assert.equal(esCabeceraHeic(ftyp('msf1', 'msf1', 'hevc')), true);
  assert.equal(esCabeceraHeic(ftyp('mif1', 'mif1')), true);
});

test('no confunde con una HEIC el AVIF, un vídeo MP4 ni un JPEG', () => {
  assert.equal(esCabeceraHeic(ftyp('avif', 'avif', 'mif1', 'miaf')), false);
  assert.equal(esCabeceraHeic(ftyp('mif1', 'mif1', 'avif', 'miaf')), false);
  assert.equal(esCabeceraHeic(ftyp('isom', 'isom', 'iso2', 'mp41')), false);
  assert.equal(esCabeceraHeic(ftyp('qt  ', 'qt  ')), false);
  assert.equal(esCabeceraHeic(JPEG), false);
});

test('por el nombre, mira el tipo y la extensión', () => {
  assert.equal(esHeicPorNombre({ name: 'IMG_0001.HEIC', type: '' }), true);
  assert.equal(esHeicPorNombre({ name: 'foto.heif', type: '' }), true);
  assert.equal(esHeicPorNombre({ name: 'foto', type: 'image/heic' }), true);
  assert.equal(esHeicPorNombre({ name: 'foto', type: 'image/heif-sequence' }), true);
  assert.equal(esHeicPorNombre({ name: 'heic.jpg', type: 'image/jpeg' }), false);
  assert.equal(esHeicPorNombre(null), false);
});

test('manda el contenido sobre el nombre', async () => {
  // Una HEIC con otro nombre y sin tipo
  assert.equal(await esHeic(new File([HEIC_SIPS], 'dni.jpg', { type: '' })), true);
  // Un JPEG de verdad
  assert.equal(await esHeic(new File([JPEG], 'dni.jpg', { type: 'image/jpeg' })), false);
  // Un AVIF que se llama .heic no es una HEIC
  assert.equal(await esHeic(new File([ftyp('avif', 'avif', 'mif1')], 'dni.heic', { type: 'image/heic' })), false);
  // Sin caja ftyp decide el nombre. Si es un JPEG llamado .heic, el navegador lo abrirá al convertirlo
  assert.equal(await esHeic(new File([JPEG], 'dni.heic', { type: '' })), true);
});
