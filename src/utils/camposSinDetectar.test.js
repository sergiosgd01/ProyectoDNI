// Pruebas de la comprobación de campos antes de tapar solo. No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { camposSinDetectar, modoDeCensura } from './camposSinDetectar.js';

// Copia del mapa de dni_censor.jsx, que no se puede importar aquí porque es un componente
const MAPA = {
  nombre: 'NOMBRE',
  dni: ['NUM_DNI', 'NUM_DNI_MIN'],
  sexo: 'SEXO',
  fechaExpedicion: 'EMISIÓN',
  numeroSoporte: ['SOPORTE', 'SOPORTE_MIN'],
  can: 'CAN',
  firma: 'FIRMA',
  fotografia: 'FOTOGRAFIA',
  cli: 'CLI',
  domicilio: 'DIRECCION',
  municipio: 'DOMICILIO',
  equipoExpedidor: 'EQUIPO',
};

const vistas = (...clases) => clases.map((label) => ({ label, confidence: 0.9 }));

// Lo que tapa el perfil Viajes en el anverso
const VIAJES = { nombre: false, dni: false, sexo: true, fechaExpedicion: true, numeroSoporte: true, can: true, firma: true };

test('con el perfil Viajes faltan el CAN y la firma si el detector no los ha visto, como en el S24', () => {
  const detecciones = vistas('DOC_DNI', 'NOMBRE', 'NUM_DNI', 'SEXO', 'EMISIÓN', 'SOPORTE', 'FOTOGRAFIA');
  assert.deepEqual(camposSinDetectar(VIAJES, detecciones, 'anverso', MAPA), ['can', 'firma']);
});

test('no falta nada si se han visto todos los campos que se tapan', () => {
  const detecciones = vistas('DOC_DNI', 'SEXO', 'EMISIÓN', 'SOPORTE', 'CAN', 'FIRMA');
  assert.deepEqual(camposSinDetectar(VIAJES, detecciones, 'anverso', MAPA), []);
});

test('los campos que se dejan a la vista no cuentan aunque no se hayan visto', () => {
  const detecciones = vistas('DOC_DNI', 'SEXO', 'EMISIÓN', 'SOPORTE', 'CAN', 'FIRMA');
  // nombre y dni van a false en Viajes y no están en las detecciones
  assert.deepEqual(camposSinDetectar(VIAJES, detecciones, 'anverso', MAPA), []);
});

test('un campo con dos clases vale con una de ellas', () => {
  const detecciones = vistas('DOC_DNI', 'NUM_DNI', 'SOPORTE');
  assert.deepEqual(camposSinDetectar({ dni: true, numeroSoporte: true }, detecciones, 'anverso', MAPA), []);
});

test('con «Fotografía» marcada falta la foto si el detector no la ha encontrado', () => {
  const detecciones = vistas('DOC_DNI', 'SEXO', 'EMISIÓN', 'SOPORTE', 'CAN', 'FIRMA');
  assert.deepEqual(camposSinDetectar({ ...VIAJES, fotografia: true }, detecciones, 'anverso', MAPA), ['fotografia']);
  // Encontrada, ya no falta nada
  const conFoto = vistas('DOC_DNI', 'SEXO', 'EMISIÓN', 'SOPORTE', 'CAN', 'FIRMA', 'FOTOGRAFIA');
  assert.deepEqual(camposSinDetectar({ ...VIAJES, fotografia: true }, conFoto, 'anverso', MAPA), []);
});

test('la foto a la vista, como en todos los perfiles, no se pide aunque no se haya encontrado', () => {
  const detecciones = vistas('DOC_DNI', 'SEXO', 'EMISIÓN', 'SOPORTE', 'CAN', 'FIRMA');
  assert.deepEqual(camposSinDetectar({ ...VIAJES, fotografia: false }, detecciones, 'anverso', MAPA), []);
});

test('no se piden campos que el detector no saca nunca o que no son del modelo', () => {
  // CLI no sale en el DNI 4.0 y DIRECCION no es una clase del modelo
  assert.deepEqual(camposSinDetectar({ cli: true }, vistas('DOC_DNI'), 'anverso', MAPA), []);
  assert.deepEqual(camposSinDetectar({ domicilio: true, provincia: true }, vistas('DOC_DNI_REV'), 'reverso', MAPA), []);
});

test('en el reverso falta el municipio si no está la caja del domicilio', () => {
  const detecciones = vistas('DOC_DNI_REV', 'MRZ', 'EQUIPO');
  assert.deepEqual(
    camposSinDetectar({ municipio: true, equipoExpedidor: true, domicilio: true }, detecciones, 'reverso', MAPA),
    ['municipio'],
  );
});

