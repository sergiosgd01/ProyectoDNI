// Pruebas de la copia con la luz aplanada que usa el editor para buscar campos. No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flattenLight, mergeDetections } from './flatLight.js';

// Imagen gris con la luz cayendo de izquierda (220) a derecha (100) y un trazo oscuro en el centro, como un texto
function unevenImage(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const light = 220 - (120 * x) / (width - 1);
      const ink = x >= width / 2 - 2 && x <= width / 2 + 2 && y >= height / 3 && y <= (2 * height) / 3;
      const value = ink ? light * 0.4 : light;
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return data;
}

const pixel = (data, width, x, y) => data[(y * width + x) * 4];

test('aplanar la luz deja el fondo parejo y el texto oscuro', () => {
  const width = 200;
  const height = 120;
  const flat = flattenLight(unevenImage(width, height), width, height);
  const left = pixel(flat, width, 20, 10);
  const right = pixel(flat, width, 180, 10);
  // Antes el fondo iba de 220 a 100. Después los dos lados quedan cerca del blanco del documento
  assert.ok(Math.abs(left - right) <= 8, `fondo ${left} a la izquierda y ${right} a la derecha`);
  assert.ok(left > 220 && right > 220, `fondo ${left} y ${right}`);
  // El trazo sigue muy por debajo del fondo que lo rodea
  assert.ok(pixel(flat, width, 100, 60) < left * 0.6, `trazo ${pixel(flat, width, 100, 60)} con fondo ${left}`);
  // Imagen opaca del mismo tamaño
  assert.equal(flat.length, width * height * 4);
  assert.equal(flat[3], 255);
});

test('aplanar la luz de una imagen pareja apenas la cambia de tono', () => {
  const width = 50;
  const height = 40;
  const data = new Uint8ClampedArray(width * height * 4).fill(180);
  const flat = flattenLight(data, width, height);
  assert.equal(pixel(flat, width, 25, 20), 235);
  assert.equal(pixel(flat, width, 0, 0), 235);
});

const box = (label, x, y, width, height, confidence = 0.9) => ({ label, x, y, width, height, confidence });

test('juntar detecciones deja todas las de la foto y añade de la copia solo los campos que faltan', () => {
  const base = [box('DOC_DNI', 0, 0, 1000, 600, 1), box('NOMBRE', 100, 100, 200, 40), box('NUM_DNI', 100, 500, 200, 40)];
  const extra = [
    box('DOC_DNI', 2, 1, 1000, 600, 0.99),
    // El mismo nombre un poco movido es el mismo campo
    box('NOMBRE', 110, 104, 200, 40, 0.95),
    // Un campo que la foto no tenía
    box('CAN', 800, 520, 120, 30, 0.7),
  ];
  const merged = mergeDetections(base, extra);
  assert.deepEqual(merged.map((b) => b.label), ['DOC_DNI', 'NOMBRE', 'NUM_DNI', 'CAN']);
  // Las de la foto no cambian
  assert.equal(merged[1].x, 100);
});

test('juntar detecciones no añade una caja de la misma clase que cae dentro de otra', () => {
  const base = [box('FIRMA', 500, 400, 300, 100)];
  const merged = mergeDetections(base, [box('FIRMA', 550, 420, 100, 50, 0.95)]);
  assert.equal(merged.length, 1);
});

test('juntar detecciones añade la misma clase si está en otro sitio', () => {
  const base = [box('NUM_DNI', 100, 500, 200, 40)];
  const merged = mergeDetections(base, [box('NUM_DNI', 700, 100, 200, 40, 0.8)]);
  assert.equal(merged.length, 2);
});

test('juntar detecciones no cambia el documento por lo que vea la copia', () => {
  const base = [box('DOC_DNI', 0, 0, 1000, 600, 1)];
  const merged = mergeDetections(base, [box('DOC_DNI_REV', 0, 0, 1000, 600, 0.8)]);
  assert.deepEqual(merged.map((b) => b.label), ['DOC_DNI']);
});

test('juntar detecciones prefiere la caja de la copia con más confianza si hay dos del mismo campo', () => {
  const extra = [box('CAN', 800, 520, 120, 30, 0.6), box('CAN', 805, 522, 120, 30, 0.8)];
  const merged = mergeDetections([], extra);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].confidence, 0.8);
});
