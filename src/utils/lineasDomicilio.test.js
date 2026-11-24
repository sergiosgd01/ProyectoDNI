// Pruebas del corte del domicilio en líneas y de cómo lo usa el plan de censura. No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bandasDeTexto, finDelTexto, inclinacion, partirBandas, tinta, tirasDeLaCalle,
} from './lineasDomicilio.js';
import { planDeCara } from './planCensura.js';

const ANCHO = 600;
const ANALISIS = 180;

// Imagen en gris del bloque, fondo claro con algo de trama. Cada texto es una fila de letras oscuras (bloques con huecos)
// entre dos columnas, y todo puede ir inclinado (pendiente, en filas por columna, alrededor de la columna 90). Devuelve
// también, para cada píxel de texto, a qué parte pertenece
function bloque(alto, textos, { pendiente = 0, tono = 50, marca = null } = {}) {
  const gris = new Float32Array(ANCHO * alto);
  const parte = new Array(ANCHO * alto).fill(null);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ANCHO; x++) gris[y * ANCHO + x] = 225 - ((x * 7 + y * 13) % 11);
  }
  const pintar = ({ filas: [y0, y1], columnas: [x0, x1], nombre }, valor, paso = 12) => {
    for (let x = x0; x < x1; x++) {
      if (x % paso >= paso * 0.6) continue;
      const desplazamiento = Math.round(pendiente * (x - ANALISIS / 2));
      for (let y = y0 + desplazamiento; y < y1 + desplazamiento; y++) {
        if (y < 0 || y >= alto) continue;
        gris[y * ANCHO + x] = valor;
        if (nombre) parte[y * ANCHO + x] = nombre;
      }
    }
  };
  for (const texto of textos) pintar(texto, tono);
  if (marca) pintar({ filas: marca, columnas: [10, 170] }, 175, 40);
  return { gris, parte };
}

// Lo mismo que lineasDelDomicilio, sin lienzo
function cortar(gris, alto) {
  const izquierda = new Float32Array(ANALISIS * alto);
  for (let y = 0; y < alto; y++) izquierda.set(gris.subarray(y * ANCHO, y * ANCHO + ANALISIS), y * ANALISIS);
  const mascaraIzquierda = tinta(izquierda);
  if (!mascaraIzquierda) return null;
  const pendiente = inclinacion(mascaraIzquierda, ANALISIS, ANALISIS, alto);
  if (pendiente === null) return null;
  const bandas = bandasDeTexto(mascaraIzquierda, ANALISIS, ANALISIS, alto, pendiente);
  const partes = partirBandas(bandas, alto);
  if (!partes) return null;
  const mascara = tinta(gris);
  const fin = finDelTexto(mascara, ANCHO, alto, pendiente, ANALISIS / 2, partes.municipio[0], partes.provincia[1],
    bandas.at(-1).y1 - bandas.at(-1).y0);
  return { pendiente, partes, tiras: tirasDeLaCalle(ANCHO, alto, pendiente, ANALISIS / 2, partes, fin) };
}

// Cuántos píxeles de cada parte quedan dentro de las tiras
function tapados(parte, tiras, alto) {
  const cuenta = {};
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ANCHO; x++) {
      const nombre = parte[y * ANCHO + x];
      if (!nombre) continue;
      cuenta[nombre] ||= { total: 0, tapados: 0 };
      cuenta[nombre].total++;
      if (tiras.some((t) => x >= t.x && x < t.x + t.width && y >= t.y && y < t.y + t.height)) cuenta[nombre].tapados++;
    }
  }
  return cuenta;
}

// Etiqueta «DOMICILIO» pequeña, calle larga y municipio y provincia cortos, de 30 filas cada 45. Como en las fotos reales
// del banco, la etiqueta mide algo más de la mitad que una línea y su centro queda a unos tres cuartos del paso de la
// calle. El DNI tiene sitio para cuatro líneas. TRES es una calle de una línea, con la cuarta en blanco, y CUATRO, una
// calle de dos
const ETIQUETA = { filas: [14, 30], columnas: [10, 110], nombre: 'etiqueta' };
const calle = (y0, nombre = 'calle') => ({ filas: [y0, y0 + 30], columnas: [10, 590], nombre });
const corta = (y0, nombre) => ({ filas: [y0, y0 + 30], columnas: [10, 160], nombre });
const TRES = [ETIQUETA, calle(42), corta(87, 'municipio'), corta(132, 'provincia')];
const CUATRO = [ETIQUETA, calle(42), calle(87, 'calle2'), corta(132, 'municipio'), corta(177, 'provincia')];

