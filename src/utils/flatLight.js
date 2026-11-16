/**
 * Búsqueda de campos con una segunda pasada sobre una copia de la foto con la luz aplanada, como la de un escáner.
 *
 * Las fotos hechas con la cámara desde el navegador salen con la luz desigual y poco contraste, y el detector se deja
 * campos pequeños. El 16/11/2026 un anverso hecho con un Galaxy S24 Ultra dio 12 detecciones (faltaban CAN, soporte,
 * firma y las dos fechas), y juntando las de la copia 17, con todos los datos. Las fotos normales del mismo DNI no
 * perdieron nada (18 y 17 detecciones antes, 18 y 19 después).
 *
 * Las detecciones de la foto tal cual se quedan todas, y de la copia solo se añaden los campos que falten.
 * La copia solo sirve para buscar campos. Lo que se tapa y se lee sigue saliendo de la foto original.
 */

// La copia se hace al tamaño con el que trabaja el modelo. Más grande no le sirve de nada y tarda más
export const FLAT_LIGHT_MAX_SIDE = 640;
// Brillo con el que queda el fondo del documento después de aplanar la luz
const FLAT_LIGHT_WHITE = 235;
// Dos cajas de la misma clase son el mismo campo si se solapan como en el NMS del detector, o si la pequeña cae
// casi entera dentro de la grande
const SAME_FIELD_IOU = 0.45;
const SAME_FIELD_INSIDE = 0.5;

// Media de 2r+1 valores seguidos de una fila o una columna, repitiendo el valor del borde
function blurLine(src, dst, start, step, length, r) {
  const last = length - 1;
  const at = (i) => src[start + (i < 0 ? 0 : i > last ? last : i) * step];
  const scale = 1 / (2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += at(i);
  for (let i = 0; i < length; i++) {
    dst[start + i * step] = sum * scale;
    sum += at(i + r + 1) - at(i - r);
  }
}

// Radios de varios desenfoques de caja seguidos que juntos se parecen a un desenfoque gaussiano. Cuestan lo mismo
// sea cual sea el radio
function boxRadiiForGauss(sigma, passes) {
  const ideal = Math.sqrt((12 * sigma * sigma) / passes + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower -= 1;
  const upper = lower + 2;
  const lowerPasses = Math.round(
    (12 * sigma * sigma - passes * lower * lower - 4 * passes * lower - 3 * passes) / (-4 * lower - 4),
  );
  return Array.from({ length: passes }, (_, i) => ((i < lowerPasses ? lower : upper) - 1) / 2);
}

/**
 * Aplana la luz de una imagen: divide cada canal por su media en un entorno amplio, para que el fondo quede parejo
 * y el texto con más contraste. Es lo que se probó con OpenCV (GaussianBlur con un núcleo de 1/8 del lado corto),
 * hecho con tres desenfoques de caja.
 * @param {Uint8ClampedArray} data - Píxeles RGBA
 * @param {number} width
 * @param {number} height
 * @returns {Uint8ClampedArray} Píxeles RGBA nuevos, opacos
 */
export function flattenLight(data, width, height) {
  const size = width * height;
  // Los mismos números que OpenCV saca del tamaño del núcleo cuando no se le da sigma
  const kernel = Math.max(31, Math.floor(Math.min(width, height) / 8) | 1);
  const sigma = 0.3 * ((kernel - 1) * 0.5 - 1) + 0.8;
  const radii = boxRadiiForGauss(sigma, 3);

  const out = new Uint8ClampedArray(size * 4);
  const channel = new Float32Array(size);
  const background = new Float32Array(size);
  const temp = new Float32Array(size);
  for (let c = 0; c < 3; c++) {
    for (let p = 0; p < size; p++) channel[p] = data[p * 4 + c];
    background.set(channel);
    for (const r of radii) {
      for (let y = 0; y < height; y++) blurLine(background, temp, y * width, 1, width, r);
      for (let x = 0; x < width; x++) blurLine(temp, background, x, width, height, r);
    }
    for (let p = 0; p < size; p++) out[p * 4 + c] = (channel[p] / Math.max(background[p], 1)) * FLAT_LIGHT_WHITE;
  }
  for (let p = 0; p < size; p++) out[p * 4 + 3] = 255;
  return out;
}

function sameField(a, b) {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return false;
  const intersection = w * h;
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  return intersection / (areaA + areaB - intersection) > SAME_FIELD_IOU
    || intersection / Math.min(areaA, areaB) > SAME_FIELD_INSIDE;
}

/**
 * Junta las detecciones de la foto con las de la copia aplanada. Las de la foto se quedan todas. De la copia se
 * añaden, de más confianza a menos, los campos que no estén ya. El documento (DOC_) se decide solo con la foto.
 * @param {Array} base - Detecciones de la foto tal cual
 * @param {Array} extra - Detecciones de la copia, en las mismas coordenadas
 */
export function mergeDetections(base, extra) {
  const merged = [...base];
  const candidates = extra.filter((box) => !box.label.startsWith('DOC_')).sort((a, b) => b.confidence - a.confidence);
  for (const box of candidates) {
    if (!merged.some((kept) => kept.label === box.label && sameField(kept, box))) merged.push(box);
  }
  return merged;
}

// Detecciones de la copia aplanada, pasadas a píxeles de la foto original
async function detectFlatCopy(bitmap, detect) {
  const scale = Math.min(1, FLAT_LIGHT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  image.data.set(flattenLight(image.data, canvas.width, canvas.height));
  ctx.putImageData(image, 0, 0);

  const boxes = await detect(canvas);
  const sx = bitmap.width / canvas.width;
  const sy = bitmap.height / canvas.height;
  return boxes.map((box) => ({ ...box, x: box.x * sx, y: box.y * sy, width: box.width * sx, height: box.height * sy }));
}

/**
 * Busca los campos de una foto en la foto tal cual y en una copia con la luz aplanada, y junta lo que salga.
 * Las cajas vienen en píxeles de la foto. Si la copia falla, se sigue solo con las detecciones de la foto.
 * @param {Blob} file - Foto ya recortada
 * @param {(canvas: HTMLCanvasElement) => Promise<Array>} detect - Detector de campos sobre un lienzo
 */
export async function detectWithFlatLight(file, detect) {
  const bitmap = await createImageBitmap(file);
  try {
    const original = document.createElement('canvas');
    original.width = bitmap.width;
    original.height = bitmap.height;
    original.getContext('2d').drawImage(bitmap, 0, 0);
    const normalPromise = detect(original);

    // La copia se prepara mientras el detector mira la foto, y se le pasa justo después
    const flatPromise = Promise.resolve()
      .then(() => detectFlatCopy(bitmap, detect))
      .catch((error) => {
        console.warn('⚠️ [luz aplanada] No se ha podido mirar la copia, se sigue solo con la foto:', error);
        return [];
      });

    const [normal, extra] = await Promise.all([normalPromise, flatPromise]);
    const merged = mergeDetections(normal, extra);
    console.log(`🔍 [luz aplanada] ${normal.length} detecciones en la foto, ${merged.length} juntando la copia`);
    return merged;
  } finally {
    bitmap.close?.();
  }
}
