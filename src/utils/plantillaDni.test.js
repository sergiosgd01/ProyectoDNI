// Pruebas de la plantilla del DNI y del plan de censura. No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANCLAS, ZONAS, ajustarPlantilla, homografia, margenDeZona, zonaEnFoto } from './plantillaDni.js';
import { copiasDeLoMarcado, planDeCara, recortarContraVisibles } from './planCensura.js';
import { modoDeCensura } from './camposSinDetectar.js';

// Cajas de las clases que no sirven de ancla, de 0 a 1 en el carné (medianas del estudio)
const OTRAS = {
  anverso: {
    DOC_DNI: [0, 0, 1, 1], NOMBRE: [0.383, 0.427, 0.640, 0.491], APELLIDOS: [0.387, 0.282, 0.649, 0.410],
    FIRMA: [0.377, 0.769, 0.729, 0.932], FOTOGRAFIA: [0.012, 0.253, 0.375, 0.979],
    NUM_DNI: [0.436, 0.165, 0.737, 0.264], NUM_DNI_MIN: [0.023, 0.190, 0.147, 0.234],
    SOPORTE_MIN: [0.775, 0.171, 0.881, 0.214],
  },
  reverso: { DOC_DNI_REV: [0, 0, 1, 1] },
};

const ANCHO = 2000;
const ALTO = 1270;

// Una foto del carné algo girada y desplazada, como un recorte real: lleva un punto del carné a la foto
function camara(grados = 2, dx = 15, dy = -10) {
  const r = (grados * Math.PI) / 180;
  return (u, v) => {
    const x = (u - 0.5) * ANCHO;
    const y = (v - 0.5) * ALTO;
    return [ANCHO / 2 + x * Math.cos(r) - y * Math.sin(r) + dx, ALTO / 2 + x * Math.sin(r) + y * Math.cos(r) + dy];
  };
}

// Caja detectada para una zona del carné, como la daría el modelo en esa foto
function caja(label, [u0, v0, u1, v1], foto) {
  const p = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => foto(u, v));
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { label, confidence: 0.9, x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

// Todas las detecciones de una cara, menos las clases que se quiten
function detecciones(cara, { sin = [], foto = camara() } = {}) {
  const todas = { ...Object.fromEntries(Object.entries(ANCLAS[cara]).map(([c, a]) => [c, a.caja])), ...OTRAS[cara] };
  return Object.entries(todas).filter(([c]) => !sin.includes(c)).map(([c, z]) => caja(c, z, foto));
}

const TAMANO = { ancho: ANCHO, alto: ALTO };
const dentro = (interior, exterior) => interior.x >= exterior.x - 0.5 && interior.y >= exterior.y - 0.5
  && interior.x + interior.width <= exterior.x + exterior.width + 0.5
  && interior.y + interior.height <= exterior.y + exterior.height + 0.5;

test('la homografía de cuatro esquinas lleva el carné a la foto', () => {
  const foto = camara(3);
  const pares = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.3]].map(([u, v]) => ({ carne: [u, v], foto: foto(u, v) }));
  const H = homografia(pares);
  const [u, v] = [0.37, 0.81];
  const w = H[2][0] * u + H[2][1] * v + H[2][2];
  const x = (H[0][0] * u + H[0][1] * v + H[0][2]) / w;
  const y = (H[1][0] * u + H[1][1] * v + H[1][2]) / w;
  assert.ok(Math.hypot(x - foto(u, v)[0], y - foto(u, v)[1]) < 1e-6);
});

test('la plantilla se coloca en las dos caras y lleva cada zona a su sitio de la foto', () => {
  // Sin giro, para que las cajas del modelo, que van siempre derechas, sean justo las de la plantilla
  const foto = camara(0, 30, -20);
  for (const cara of ['anverso', 'reverso']) {
    const ajuste = ajustarPlantilla(detecciones(cara, { foto }), cara, TAMANO);
    assert.equal(ajuste.fiable, true, ajuste.motivo);
    assert.ok(ajuste.residuo < 0.001);
    for (const zona of Object.values(ZONAS[cara])) {
      const esperada = caja('x', zona, foto);
      const colocada = zonaEnFoto(ajuste, zona);
      assert.ok(Math.abs(colocada.x - Math.max(0, esperada.x)) < 1, `${zona}`);
      assert.ok(Math.abs(colocada.y - Math.max(0, esperada.y)) < 1, `${zona}`);
    }
  }
});

