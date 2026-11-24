// Pruebas de las métricas de detección que se envían a /api/dni/save. No necesitan navegador: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { construirDeteccion } from './metricasDeteccion.js';

const cajas = (...clases) => clases.map((label) => ({ label, confidence: 0.91234, x: 1, y: 2, width: 3, height: 4 }));
// Una plantilla colocada que da por fuera de sitio las clases que se le digan
const colocada = (residuo, ...fuera) => ({ fiable: true, residuo, enSuSitio: (d) => !fuera.includes(d.label) });

test('cada cara lleva la plantilla, las cajas fuera de sitio y lo tapado con la plantilla (MET-4)', () => {
  const deteccion = construirDeteccion({
    anverso: cajas('DOC_DNI', 'NOMBRE', 'NOMBRE', 'CLI', 'NO_EXISTE'),
    reverso: cajas('DOC_DNI_REV', 'MRZ', 'LUGAR_NACIMIENTO'),
    anversoAutomatico: true,
    reversoAutomatico: false,
    modelo: 'abc123',
    anversoPlantilla: {
      // NOMBRE está fuera de sitio aunque no se tape. NO_EXISTE no es una clase del detector y no se envía
      ajuste: colocada(0.012345, 'NOMBRE', 'NO_EXISTE'),
      plan: { fueraDeSitio: [], rellenadas: ['SOPORTE_MIN', 'CAN', 'CLI'] },
    },
    reversoPlantilla: {
      ajuste: colocada(0.02, 'LUGAR_NACIMIENTO'),
      plan: { rellenadas: [] },
      domicilioPartido: true,
    },
  });
  assert.deepEqual(
    { ...deteccion.anverso, clases: undefined },
    {
      caraDetectada: true, automatica: true, detecciones: 5, clases: undefined,
      plantilla: true, errorPlantilla: 0.012, fueraDeSitio: ['NOMBRE'], rellenadas: ['CAN', 'CLI', 'SOPORTE_MIN'],
      domicilioPartido: null,
    },
  );
  assert.equal(deteccion.reverso.plantilla, true);
  assert.deepEqual(deteccion.reverso.fueraDeSitio, ['LUGAR_NACIMIENTO']);
  assert.equal(deteccion.reverso.domicilioPartido, true);
  // Nada de cajas ni posiciones
  assert.ok(!JSON.stringify(deteccion).includes('"x"'));
});

test('sin plantilla o sin datos, valores seguros', () => {
  const deteccion = construirDeteccion({
    anverso: cajas('DOC_DNI'),
    reverso: cajas('DOC_DNI_REV'),
    anversoAutomatico: false,
    reversoAutomatico: true,
    modelo: 'x',
    anversoPlantilla: { ajuste: { fiable: false, motivo: 'no encaja' }, plan: { modo: 'manual' } },
  });
  for (const cara of [deteccion.anverso, deteccion.reverso]) {
    assert.equal(cara.plantilla, false);
    assert.equal(cara.errorPlantilla, null);
    assert.deepEqual(cara.fueraDeSitio, []);
    assert.deepEqual(cara.rellenadas, []);
    assert.equal(cara.domicilioPartido, null);
  }
  // Sin reverso sigue siendo null
  assert.equal(construirDeteccion({ anverso: [], reverso: null, modelo: 'x' }).reverso, null);
});

test('una cara que va entera a mano no cuenta como con plantilla, aunque encaje', () => {
  const deteccion = construirDeteccion({
    anverso: cajas('DOC_DNI', 'NOMBRE'),
    reverso: cajas('DOC_DNI_REV', 'MRZ'),
    modelo: 'x',
    anversoPlantilla: { ajuste: colocada(0.005, 'NOMBRE'), plan: { modo: 'manual', rellenadas: [] } },
    reversoPlantilla: { ajuste: colocada(0.01), plan: { modo: 'auto', rellenadas: [] }, domicilioPartido: 'sí' },
  });
  assert.equal(deteccion.anverso.plantilla, false);
  assert.equal(deteccion.anverso.errorPlantilla, null);
  assert.deepEqual(deteccion.anverso.fueraDeSitio, []);
  assert.equal(deteccion.reverso.plantilla, true);
  // Lo que no es un booleano se manda como null
  assert.equal(deteccion.reverso.domicilioPartido, null);
});

test('el anverso nunca lleva el domicilio partido', () => {
  const deteccion = construirDeteccion({
    anverso: cajas('DOC_DNI'),
    reverso: null,
    modelo: 'x',
    anversoPlantilla: { ajuste: colocada(0.01), plan: { modo: 'auto' }, domicilioPartido: true },
  });
  assert.equal(deteccion.anverso.domicilioPartido, null);
});

test('la plantilla a null o una comprobación que falla no rompen las métricas', () => {
  const deteccion = construirDeteccion({
    anverso: cajas('DOC_DNI', 'NOMBRE'),
    reverso: cajas('DOC_DNI_REV'),
    modelo: 'x',
    anversoPlantilla: {
      ajuste: { fiable: true, residuo: 0.01, enSuSitio: () => { throw new Error('caja rara'); } },
      plan: { rellenadas: ['CAN'] },
    },
    reversoPlantilla: null,
  });
  assert.equal(deteccion.anverso.plantilla, true);
  assert.deepEqual(deteccion.anverso.fueraDeSitio, []);
  assert.deepEqual(deteccion.anverso.rellenadas, ['CAN']);
  assert.equal(deteccion.reverso.plantilla, false);
  assert.equal(deteccion.reverso.domicilioPartido, null);
});

test('sin plantilla fiable no se envían listas aunque el plan traiga algo', () => {
  const deteccion = construirDeteccion({
    anverso: cajas('DOC_DNI', 'NOMBRE'),
    reverso: null,
    modelo: 'x',
    anversoPlantilla: {
      ajuste: { fiable: false, residuo: 0.3, enSuSitio: () => false },
      plan: { rellenadas: ['CAN'] },
    },
  });
  assert.equal(deteccion.anverso.errorPlantilla, null);
  assert.deepEqual(deteccion.anverso.fueraDeSitio, []);
  assert.deepEqual(deteccion.anverso.rellenadas, []);
});
