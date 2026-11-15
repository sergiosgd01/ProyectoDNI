// Pruebas de los cálculos de la captura automática. No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FINAL_MIN_DETECTIONS,
  HINTS,
  PLACEMENT,
  QUALITY,
  captureArea,
  checkFinalPhoto,
  evaluatePlacement,
  expandRect,
  imageQualityHint,
  measureFrame,
  median,
} from './liveCapture.js';

const caja = (label, x, y, width, height, confidence = 0.9) => ({ label, x, y, width, height, confidence });

// Lo que ve el detector: un lienzo de 640x400 que cubre el recuadro (500x315) y un 25 % de margen
const vista = {
  region: { x: 0, y: 0, width: 640, height: 400 },
  scale: 1,
  canvasWidth: 640,
  canvasHeight: 400,
  guide: { x: 70, y: 42.5, width: 500, height: 315 },
};

// Campos del anverso repartidos por un DNI de `ancho` píxeles centrado en el lienzo
const anverso = (ancho, campos = 12, dx = 0) => {
  const alto = ancho / 1.586;
  const izquierda = 320 - ancho / 2 + dx;
  const arriba = 200 - alto / 2;
  const etiquetas = ['FOTOGRAFIA', 'APELLIDOS', 'NOMBRE', 'FIRMA', 'CAN', 'VALIDEZ', 'NUM_DNI', 'SEXO',
    'NACIONALIDAD', 'NACIMIENTO', 'EMISIÓN', 'SOPORTE', 'ES', 'ESP'];
  const cajas = [caja('DOC_DNI', izquierda - 20, arriba - 15, ancho + 40, alto + 30)];
  // Los campos ocupan el 88 % del ancho del DNI, de borde a borde
  const util = ancho * 0.88;
  for (let i = 0; i < campos; i++) {
    const x = izquierda + ancho * 0.06 + (util - 40) * (i / (campos - 1));
    cajas.push(caja(etiquetas[i % etiquetas.length], x, arriba + alto * (0.2 + 0.6 * ((i * 7) % 10) / 10), 40, 14));
  }
  return cajas;
};

test('mediana', () => {
  assert.equal(median([]), 0);
  assert.equal(median([5]), 5);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test('un DNI centrado y de buen tamaño se da por bueno', () => {
  const r = evaluatePlacement(anverso(430), vista, 'anverso');
  assert.equal(r.found, true);
  assert.equal(r.ok, true);
  assert.equal(r.side, 'anverso');
  // El tamaño sale de los campos y se acerca al real (430 de 500)
  assert.ok(Math.abs(r.coverage - 0.86) < 0.05, `tamaño ${r.coverage}`);
  assert.ok(Math.abs(r.offsetX) < 0.03);
});

test('la cara equivocada pide dar la vuelta', () => {
  const r = evaluatePlacement(anverso(430), vista, 'reverso');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'side');
  assert.equal(r.hint, HINTS.flipToBack);
});

test('lejos, cerca y descentrado dan su aviso', () => {
  assert.equal(evaluatePlacement(anverso(250), vista, 'anverso').hint, HINTS.closer);
  const descentrado = evaluatePlacement(anverso(400, 12, 115), vista, 'anverso');
  assert.equal(descentrado.reason, 'center');
  assert.equal(descentrado.hint, HINTS.center);
});

test('con pocos campos no se da por bueno', () => {
  const r = evaluatePlacement(anverso(430, PLACEMENT.minDetections.anverso - 3), vista, 'anverso');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'fields');
});

test('sin caja del documento la cara sale de los campos', () => {
  const sinDocumento = anverso(430).filter((c) => c.label !== 'DOC_DNI');
  const r = evaluatePlacement(sinDocumento, vista, 'anverso');
  assert.equal(r.found, true);
  assert.equal(r.side, 'anverso');
});

test('sin nada reconocible no hay DNI', () => {
  assert.equal(evaluatePlacement([], vista, 'anverso').found, false);
  assert.equal(evaluatePlacement([caja('NOMBRE', 10, 10, 40, 14)], vista, 'anverso').found, false);
});