test('sin la ventana del soporte del reverso la plantilla sabe dónde está', () => {
  const foto = camara(-1.5);
  const ajuste = ajustarPlantilla(detecciones('reverso', { sin: ['SOPORTE_MIN'], foto }), 'reverso', TAMANO);
  assert.equal(ajuste.fiable, true, ajuste.motivo);
  const ventana = caja('SOPORTE_MIN', ANCLAS.reverso.SOPORTE_MIN.caja, foto);
  assert.ok(dentro(ventana, zonaEnFoto(ajuste, ZONAS.reverso.SOPORTE_MIN)));
});

test('con pocas clases o con el DNI boca abajo la plantilla no se usa', () => {
  const pocas = detecciones('anverso').filter((d) => ['DOC_DNI', 'CAN', 'CLI', 'SEXO'].includes(d.label));
  assert.equal(ajustarPlantilla(pocas, 'anverso', TAMANO).fiable, false);
  // Boca abajo, el carné girado 180°. Las cajas encajan entre sí pero la plantilla queda del revés
  const bocaAbajo = ajustarPlantilla(detecciones('anverso', { foto: camara(180) }), 'anverso', TAMANO);
  assert.equal(bocaAbajo.fiable, false);
  assert.equal(ajustarPlantilla(detecciones('anverso'), 'anverso', null).fiable, false);
});

test('una caja muy mal puesta no estropea la plantilla y queda fuera de sitio', () => {
  const foto = camara(1);
  const det = detecciones('reverso', { foto });
  // Como en una foto real del S24, el lugar de nacimiento empieza muy a la derecha de donde va
  const lugar = det.find((d) => d.label === 'LUGAR_NACIMIENTO');
  lugar.x += 0.13 * ANCHO;
  lugar.width -= 0.13 * ANCHO;
  const ajuste = ajustarPlantilla(det, 'reverso', TAMANO);
  assert.equal(ajuste.fiable, true, ajuste.motivo);
  assert.equal(ajuste.enSuSitio(lugar), false);
  assert.equal(ajuste.enSuSitio(det.find((d) => d.label === 'MRZ')), true);
  // La MRZ no se comprueba aunque su esquina se mueva mucho, como con el dedo de E04
  const mrz = det.find((d) => d.label === 'MRZ');
  assert.equal(ajuste.enSuSitio({ ...mrz, x: mrz.x + 0.07 * ANCHO, width: mrz.width - 0.07 * ANCHO }), true);
  // El nombre puesto sobre los apellidos también está fuera de sitio
  const anverso = detecciones('anverso', { foto });
  const nombre = anverso.find((d) => d.label === 'NOMBRE');
  nombre.y -= 0.14 * ALTO;
  assert.equal(ajustarPlantilla(anverso, 'anverso', TAMANO).enSuSitio(nombre), false);
});

// Plan de censura

const VIAJES = {
  anverso: { nombre: false, apellidos: false, dni: false, fechaNacimiento: false, sexo: true, nacionalidad: false,
    fechaExpedicion: true, fechaCaducidad: false, numeroSoporte: true, can: true, firma: true, fotografia: false },
  reverso: { mrz: true, domicilio: true, municipio: true, provincia: true, equipoExpedidor: true, progenitores: true },
};
const TODO = {
  anverso: Object.fromEntries(['nombre', 'apellidos', 'dni', 'fechaNacimiento', 'sexo', 'nacionalidad', 'fechaExpedicion',
    'fechaCaducidad', 'numeroSoporte', 'can', 'firma', 'fotografia', 'cli'].map((c) => [c, true])),
  reverso: Object.fromEntries(['mrz', 'domicilio', 'municipio', 'provincia', 'lugarNacimiento', 'equipoExpedidor',
    'progenitores', 'ventanaSoporte'].map((c) => [c, true])),
};

