// Pruebas del enderezado del recorte manual (UX-2). No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cajaDeLasEsquinas, enderezar, invertir3x3, transformacionPerspectiva } from './enderezarRecorte.js';

// Foto de prueba con ruido, siempre la misma
function fotoDePrueba(ancho, alto) {
  let semilla = 12345;
  const azar = () => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
  };
  const data = new Uint8ClampedArray(ancho * alto * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(azar() * 256);
    data[i + 1] = Math.floor(azar() * 256);
    data[i + 2] = Math.floor(azar() * 256);
    data[i + 3] = 255;
  }
  return { data, width: ancho, height: alto };
}

// El recorte de antes de UX-2, copiado tal cual de ManualCropModal.jsx: invierte la matriz y crea objetos en cada píxel
function recorteDeAntes(foto, puntos, ancho, alto) {
  const matriz = transformacionPerspectiva(puntos, [{ x: 0, y: 0 }, { x: ancho, y: 0 }, { x: ancho, y: alto }, { x: 0, y: alto }]);
  const aplicar = (punto, m) => {
    const inv = invertir3x3(m);
    const w = inv[2][0] * punto.x + inv[2][1] * punto.y + inv[2][2];
    return {
      x: (inv[0][0] * punto.x + inv[0][1] * punto.y + inv[0][2]) / w,
      y: (inv[1][0] * punto.x + inv[1][1] * punto.y + inv[1][2]) / w
    };
  };
  const bilineal = (imageData, x, y) => {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.min(x1 + 1, imageData.width - 1);
    const y2 = Math.min(y1 + 1, imageData.height - 1);
    const dx = x - x1;
    const dy = y - y1;
    const pixel = (px, py) => {
      const idx = (py * imageData.width + px) * 4;
      return { r: imageData.data[idx], g: imageData.data[idx + 1], b: imageData.data[idx + 2] };
    };
    const c1 = pixel(x1, y1);
    const c2 = pixel(x2, y1);
    const c3 = pixel(x1, y2);
    const c4 = pixel(x2, y2);
    const canal = (k) => Math.round(c1[k] * (1 - dx) * (1 - dy) + c2[k] * dx * (1 - dy) + c3[k] * (1 - dx) * dy + c4[k] * dx * dy);
    return { r: canal('r'), g: canal('g'), b: canal('b') };
  };
  const salida = new Uint8ClampedArray(ancho * alto * 4);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const p = aplicar({ x, y }, matriz);
      if (p.x >= 0 && p.x < foto.width && p.y >= 0 && p.y < foto.height) {
        const color = bilineal(foto, p.x, p.y);
        const i = (y * ancho + x) * 4;
        salida[i] = color.r;
        salida[i + 1] = color.g;
        salida[i + 2] = color.b;
        salida[i + 3] = 255;
      }
    }
  }
  return salida;
}

// El recorte de ahora, leyendo solo la parte de la foto que cubren las esquinas, como hace ManualCropModal.jsx
function recorteDeAhora(foto, puntos, ancho, alto) {
  const { x0, y0, x1, y1 } = cajaDeLasEsquinas(puntos, foto.width, foto.height);
  const anchoTrozo = x1 - x0 + 1;
  const data = new Uint8ClampedArray(anchoTrozo * (y1 - y0 + 1) * 4);
  for (let y = y0; y <= y1; y++) {
    data.set(foto.data.subarray((y * foto.width + x0) * 4, (y * foto.width + x1 + 1) * 4), (y - y0) * anchoTrozo * 4);
  }
  const matriz = transformacionPerspectiva(puntos, [{ x: 0, y: 0 }, { x: ancho, y: 0 }, { x: ancho, y: alto }, { x: 0, y: alto }]);
  const salida = new Uint8ClampedArray(ancho * alto * 4);
  enderezar({ data, width: anchoTrozo, x0, y0 }, invertir3x3(matriz), salida, ancho, alto, foto.width, foto.height);
  return salida;
}

// Tamaño del resultado, como lo calcula ManualCropModal.jsx
const tamano = (p) => {
  const d = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  return [Math.round(Math.max(d(p[0], p[1]), d(p[3], p[2]))), Math.round(Math.max(d(p[0], p[3]), d(p[1], p[2])))];
};

test('el recorte manual da la misma imagen que antes de UX-2, byte a byte', () => {
  const foto = fotoDePrueba(320, 240);
  const casos = [
    [{ x: 40.5, y: 30.25 }, { x: 280.75, y: 50.5 }, { x: 260.2, y: 210.9 }, { x: 30.1, y: 190.4 }],
    [{ x: 0, y: 0 }, { x: 319.9, y: 0 }, { x: 319.9, y: 239.9 }, { x: 0, y: 239.9 }],
    [{ x: 100.3, y: 20.7 }, { x: 300.1, y: 90.2 }, { x: 220.6, y: 230.8 }, { x: 15.4, y: 150.5 }]
  ];
  for (const puntos of casos) {
    const [ancho, alto] = tamano(puntos);
    assert.deepEqual(recorteDeAhora(foto, puntos, ancho, alto), recorteDeAntes(foto, puntos, ancho, alto));
  }
});

test('lo que cae fuera de la foto se queda transparente, como antes', () => {
  const foto = fotoDePrueba(200, 150);
  const puntos = [{ x: -20, y: -10 }, { x: 180, y: 5 }, { x: 190, y: 160 }, { x: -5, y: 140 }];
  const [ancho, alto] = tamano(puntos);
  const ahora = recorteDeAhora(foto, puntos, ancho, alto);
  assert.deepEqual(ahora, recorteDeAntes(foto, puntos, ancho, alto));
  assert.equal(ahora[3], 0);
});

test('la parte que se lee de la foto es la de las esquinas con 2 píxeles de margen, sin salirse', () => {
  const caja = cajaDeLasEsquinas([{ x: 10.5, y: 20.2 }, { x: 90.1, y: 18 }, { x: 95.7, y: 70.3 }, { x: 8, y: 75 }], 100, 76);
  assert.deepEqual(caja, { x0: 6, y0: 16, x1: 98, y1: 75 });
});