test('la zona que se sube incluye el DNI aunque se salga del recuadro', () => {
  const guia = { x: 110, y: 480, width: 500, height: 315 };
  // DNI un 25 % más ancho que el recuadro y centrado en él
  const dni = { x: 47.5, y: 440.6, width: 625, height: 394 };
  const soloRecuadro = captureArea(guia, null, 720, 1280);
  assert.ok(soloRecuadro.x > dni.x, 'sin saber dónde está el DNI, el recorte del recuadro lo corta');
  const zona = captureArea(guia, dni, 720, 1280);
  assert.ok(zona.x <= dni.x && zona.y <= dni.y);
  assert.ok(zona.x + zona.width >= dni.x + dni.width);
  assert.ok(zona.y + zona.height >= dni.y + dni.height);
  // Nunca se sale del vídeo
  assert.ok(zona.x >= 0 && zona.x + zona.width <= 720);
});

test('la zona que se sube es la del recuadro si el DNI está dentro', () => {
  const guia = { x: 110, y: 480, width: 500, height: 315 };
  const dni = { x: 150, y: 505, width: 420, height: 265 };
  assert.deepEqual(captureArea(guia, dni, 720, 1280), expandRect(guia, 0.1, 720, 1280));
});

test('la foto final vale con las detecciones que pide el editor', () => {
  const buena = [caja('DOC_DNI', 0, 0, 100, 60), ...Array.from({ length: FINAL_MIN_DETECTIONS.anverso - 1 },
    (_, i) => caja('NOMBRE', i, 0, 5, 5))];
  assert.equal(checkFinalPhoto(buena, 'anverso').ok, true);

  const borrosa = buena.slice(0, 6);
  const r = checkFinalPhoto(borrosa, 'anverso');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'fields');
  assert.equal(r.detections, 6);
});

test('la foto final de la otra cara o sin DNI se rechaza con su motivo', () => {
  const reverso = [caja('DOC_DNI_REV', 0, 0, 100, 60), ...Array.from({ length: 6 }, (_, i) => caja('MRZ', i, 0, 5, 5))];
  assert.equal(checkFinalPhoto(reverso, 'reverso').ok, true);
  const otraCara = checkFinalPhoto(reverso, 'anverso');
  assert.equal(otraCara.reason, 'side');
  assert.equal(otraCara.hint, HINTS.flipToFront);
  assert.equal(checkFinalPhoto([caja('NOMBRE', 0, 0, 5, 5)], 'anverso').reason, 'document');
  // Sin cara pedida vale la que se vea
  assert.equal(checkFinalPhoto(reverso, null).ok, true);
  assert.equal(checkFinalPhoto([], null).reason, 'document');
});

test('la calidad de la imagen avisa de poca luz, reflejos y desenfoque', () => {
  const bien = { brightness: 150, glare: 0.01 };
  assert.equal(imageQualityHint(bien, 300, 320), null);
  assert.equal(imageQualityHint({ ...bien, brightness: QUALITY.minBrightness - 1 }, 300, 320), HINTS.dark);
  assert.equal(imageQualityHint({ ...bien, glare: QUALITY.maxGlare + 0.01 }, 300, 320), HINTS.glare);
  assert.equal(imageQualityHint(bien, QUALITY.minSharpness - 1, 100), HINTS.blurry);
  // Lejos de la mejor nitidez reciente: el enfoque aún no se ha asentado
  assert.equal(imageQualityHint(bien, 200, 400), HINTS.blurry);
});

// Imagen gris con un cuadrado más claro, para medir movimiento y cambios de luz
const imagen = (ancho, alto, cuadradoX, luz = 0) => {
  const data = new Uint8ClampedArray(ancho * alto * 4);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const dentro = x >= cuadradoX && x < cuadradoX + 40 && y >= 20 && y < 60;
      const valor = (dentro ? 200 : 80) + luz;
      data.set([valor, valor, valor, 255], (y * ancho + x) * 4);
    }
  }
  return { data, width: ancho, height: alto };
};

test('el movimiento se nota y un cambio de luz de todo el fotograma no cuenta', () => {
  const primero = measureFrame(imagen(200, 120, 60));
  assert.equal(primero.motion, null);
  const quieto = measureFrame(imagen(200, 120, 60), primero.small);
  assert.equal(quieto.motion, 0);
  const movido = measureFrame(imagen(200, 120, 100), primero.small);
  assert.ok(movido.motion > QUALITY.maxMotion, `movimiento ${movido.motion}`);
  const masLuz = measureFrame(imagen(200, 120, 60, 25), primero.small);
  assert.ok(masLuz.motion < 1, `con más luz ${masLuz.motion}`);
  assert.ok(Math.abs(masLuz.brightness - primero.brightness - 25) < 1);
});