function plan(cara, campos, opciones = {}) {
  const det = detecciones(cara, opciones);
  const ajuste = opciones.sinPlantilla ? null : ajustarPlantilla(det, cara, TAMANO);
  return { ...planDeCara({ cara, campos, detecciones: det, ajuste }), det, ajuste };
}

test('con Viajes y todo encontrado se tapan también el CLI y la ventana, que repiten datos tapados', () => {
  const p = plan('anverso', VIAJES);
  assert.equal(p.modo, 'auto');
  const tapadas = new Set(p.cajas.map((c) => c.clase));
  for (const clase of ['SEXO', 'EMISIÓN', 'SOPORTE', 'SOPORTE_MIN', 'CAN', 'FIRMA', 'CLI']) assert.ok(tapadas.has(clase), clase);
  for (const clase of ['NOMBRE', 'APELLIDOS', 'NUM_DNI', 'NACIMIENTO', 'VALIDEZ']) assert.ok(!tapadas.has(clase), clase);
  // El CLI se tapa entero, con su cara pequeña, sin pisar la fecha de nacimiento, que se ve
  const cli = p.cajas.find((c) => c.clase === 'CLI');
  const nacimiento = p.det.find((d) => d.label === 'NACIMIENTO');
  assert.ok(cli.height > 3 * p.det.find((d) => d.label === 'CLI').height);
  assert.ok(cli.y >= nacimiento.y + nacimiento.height - 0.5);
});

test('con Viajes el reverso tapa la ventana del soporte aunque su casilla no esté marcada', () => {
  const p = plan('reverso', VIAJES);
  assert.equal(p.modo, 'auto');
  assert.ok(p.cajas.some((c) => c.clase === 'SOPORTE_MIN'));
});

test('si el modelo no encuentra la ventana del reverso se tapa en su sitio en vez de pedirla a mano (F9)', () => {
  const p = plan('reverso', TODO, { sin: ['SOPORTE_MIN'] });
  assert.equal(p.modo, 'auto', p.motivo);
  assert.deepEqual(p.rellenadas, ['SOPORTE_MIN']);
  const ventana = caja('SOPORTE_MIN', ANCLAS.reverso.SOPORTE_MIN.caja, camara());
  assert.ok(dentro(ventana, p.cajas.find((c) => c.plantilla)));
});

test('sin la plantilla se sigue pidiendo a mano lo que falta, como antes', () => {
  const p = plan('reverso', TODO, { sin: ['SOPORTE_MIN'], sinPlantilla: true });
  assert.equal(p.modo, 'parcial');
  assert.deepEqual(p.faltan, [{ campo: 'ventanaSoporte' }]);
});

test('con «Censurar todo» y fechas y CAN sin encontrar, el anverso se tapa solo con la plantilla', () => {
  const p = plan('anverso', TODO, { sin: ['NACIMIENTO', 'VALIDEZ', 'CAN', 'CLI'] });
  assert.equal(p.modo, 'auto', p.motivo);
  assert.deepEqual(new Set(p.rellenadas), new Set(['NACIMIENTO', 'VALIDEZ', 'CAN', 'CLI']));
});

test('el nombre y los apellidos no se tapan nunca con la plantilla, se piden a mano', () => {
  const p = plan('anverso', TODO, { sin: ['NOMBRE'] });
  assert.equal(p.modo, 'parcial');
  assert.deepEqual(p.faltan, [{ campo: 'nombre' }]);
});

test('una caja fuera de sitio se tapa igual pero no cuenta como encontrada', () => {
  const det = detecciones('reverso');
  const lugar = det.find((d) => d.label === 'LUGAR_NACIMIENTO');
  lugar.x += 0.13 * ANCHO;
  lugar.width -= 0.13 * ANCHO;
  const ajuste = ajustarPlantilla(det, 'reverso', TAMANO);
  const p = planDeCara({ cara: 'reverso', campos: TODO, detecciones: det, ajuste });
  assert.equal(p.modo, 'parcial');
  assert.deepEqual(p.faltan, [{ campo: 'lugarNacimiento' }]);
  assert.deepEqual(p.fueraDeSitio, ['LUGAR_NACIMIENTO']);
  assert.ok(p.cajas.some((c) => c.clase === 'LUGAR_NACIMIENTO'));
});

