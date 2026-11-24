import { ANCLAS, ZONAS, ZONAS_SOLO_PARA_COMPROBAR } from './plantillaDni.js';
import { DONDE_SALE } from './planCensura.js';

// Dónde está cada dato en el carné, de 0 a 1, para iluminarlo en la foto al pasar por su casilla (UX-12, 24/11/2026).
// Es una pista. Sale de la plantilla del DNI 4.0 sin colocarla sobre la foto, porque antes de procesar no hay
// detecciones, así que en un recorte torcido o con margen queda algo movida
const CAJAS = {
  anverso: {
    ...Object.fromEntries(Object.entries(ANCLAS.anverso).map(([clase, { caja }]) => [clase, caja])),
    ...ZONAS_SOLO_PARA_COMPROBAR.anverso,
    ...ZONAS.anverso,
  },
  reverso: {
    ...Object.fromEntries(Object.entries(ANCLAS.reverso).map(([clase, { caja }]) => [clase, caja])),
    ...ZONAS.reverso,
  },
};

// El domicilio es un bloque con la etiqueta y cuatro líneas. La calle va en las primeras y el municipio y la provincia
// en las dos últimas (ver lineasDomicilio.js), así que se reparte el bloque a ojo
const [dx0, dy0, dx1, dy1] = CAJAS.reverso.DOMICILIO;
const altoDomicilio = dy1 - dy0;
CAJAS.reverso.DOM_CALLE = [dx0, dy0, dx1, dy0 + 0.6 * altoDomicilio];
CAJAS.reverso.DOM_MUNICIPIO = [dx0, dy0 + 0.6 * altoDomicilio, dx1, dy0 + 0.8 * altoDomicilio];
CAJAS.reverso.DOM_PROVINCIA = [dx0, dy0 + 0.8 * altoDomicilio, dx1, dy1];

/**
 * Sitios de un campo del editor en las dos caras, con sus copias (la MRZ, la ventana del soporte...)
 * @param {string} campo - Casilla del editor, como 'numeroSoporte'
 * @returns {Array<{cara: 'anverso'|'reverso', caja: number[], copia: boolean}>} caja es [x0, y0, x1, y1] de 0 a 1
 */
export function sitiosDelCampo(campo) {
  return (DONDE_SALE[campo] || [])
    .map(({ cara, clase, copia }) => ({ cara, caja: CAJAS[cara][clase], copia }))
    .filter(({ caja }) => Boolean(caja));
}