for (const pendiente of [0, 0.07, -0.06]) {
  test(`la calle queda tapada entera y el municipio y la provincia a la vista (pendiente ${pendiente})`, () => {
    const alto = 245;
    const { gris, parte } = bloque(alto, CUATRO, { pendiente });
    const corte = cortar(gris, alto);
    assert.ok(corte, 'no se ha partido');
    assert.ok(Math.abs(corte.pendiente - pendiente) <= 0.01, `pendiente ${corte.pendiente}`);
    const cuenta = tapados(parte, corte.tiras, alto);
    assert.equal(cuenta.calle.tapados, cuenta.calle.total);
    assert.equal(cuenta.calle2.tapados, cuenta.calle2.total);
    assert.equal(cuenta.municipio.tapados, 0);
    assert.equal(cuenta.provincia.tapados, 0);
  });
}

test('sin la etiqueta no se parte, porque no se puede comprobar que la primera banda no sea ella', () => {
  assert.equal(cortar(bloque(230, CUATRO.slice(1)).gris, 230), null);
});

test('una etiqueta alargada por una mancha no cuenta como línea (tercera revisión del 23/11/2026)', () => {
  // La mancha alarga la etiqueta hacia arriba hasta casi el alto de una línea. Sin la provincia, borrada por un brillo,
  // las bandas etiqueta, calle, calle2 y municipio parecían las cuatro líneas, y la segunda de la calle quedaba a la vista
  const larga = { ...ETIQUETA, filas: [4, 30] };
  assert.equal(cortar(bloque(245, [larga, ...CUATRO.slice(1, -1)]).gris, 245), null);
  // Con la provincia tampoco se parte, porque la primera banda ya no parece la etiqueta
  assert.equal(cortar(bloque(245, [larga, ...CUATRO.slice(1)]).gris, 245), null);
});

test('la marca de agua gris de debajo no cuenta como línea', () => {
  const alto = 275;
  const { gris, parte } = bloque(alto, CUATRO, { marca: [215, 275] });
  const corte = cortar(gris, alto);
  assert.ok(corte);
  const cuenta = tapados(parte, corte.tiras, alto);
  assert.equal(cuenta.calle.tapados, cuenta.calle.total);
  assert.equal(cuenta.municipio.tapados, 0);
});

test('con tres líneas no se parte, porque la cuarta puede estar borrada por un reflejo (revisión del 23/11/2026)', () => {
  // Una calle de una línea, con la cuarta en blanco
  assert.equal(cortar(bloque(200, TRES).gris, 200), null);
  // Una calle de dos líneas sin la provincia. Partir dejaba a la vista la segunda línea de la calle
  assert.equal(cortar(bloque(245, CUATRO.slice(0, -1)).gris, 245), null);
  // La etiqueta como en los recortes del banco, de 18 filas a 14 de la calle, sin la provincia. Partir dejaba toda la
  // calle a la vista
  const etiqueta = { filas: [10, 28], columnas: [10, 110] };
  assert.equal(cortar(bloque(180, [etiqueta, calle(42), corta(87, 'municipio')]).gris, 180), null);
});

test('sin las cuatro líneas claras no se parte nada', () => {
  // Municipio y provincia pegados en una sola banda
  assert.equal(cortar(bloque(245, [ETIQUETA, calle(42), calle(87), { filas: [132, 207], columnas: [10, 160] }]).gris, 245), null);
  // Falta una línea en medio: el paso no cuadra
  assert.equal(cortar(bloque(290, [ETIQUETA, calle(42), calle(87), corta(177, 'm'), corta(222, 'p')]).gris, 290), null);
  // Una línea de más
  assert.equal(cortar(bloque(290, [...CUATRO, corta(222, 'otra')]).gris, 290), null);
  // Sin contraste
  assert.equal(cortar(bloque(245, CUATRO, { tono: 215 }).gris, 245), null);
  // Muy girado, más de 7°. Con 0,14 la mejor inclinación es la del tope, que no vale porque el giro puede ser mayor
  assert.equal(cortar(bloque(300, CUATRO, { pendiente: 0.25 }).gris, 300), null);
  assert.equal(cortar(bloque(280, CUATRO, { pendiente: 0.14 }).gris, 280), null);
});

// Plan de censura del reverso con el domicilio partido y con márgenes