test('con la MRZ a la vista se tapa entera si repite un dato tapado (CEN-6)', () => {
  const soloNombre = plan('reverso', { anverso: { nombre: true }, reverso: { mrz: false } });
  assert.equal(soloNombre.modo, 'auto');
  assert.deepEqual(soloNombre.cajas.map((c) => c.clase), ['MRZ']);
  const mrz = soloNombre.det.find((d) => d.label === 'MRZ');
  assert.deepEqual(soloNombre.cajas[0], { x: mrz.x, y: mrz.y, width: mrz.width, height: mrz.height, clase: 'MRZ' });
  // Con el número de soporte, también la ventana. Sin ningún dato de la MRZ tapado, la MRZ se ve
  const dos = plan('reverso', { anverso: { fechaNacimiento: true, numeroSoporte: true }, reverso: {} });
  assert.deepEqual(new Set(dos.cajas.map((c) => c.clase)), new Set(['MRZ', 'SOPORTE_MIN']));
  const nada = plan('reverso', { anverso: { can: true, firma: true }, reverso: {} });
  assert.deepEqual(nada.cajas, []);
});

test('una plantilla que solo encaja con puntos casi en línea no tapa la ventana fuera de su sitio', () => {
  // El caso de la revisión del 23/11/2026. Un reverso sin la ventana, algo girado y en perspectiva. Con el suelo de
  // descarte del 1 % la plantilla se quedaba con cuatro clases casi en línea y tapaba la ventana a un lado
  const det = [
    { label: 'DOC_DNI_REV', x: -78, y: -17, width: 2104, height: 1314 },
    { label: 'DOMICILIO', x: 525, y: 85, width: 1431, height: 254 },
    { label: 'EQUIPO', x: 8, y: 398, width: 120, height: 331 },
    { label: 'HIJO_DE', x: 531, y: 651, width: 872, height: 119 },
    { label: 'LUGAR_NACIMIENTO', x: 522, y: 421, width: 941, height: 181 },
    { label: 'MRZ', x: -11, y: 829, width: 1923, height: 393 },
  ];
  const ajuste = ajustarPlantilla(det, 'reverso', TAMANO);
  const p = planDeCara({ cara: 'reverso', campos: TODO, detecciones: det, ajuste });
  const ventanaReal = { x: 204, y: 213, width: 225, height: 64 };
  const tapada = p.cajas.find((c) => c.clase === 'SOPORTE_MIN');
  // O se pide a mano o la zona tapa la ventana entera
  if (p.modo === 'auto') assert.ok(tapada && dentro(ventanaReal, tapada), JSON.stringify(tapada));
  else assert.ok(p.faltan.some((f) => f.campo === 'ventanaSoporte'));
  // Cada esquina del carné colocado cae cerca de la esquina de la foto
  if (ajuste.fiable) {
    const esquinas = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const [u, v] of esquinas) {
      const [x, y] = ajuste.aFoto(u, v);
      assert.ok(Math.hypot(x - u * ANCHO, y - v * ALTO) < 0.1 * Math.hypot(ANCHO, ALTO), `${u},${v} → ${x},${y}`);
    }
  }
});

test('en un reverso real algo girado no se da por mal puesta una caja buena de una sola esquina', () => {
  // Posiciones de las cajas del reverso de una foto real del S24 (1403 x 873, girada 4°). La esquina más alejada de las
  // anclas caía al 10 % de la de la foto y el reintento quitaba el domicilio, que estaba bien
  const tam = { ancho: 1403, alto: 873 };
  const fracciones = {
    DOC_DNI_REV: [-0.001, -0.025, 1.001, 1.087], DOMICILIO: [0.247, 0.048, 0.967, 0.255],
    EQUIPO: [0.013, 0.284, 0.054, 0.556], HIJO_DE: [0.234, 0.518, 0.734, 0.594],
    LUGAR_NACIMIENTO: [0.252, 0.303, 0.44, 0.454], MRZ: [0.003, 0.668, 0.979, 0.939],
  };
  const det = Object.entries(fracciones).map(([label, [x0, y0, x1, y1]]) => ({
    label, confidence: 0.9, x: x0 * tam.ancho, y: y0 * tam.alto, width: (x1 - x0) * tam.ancho, height: (y1 - y0) * tam.alto,
  }));
  const ajuste = ajustarPlantilla(det, 'reverso', tam);
  assert.equal(ajuste.fiable, true, ajuste.motivo);
  const p = planDeCara({ cara: 'reverso', campos: TODO, detecciones: det, ajuste });
  assert.equal(p.modo, 'auto', p.motivo);
  assert.deepEqual(p.fueraDeSitio, []);
  assert.deepEqual(p.rellenadas, ['SOPORTE_MIN']);
});

