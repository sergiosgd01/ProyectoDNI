// Pruebas de las cuentas de la copia protegida. No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { A4, describirCopia, disponerEnA4, motivoErrorCompartir, puedeCompartirPdf } from './copiaProtegida.js';

// Tamaño de un DNI recortado por el servidor (85,6 x 54 mm a unos 12 píxeles por milímetro)
const DNI = { ancho: 1000, alto: 631 };

test('las dos caras de un DNI caben en una hoja, una debajo de otra', () => {
  const { paginas, caras } = disponerEnA4([DNI, DNI]);
  assert.equal(paginas, 1);
  assert.equal(caras[0].x, 10);
  assert.equal(caras[0].y, 10);
  assert.equal(caras[0].ancho, 190);
  assert.ok(Math.abs(caras[0].alto - 119.89) < 0.01);
  // La trasera empieza 10 mm por debajo de la delantera
  assert.ok(Math.abs(caras[1].y - (10 + caras[0].alto + 10)) < 1e-9);
  assert.equal(caras[1].pagina, 1);
});

test('si la trasera no cabe debajo, pasa a otra hoja arriba del todo', () => {
  // Dos fotos en vertical, como un DNI girado: cada una ocupa más de media hoja
  const vertical = { ancho: 631, alto: 1000 };
  const { paginas, caras } = disponerEnA4([vertical, vertical]);
  assert.equal(paginas, 2);
  assert.equal(caras[1].pagina, 2);
  assert.equal(caras[1].y, A4.margen);
});

test('con una sola cara sale una hoja', () => {
  const { paginas, caras } = disponerEnA4([DNI]);
  assert.equal(paginas, 1);
  assert.equal(caras.length, 1);
});

test('la frase dice qué caras van, en cuántas hojas y con qué marca de agua', () => {
  assert.equal(describirCopia({ hayTrasera: true, marca: 'Uso exclusivo para Viajes' }),
    'Las dos caras en una hoja, con la marca de agua «Uso exclusivo para Viajes».');
  assert.equal(describirCopia({ hayTrasera: false, marca: 'Alquiler' }),
    'La parte delantera en una hoja, con la marca de agua «Alquiler».');
  assert.equal(describirCopia({ hayTrasera: true, paginas: 2, marca: 'Alquiler' }),
    'Las dos caras en dos hojas, con la marca de agua «Alquiler».');
  assert.equal(describirCopia({ hayTrasera: true, marca: '   ' }), 'Las dos caras en una hoja, sin marca de agua.');
});

test('se ofrece «Compartir» solo si el navegador dice que puede compartir el PDF', () => {
  const compartir = () => {};
  assert.equal(puedeCompartirPdf(undefined), false);
  assert.equal(puedeCompartirPdf({}), false);
  // Con share pero sin canShare no se sabe si acepta archivos
  assert.equal(puedeCompartirPdf({ share: compartir }), false);
  assert.equal(puedeCompartirPdf({ canShare: () => true }), false);
  assert.equal(puedeCompartirPdf({ share: compartir, canShare: () => false }), false);
  assert.equal(puedeCompartirPdf({ share: compartir, canShare: () => { throw new TypeError('sin archivos'); } }), false);
  let preguntado;
  const nav = { share: compartir, canShare: (datos) => { preguntado = datos.files[0]; return true; } };
  assert.equal(puedeCompartirPdf(nav), true);
  assert.equal(preguntado.type, 'application/pdf');
  assert.equal(preguntado.name, 'dni-protegido.pdf');
});

test('al fallar el menú de compartir se distingue cancelar, pulsar otra vez y el resto', () => {
  assert.equal(motivoErrorCompartir(new DOMException('cerrado', 'AbortError')), 'cancelado');
  assert.equal(motivoErrorCompartir(new DOMException('sin gesto', 'NotAllowedError')), 'repetir');
  assert.equal(motivoErrorCompartir(new TypeError('tipo no admitido')), 'fallo');
  assert.equal(motivoErrorCompartir(undefined), 'fallo');
});