const TAMANO = { ancho: 2000, alto: 1270 };
const caja = (label, x0, y0, x1, y1) => ({ label, confidence: 0.9, x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
const REVERSO = [
  caja('DOC_DNI_REV', 0, 0, 2000, 1270), caja('DOMICILIO', 520, 75, 1990, 318), caja('EQUIPO', 52, 360, 158, 697),
  caja('LUGAR_NACIMIENTO', 536, 420, 1468, 593), caja('HIJO_DE', 552, 641, 1428, 757), caja('MRZ', 50, 832, 1950, 1173),
  caja('SOPORTE_MIN', 234, 196, 458, 273),
];
const LINEAS_DOMICILIO = {
  calle: [{ x: 520, y: 60, width: 200, height: 140 }, { x: 720, y: 60, width: 1270, height: 290 }],
};
const VIAJES = { anverso: { numeroSoporte: true }, reverso: { domicilio: true, municipio: false, provincia: false } };

test('con Viajes se tapa solo la calle y se ven el municipio y la provincia (CEN-2)', () => {
  const p = planDeCara({ cara: 'reverso', campos: VIAJES, detecciones: REVERSO, tamano: TAMANO,
    lineasDomicilio: LINEAS_DOMICILIO });
  assert.equal(p.modo, 'auto');
  const tiras = p.cajas.filter((c) => c.clase === 'DOM_CALLE');
  assert.equal(tiras.length, 2);
  // Con margen arriba y por los lados de fuera, más a la derecha, pero sin bajar al municipio
  assert.equal(tiras[0].y + tiras[0].height, 200);
  assert.equal(tiras[0].x, 520 - 20);
  assert.equal(tiras[0].x + tiras[0].width, 720);
  assert.equal(tiras[1].x, 720);
  assert.equal(tiras[1].x + tiras[1].width, 2000);
  assert.ok(tiras.every((tira) => tira.y === 60 - 12.7));
  assert.ok(!p.cajas.some((c) => c.clase === 'DOMICILIO'));
});

test('si las líneas no se han separado o se tapa el municipio, se tapa el bloque entero', () => {
  const sinLineas = planDeCara({ cara: 'reverso', campos: VIAJES, detecciones: REVERSO, tamano: TAMANO });
  const bloqueEntero = sinLineas.cajas.filter((c) => c.clase === 'DOMICILIO');
  assert.equal(bloqueEntero.length, 1);
  assert.ok(bloqueEntero[0].y <= 75 && bloqueEntero[0].y + bloqueEntero[0].height >= 318);
  const conMunicipio = planDeCara({ cara: 'reverso', campos: { anverso: {}, reverso: { domicilio: true, municipio: true } },
    detecciones: REVERSO, tamano: TAMANO, lineasDomicilio: LINEAS_DOMICILIO });
  assert.deepEqual(conMunicipio.cajas.map((c) => c.clase), ['DOMICILIO']);
  // Domicilio, municipio y provincia sin encontrar el bloque se piden a mano
  const sinBloque = planDeCara({ cara: 'reverso', campos: { anverso: {}, reverso: { domicilio: true, provincia: true } },
    detecciones: [...REVERSO.filter((d) => d.label !== 'DOMICILIO'), caja('MRZ', 50, 832, 1950, 1173)], tamano: TAMANO });
  assert.equal(sinBloque.modo, 'parcial');
  assert.deepEqual(sinBloque.faltan, [{ campo: 'domicilio' }, { campo: 'provincia' }]);
});

test('las cajas se tapan con margen, más a la derecha en los textos largos, sin pisar lo que se ve (CEN-3)', () => {
  const campos = { anverso: {}, reverso: { progenitores: true, equipoExpedidor: true } };
  const p = planDeCara({ cara: 'reverso', campos, detecciones: REVERSO, tamano: TAMANO });
  const hijo = p.cajas.find((c) => c.clase === 'HIJO_DE');
  assert.equal(hijo.x, 552 - 20);
  assert.equal(hijo.x + hijo.width, 1428 + 80);
  // Por abajo llegaría a 757 + 12,7, pero la MRZ, que se ve, no la deja pasar de su borde
  const equipo = p.cajas.find((c) => c.clase === 'EQUIPO');
  assert.deepEqual([equipo.x, equipo.x + equipo.width], [52 - 20, 158 + 20]);
  // Sin tamaño de la foto, las cajas van justas como antes
  const justas = planDeCara({ cara: 'reverso', campos, detecciones: REVERSO });
  assert.deepEqual(justas.cajas.find((c) => c.clase === 'HIJO_DE'), { x: 552, y: 641, width: 876, height: 116,
    clase: 'HIJO_DE' });
  // Un margen que pisaría una caja a la vista se queda en su borde
  const pegada = [...REVERSO, caja('NOMBRE', 1436, 650, 1700, 750)];
  const conVecina = planDeCara({ cara: 'reverso', campos, detecciones: pegada, tamano: TAMANO });
  const recortada = conVecina.cajas.find((c) => c.clase === 'HIJO_DE');
  assert.equal(recortada.x + recortada.width, 1436);
});