// Cajas en píxeles a partir de sus posiciones en fracción de la foto
const deFracciones = (fracciones, tam) => Object.entries(fracciones).map(([label, [x0, y0, x1, y1]]) => ({
  label, confidence: 0.9, x: x0 * tam.ancho, y: y0 * tam.alto, width: (x1 - x0) * tam.ancho, height: (y1 - y0) * tam.alto,
}));

test('con una caja del reverso algo desplazada, el reintento la quita a ella y no al domicilio', () => {
  // Cajas del reverso sintético B01 del banco sin la ventana, con el lugar de nacimiento empezando un 3 % más a la
  // derecha. Sin él o sin el domicilio quedan las mismas cajas en su sitio, y desempatar por más esquinas quitaba el
  // domicilio, la única ancla por encima de la ventana, que se tapaba desplazada (segunda revisión del 23/11/2026)
  const tam = { ancho: 2000, alto: 1207 };
  const det = deFracciones({
    DOC_DNI_REV: [0.001, 0.004, 1, 1.039], DOMICILIO: [0.279, 0.071, 1.001, 0.263], EQUIPO: [0.046, 0.267, 0.087, 0.566],
    HIJO_DE: [0.285, 0.533, 0.712, 0.622], LUGAR_NACIMIENTO: [0.315, 0.355, 0.736, 0.477], MRZ: [0.032, 0.697, 0.991, 0.977],
  }, tam);
  const ajuste = ajustarPlantilla(det, 'reverso', tam);
  assert.equal(ajuste.fiable, true, ajuste.motivo);
  assert.ok(ajuste.enSuSitio(det.find((d) => d.label === 'DOMICILIO')));
  assert.ok(!ajuste.enSuSitio(det.find((d) => d.label === 'LUGAR_NACIMIENTO')));
  const p = planDeCara({ cara: 'reverso', campos: { anverso: { numeroSoporte: true }, reverso: {} }, detecciones: det,
    ajuste, tamano: tam });
  assert.equal(p.modo, 'auto', p.motivo);
  const [ventana] = deFracciones({ SOPORTE_MIN: [0.117, 0.157, 0.234, 0.214] }, tam);
  assert.ok(dentro(ventana, p.cajas.find((c) => c.clase === 'SOPORTE_MIN')));
});

test('sin el domicilio ni la ventana del reverso, la ventana no se tapa a ciegas, se pide a mano', () => {
  // Por encima de la ventana solo está la esquina del domicilio, y sin ella la plantilla la extrapola desde abajo. Con
  // una caja repetida, para no bajar del mínimo de detecciones del reverso
  const det = detecciones('reverso', { sin: ['SOPORTE_MIN', 'DOMICILIO'] });
  det.push({ ...det.find((d) => d.label === 'MRZ') });
  const ajuste = ajustarPlantilla(det, 'reverso', TAMANO);
  assert.equal(ajuste.fiable, true, ajuste.motivo);
  const zona = ZONAS.reverso.SOPORTE_MIN;
  assert.equal(margenDeZona(ajuste, zona), null);
  // Se pide a mano tanto si se ha marcado la ventana como si solo es la copia del número de soporte, que si no nunca
  // manda a censura manual. Tapada a ojo quedaba desplazada (tercera revisión del 23/11/2026)
  for (const campos of [{ anverso: {}, reverso: { ventanaSoporte: true } }, { anverso: { numeroSoporte: true }, reverso: {} }]) {
    const p = planDeCara({ cara: 'reverso', campos, detecciones: det, ajuste, tamano: TAMANO });
    assert.equal(p.modo, 'parcial', p.motivo);
    assert.deepEqual(p.faltan, [{ campo: 'ventanaSoporte' }]);
    assert.deepEqual(p.rellenadas, []);
  }
  // Con el domicilio, la ventana se tapa sola
  const conDomicilio = ajustarPlantilla(detecciones('reverso', { sin: ['SOPORTE_MIN'] }), 'reverso', TAMANO);
  assert.notEqual(margenDeZona(conDomicilio, zona), null);
});

