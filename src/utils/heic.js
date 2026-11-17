/**
 * Reconoce las fotos HEIC (o HEIF), el formato de las fotos del iPhone y de algunos Android.
 *
 * Manda el contenido del archivo y no el nombre. Algunos navegadores dan las HEIC sin tipo
 * y a veces llegan con otra extensión. El nombre solo decide si el archivo no empieza por una caja ftyp
 * o no se puede leer.
 * La conversión a JPEG está en convertirHeic.js, que se descarga solo cuando llega una HEIC.
 */

const TIPO_HEIC = /^image\/hei[cf](-sequence)?$/i;
const EXTENSION_HEIC = /\.(heic|heif|hif)$/i;

// Marcas de la caja ftyp, al principio del archivo, de un HEIF con la foto en HEVC (la HEIC del iPhone)
const MARCAS_HEIC = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs']);
// Marcas genéricas de HEIF, que también lleva el AVIF
const MARCAS_HEIF = new Set(['mif1', 'mif2', 'msf1']);
// El AVIF usa el mismo contenedor, pero no es HEIC
const MARCAS_AVIF = new Set(['avif', 'avis']);

/** Si el tipo o la extensión dicen que es una HEIC, sin leer el archivo */
export const esHeicPorNombre = (file) => TIPO_HEIC.test(file?.type || '') || EXTENSION_HEIC.test(file?.name || '');

const texto = (bytes, desde) => String.fromCharCode(...bytes.subarray(desde, desde + 4));

/**
 * Marcas de la caja ftyp, la principal primero. Lista vacía si el archivo no empieza por una caja ftyp.
 * La caja lleva su tamaño (4 bytes), 'ftyp', la marca principal, la versión (4 bytes) y las marcas compatibles
 * @param {Uint8Array} bytes - Principio del archivo
 * @returns {string[]}
 */
export function marcasFtyp(bytes) {
  if (bytes.length < 12 || texto(bytes, 4) !== 'ftyp') return [];
  const tamano = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  // Tamaño 0 quiere decir hasta el final del archivo
  const fin = Math.min(tamano === 0 ? bytes.length : tamano, bytes.length);
  const marcas = [texto(bytes, 8)];
  for (let i = 16; i + 4 <= fin; i += 4) marcas.push(texto(bytes, i));
  return marcas;
}

/**
 * Si el principio del archivo es el de una HEIC
 * @param {Uint8Array} bytes - Principio del archivo (con 64 bytes basta)
 * @returns {boolean}
 */
export function esCabeceraHeic(bytes) {
  const [principal, ...compatibles] = marcasFtyp(bytes);
  if (!principal) return false;
  if (MARCAS_HEIC.has(principal)) return true;
  if (MARCAS_AVIF.has(principal) || compatibles.some((marca) => MARCAS_AVIF.has(marca))) return false;
  return MARCAS_HEIF.has(principal) || compatibles.some((marca) => MARCAS_HEIC.has(marca) || MARCAS_HEIF.has(marca));
}

/**
 * Si el archivo es una HEIC. Lee solo sus primeros 64 bytes
 * @param {File|Blob} file
 * @returns {Promise<boolean>}
 */
export async function esHeic(file) {
  try {
    const cabecera = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    if (marcasFtyp(cabecera).length) return esCabeceraHeic(cabecera);
  } catch {
    // Si no se puede leer, decide el nombre
  }
  return esHeicPorNombre(file);
}