// modoDeCensura (FUN-2). Con el DNI reconocido y algún campo sin encontrar, la cara se tapa con lo encontrado y solo
// se pide a mano lo que falta. Sin el documento o con pocas detecciones se sigue tapando entera a mano

const MAPA_REVERSO = {
  ...MAPA, mrz: 'MRZ', lugarNacimiento: 'LUGAR_NACIMIENTO', progenitores: 'HIJO_DE', ventanaSoporte: 'SOPORTE_MIN',
};

// Un anverso reconocido, con 15 detecciones y todo lo que tapa Viajes menos el CAN
const ANVERSO_SIN_CAN = vistas(
  'DOC_DNI', 'NOMBRE', 'APELLIDOS', 'NUM_DNI', 'NUM_DNI_MIN', 'SEXO', 'NACIONALIDAD', 'NACIMIENTO', 'EMISIÓN',
  'VALIDEZ', 'SOPORTE', 'SOPORTE_MIN', 'FOTOGRAFIA', 'FIRMA', 'NOMBRE',
);

test('con el DNI reconocido y un campo sin encontrar la censura es parcial y pide solo ese campo', () => {
  assert.deepEqual(modoDeCensura(VIAJES, ANVERSO_SIN_CAN, 'anverso', MAPA).modo, 'parcial');
  assert.deepEqual(modoDeCensura(VIAJES, ANVERSO_SIN_CAN, 'anverso', MAPA).faltan, ['can']);
});

test('con todos los campos que se tapan la cara se tapa sola', () => {
  const detecciones = [...ANVERSO_SIN_CAN, ...vistas('CAN')];
  assert.deepEqual(modoDeCensura(VIAJES, detecciones, 'anverso', MAPA), {
    modo: 'auto', faltan: [], motivo: 'están todos los campos que se tapan',
  });
});

test('sin el documento la cara se tapa entera a mano aunque haya muchas detecciones', () => {
  const sinDocumento = ANVERSO_SIN_CAN.filter((d) => d.label !== 'DOC_DNI');
  const modo = modoDeCensura(VIAJES, [...sinDocumento, ...vistas('NOMBRE', 'CAN')], 'anverso', MAPA);
  assert.equal(modo.modo, 'manual');
  assert.deepEqual(modo.faltan, []);
});

test('con menos detecciones del mínimo la cara se tapa entera a mano aunque falte un solo campo', () => {
  // 14 en el anverso, una menos que el mínimo
  assert.equal(modoDeCensura(VIAJES, ANVERSO_SIN_CAN.slice(0, 14), 'anverso', MAPA).modo, 'manual');
  // 5 en el reverso, una menos que el mínimo
  const reverso = vistas('DOC_DNI_REV', 'MRZ', 'EQUIPO', 'HIJO_DE', 'LUGAR_NACIMIENTO');
  assert.equal(modoDeCensura({ mrz: true }, reverso, 'reverso', MAPA_REVERSO).modo, 'manual');
});

test('con «Censurar todo» en el reverso de una foto real solo falta la ventana del soporte (F9)', () => {
  const reverso = vistas('DOC_DNI_REV', 'MRZ', 'EQUIPO', 'HIJO_DE', 'LUGAR_NACIMIENTO', 'DOMICILIO');
  const todo = {
    mrz: true, domicilio: true, municipio: true, provincia: true, lugarNacimiento: true, equipoExpedidor: true,
    progenitores: true, ventanaSoporte: true,
  };
  const modo = modoDeCensura(todo, reverso, 'reverso', MAPA_REVERSO);
  assert.equal(modo.modo, 'parcial');
  assert.deepEqual(modo.faltan, ['ventanaSoporte']);
});

test('en una cara parcial también se pide el CLI si se tapa, porque el modelo no lo encuentra nunca', () => {
  const conCli = { ...VIAJES, cli: true };
  assert.deepEqual(modoDeCensura(conCli, ANVERSO_SIN_CAN, 'anverso', MAPA).faltan, ['can', 'cli']);
  // Si solo faltaría el CLI, la cara se sigue tapando sola, como hasta ahora (CEN-7)
  const completo = [...ANVERSO_SIN_CAN, ...vistas('CAN')];
  assert.equal(modoDeCensura(conCli, completo, 'anverso', MAPA).modo, 'auto');
});

test('en una cara parcial el CLI no se pide si esta vez el detector sí lo ha encontrado', () => {
  // En s24_cerca el detector encuentra el CLI con 0,53 y la caja ya lo tapa
  const conCli = { ...VIAJES, cli: true };
  assert.deepEqual(modoDeCensura(conCli, [...ANVERSO_SIN_CAN, ...vistas('CLI')], 'anverso', MAPA).faltan, ['can']);
});