test('la caja del domicilio no recorta la ventana tapada con la plantilla, se tape o no la calle', () => {
  // La caja del domicilio empieza un 2 % del ancho más a la izquierda, todavía en su sitio, y llega al margen de la
  // ventana. Antes lo recortaba (tercera revisión del 23/11/2026)
  const ajuste = ajustarPlantilla(detecciones('reverso', { sin: ['SOPORTE_MIN'] }), 'reverso', TAMANO);
  const det = detecciones('reverso', { sin: ['SOPORTE_MIN'] }).map((d) => (d.label === 'DOMICILIO'
    ? { ...d, x: d.x - 0.02 * ANCHO, width: d.width + 0.02 * ANCHO } : d));
  const domicilio = det.find((d) => d.label === 'DOMICILIO');
  assert.ok(ajuste.enSuSitio(domicilio));
  const lineasDomicilio = { calle: [{ x: domicilio.x, y: domicilio.y, width: domicilio.width, height: domicilio.height / 2 }] };
  // Como Viajes, que tapa la calle y deja a la vista el municipio y la provincia
  const soloLaCalle = { anverso: { numeroSoporte: true }, reverso: { domicilio: true, municipio: false, provincia: false } };
  const p = planDeCara({ cara: 'reverso', campos: soloLaCalle, detecciones: det, ajuste, tamano: TAMANO, lineasDomicilio });
  assert.ok(p.cajas.some((c) => c.clase === 'DOM_CALLE'), 'se tapa solo la calle');
  assert.equal(p.modo, 'auto', p.motivo);
  const zona = ZONAS.reverso.SOPORTE_MIN;
  const entera = zonaEnFoto(ajuste, zona, margenDeZona(ajuste, zona));
  const tapada = p.cajas.find((c) => c.clase === 'SOPORTE_MIN' && c.plantilla);
  assert.ok(entera.x + entera.width > domicilio.x, 'la zona de la ventana llega a la caja del domicilio');
  assert.ok(Math.abs(tapada.x + tapada.width - (entera.x + entera.width)) < 0.5, 'y no se recorta');
  // Con el domicilio a la vista entero, como en Administrativo, tampoco
  const aLaVista = planDeCara({ cara: 'reverso', campos: { anverso: { numeroSoporte: true }, reverso: {} }, detecciones: det,
    ajuste, tamano: TAMANO });
  const tapadaAdm = aLaVista.cajas.find((c) => c.clase === 'SOPORTE_MIN' && c.plantilla);
  assert.ok(Math.abs(tapadaAdm.x + tapadaAdm.width - (entera.x + entera.width)) < 0.5);
});

test('una copia sin encontrar no manda a censura manual, pero se pide si la cara ya va a mano', () => {
  const sinVentana = plan('reverso', { anverso: { numeroSoporte: true }, reverso: {} },
    { sin: ['SOPORTE_MIN'], sinPlantilla: true });
  assert.equal(sinVentana.modo, 'auto');
  // Con una caja repetida, para no bajar del mínimo de detecciones del reverso
  const det = detecciones('reverso', { sin: ['SOPORTE_MIN', 'HIJO_DE'] });
  det.push({ ...det.find((d) => d.label === 'MRZ') });
  const conOtroFallo = planDeCara({ cara: 'reverso', campos: { anverso: { numeroSoporte: true },
    reverso: { progenitores: true } }, detecciones: det, ajuste: null });
  assert.equal(conOtroFallo.modo, 'parcial');
  assert.deepEqual(conOtroFallo.faltan, [{ campo: 'progenitores' }, { campo: 'ventanaSoporte' }]);
  // La ventana del anverso lleva su propio nombre, que no es el de la casilla
  const anverso = plan('anverso', { anverso: { numeroSoporte: true, can: true }, reverso: {} },
    { sin: ['SOPORTE_MIN', 'CAN'], sinPlantilla: true });
  assert.deepEqual(anverso.faltan, [{ campo: 'can' }, { campo: 'numeroSoporte', nombre: 'Ventana del soporte' }]);
  // Y se pide aunque también falte el número de soporte grande
  const losDos = plan('anverso', { anverso: { numeroSoporte: true }, reverso: {} },
    { sin: ['SOPORTE_MIN', 'SOPORTE'], sinPlantilla: true });
  assert.deepEqual(losDos.faltan, [{ campo: 'numeroSoporte' }, { campo: 'numeroSoporte', nombre: 'Ventana del soporte' }]);
});

