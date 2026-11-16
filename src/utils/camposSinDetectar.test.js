// Pruebas de la comprobación de campos antes de tapar solo. No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { camposSinDetectar } from './camposSinDetectar.js';

// Copia del mapa de dni_censor.jsx, que no se puede importar aquí porque es un componente
const MAPA = {
  nombre: 'NOMBRE',
  dni: ['NUM_DNI', 'NUM_DNI_MIN'],
  sexo: 'SEXO',
  fechaExpedicion: 'EMISIÓN',
  numeroSoporte: ['SOPORTE', 'SOPORTE_MIN'],
  can: 'CAN',
  firma: 'FIRMA',
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
