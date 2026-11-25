/**
 * Endereza el DNI en el recorte manual (ManualCropModal.jsx). Lleva el cuadrilátero de las cuatro esquinas a un
 * rectángulo con una homografía, píxel a píxel y con interpolación bilineal.
 *
 * Hasta el 25/11/2026 esto iba dentro del componente, que invertía la matriz y creaba objetos en cada píxel. En un móvil
 * medio la página se quedaba parada hasta 2 s al pulsar «Recortar» con el DNI llenando la foto (UX-2). Ahora la matriz
 * se invierte una vez, se trabaja sobre los arrays de píxeles y solo se lee de la foto la parte que cubren las esquinas.
 * Las cuentas son las mismas y en el mismo orden, así que la imagen sale igual, byte a byte (ver enderezarRecorte.test.js).
 */

// Eliminación de Gauss con pivote parcial, para resolver el sistema de la homografía
function eliminacionGauss(A, b) {
  const n = b.length;
  const Ab = A.map((fila, i) => [...fila, b[i]]);
  for (let i = 0; i < n; i++) {
    let maxFila = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(Ab[k][i]) > Math.abs(Ab[maxFila][i])) maxFila = k;
    }
    [Ab[i], Ab[maxFila]] = [Ab[maxFila], Ab[i]];
    for (let k = i + 1; k < n; k++) {
      const factor = Ab[k][i] / Ab[i][i];
      for (let j = i; j < n + 1; j++) Ab[k][j] -= factor * Ab[i][j];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = Ab[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= Ab[i][j] * x[j];
    x[i] /= Ab[i][i];
  }
  return x;
}

/**
 * Homografía que lleva los cuatro puntos src a los cuatro dst.
 * @param {Array<{x: number, y: number}>} src
 * @param {Array<{x: number, y: number}>} dst
 * @returns {number[][]} Matriz 3x3
 */
export function transformacionPerspectiva(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dx);
    b.push(dy);
  }
  const h = eliminacionGauss(A, b);
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1]
  ];
}

/**
 * Inversa de una matriz 3x3. Lanza un error si es singular.
 * @param {number[][]} m
 * @returns {number[][]}
 */
export function invertir3x3(m) {
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  if (Math.abs(det) < 1e-10) {
    throw new Error('Matriz singular, no se puede invertir');
  }
  return [
    [
      (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det,
      (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det,
      (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det
    ],
    [
      (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det,
      (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det,
      (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det
    ],
    [
      (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det,
      (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det,
      (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det
    ]
  ];
}

/**
 * Parte de la foto que hay que leer para enderezar, en píxeles enteros e incluidos los bordes. Es la caja de las cuatro
 * esquinas con 2 píxeles de margen, porque la interpolación coge también el píxel siguiente, sin salirse de la foto.
 * @param {Array<{x: number, y: number}>} puntos
 * @param {number} anchoFoto
 * @param {number} altoFoto
 * @returns {{x0: number, y0: number, x1: number, y1: number}}
 */
export function cajaDeLasEsquinas(puntos, anchoFoto, altoFoto) {
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  return {
    x0: Math.max(0, Math.floor(Math.min(...xs)) - 2),
    y0: Math.max(0, Math.floor(Math.min(...ys)) - 2),
    x1: Math.min(anchoFoto - 1, Math.ceil(Math.max(...xs)) + 2),
    y1: Math.min(altoFoto - 1, Math.ceil(Math.max(...ys)) + 2)
  };
}

/**
 * Rellena el resultado enderezado. Cada píxel del resultado se lleva a la foto con la inversa de la homografía y se
 * interpola entre sus cuatro vecinos. Los que caen fuera de la foto se quedan sin tocar (transparentes).
 * @param {{data: Uint8ClampedArray, width: number, x0: number, y0: number}} trozo - Píxeles RGBA de la parte de la foto
 *   que se lee (cajaDeLasEsquinas), con su esquina en (x0, y0) de la foto
 * @param {number[][]} inversa - Inversa de la homografía de la foto al resultado
 * @param {Uint8ClampedArray} destino - Píxeles RGBA del resultado, de ancho x alto
 * @param {number} ancho
 * @param {number} alto
 * @param {number} anchoFoto - Ancho de la foto entera
 * @param {number} altoFoto - Alto de la foto entera
 */
export function enderezar(trozo, inversa, destino, ancho, alto, anchoFoto, altoFoto) {
  const [[a, b, c], [d, e, f], [g, h, i]] = inversa;
  const datos = trozo.data;
  const anchoTrozo = trozo.width;
  const { x0, y0 } = trozo;
  // Índice del píxel (px, py) de la foto en el trozo
  const indice = (px, py) => ((py - y0) * anchoTrozo + (px - x0)) * 4;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const w = g * x + h * y + i;
      const sx = (a * x + b * y + c) / w;
      const sy = (d * x + e * y + f) / w;
      if (!(sx >= 0 && sx < anchoFoto && sy >= 0 && sy < altoFoto)) continue;
      const x1 = Math.floor(sx);
      const y1 = Math.floor(sy);
      const x2 = Math.min(x1 + 1, anchoFoto - 1);
      const y2 = Math.min(y1 + 1, altoFoto - 1);
      const dx = sx - x1;
      const dy = sy - y1;
      const i1 = indice(x1, y1);
      const i2 = indice(x2, y1);
      const i3 = indice(x1, y2);
      const i4 = indice(x2, y2);
      const k = (y * ancho + x) * 4;
      for (let canal = 0; canal < 3; canal++) {
        destino[k + canal] = Math.round(
          datos[i1 + canal] * (1 - dx) * (1 - dy) +
          datos[i2 + canal] * dx * (1 - dy) +
          datos[i3 + canal] * (1 - dx) * dy +
          datos[i4 + canal] * dx * dy
        );
      }
      destino[k + 3] = 255;
    }
  }
}