test('sin plantilla decide como modoDeCensura en los casos de siempre', () => {
  const MAPA = { sexo: 'SEXO', fechaExpedicion: 'EMISIÓN', numeroSoporte: ['SOPORTE', 'SOPORTE_MIN'], can: 'CAN',
    firma: 'FIRMA', cli: 'CLI' };
  const casos = [[], ['CAN'], ['CAN', 'FIRMA'], ['CLI'], ['SOPORTE_MIN'], ['DOC_DNI']];
  for (const sin of casos) {
    const det = detecciones('anverso', { sin });
    const antes = modoDeCensura(VIAJES.anverso, det, 'anverso', MAPA);
    const ahora = planDeCara({ cara: 'anverso', campos: VIAJES, detecciones: det, ajuste: null });
    assert.equal(ahora.modo, antes.modo, `sin ${sin}`);
    assert.deepEqual(ahora.faltan.map((f) => f.campo), antes.faltan, `sin ${sin}`);
  }
});

test('al tapar una zona no se pisa un dato a la vista, salvo dentro del núcleo', () => {
  const nucleo = { x: 100, y: 100, width: 100, height: 40 };
  const zona = { x: 80, y: 90, width: 140, height: 60 };
  const derecha = { x: 210, y: 100, width: 50, height: 40 };
  assert.deepEqual(recortarContraVisibles(zona, nucleo, [derecha]), { x: 80, y: 90, width: 130, height: 60 });
  const encima = { x: 150, y: 110, width: 30, height: 10 };
  assert.deepEqual(recortarContraVisibles(zona, nucleo, [encima]), zona);
});

// Copias de lo marcado en una cara que va entera a censura manual (24/11/2026)

test('con Viajes y una cara entera a mano se avisa de las zonas que repiten lo marcado', () => {
  // Detrás la ventana repite el número de soporte. La MRZ no sale, porque ya está marcada
  assert.deepEqual(copiasDeLoMarcado('reverso', VIAJES), [{ campo: 'ventanaSoporte' }]);
  // Delante el CLI repite la fecha de expedición y la ventana el número de soporte
  assert.deepEqual(copiasDeLoMarcado('anverso', VIAJES),
    [{ campo: 'cli' }, { campo: 'numeroSoporte', nombre: 'Ventana del soporte' }]);
});

test('con «Censurar todo» solo se avisa de las copias que no tienen casilla propia', () => {
  assert.deepEqual(copiasDeLoMarcado('reverso', TODO), []);
  assert.deepEqual(copiasDeLoMarcado('anverso', TODO),
    [{ campo: 'dni', nombre: 'Número de DNI pequeño' }, { campo: 'numeroSoporte', nombre: 'Ventana del soporte' }]);
});

test('con solo el nombre marcado, la trasera entera a mano avisa de la MRZ, que lo repite', () => {
  const soloNombre = { anverso: { nombre: true }, reverso: {} };
  assert.deepEqual(copiasDeLoMarcado('reverso', soloNombre), [{ campo: 'mrz' }]);
  assert.deepEqual(copiasDeLoMarcado('anverso', soloNombre), []);
});

test('sin nada marcado no se avisa de ninguna copia', () => {
  const nada = { anverso: {}, reverso: {} };
  assert.deepEqual(copiasDeLoMarcado('anverso', nada), []);
  assert.deepEqual(copiasDeLoMarcado('reverso', nada), []);
});
