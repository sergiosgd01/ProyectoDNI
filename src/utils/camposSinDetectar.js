/**
 * Campos que el perfil manda tapar en una cara y que el detector no ha encontrado.
 *
 * El editor tapaba solo una cara si había al menos 15 detecciones en el anverso o 6 en el reverso, sin mirar cuáles.
 * El 16/11/2026 un anverso hecho con la cámara de un Galaxy S24 Ultra llegó a 15 sin el CAN ni la firma, y con el
 * perfil Viajes los dos se quedaron a la vista en la imagen final. Ahora, si falta alguno de los campos que se tapan,
 * esa cara va a censura manual.
 *
 * Desde FUN-2 (18/11/2026) esa censura manual es parcial. Si el DNI se reconoce bien, la cara se tapa con lo que sí se
 * ha encontrado y la ventana de censura manual pide solo lo que falta (ver modoDeCensura).
 *
 * Desde el 23/11/2026 el editor decide con planDeCara (planCensura.js), que usa las constantes de aquí, tapa también
 * las copias de cada dato y rellena con la plantilla del DNI lo que no encuentra. modoDeCensura se queda como
 * referencia de cómo se decidía antes, y sus pruebas comprueban que planDeCara sin plantilla decide igual.
 */

// Clases que el detector encuentra en cada cara del DNI 4.0 (las que da con los especímenes del banco de pruebas).
// CLI no sale en ninguna cara, y DIRECCION y PROVINCIA no son clases del modelo, así que esos campos no se comprueban.
// FOTOGRAFIA se comprueba para que una foto marcada para tapar que el detector no encuentre no se quede a la vista
export const CLASES_POR_CARA = {
  anverso: [
    'APELLIDOS', 'CAN', 'EMISIÓN', 'FIRMA', 'FOTOGRAFIA', 'NACIMIENTO', 'NACIONALIDAD', 'NOMBRE', 'NUM_DNI',
    'NUM_DNI_MIN', 'SEXO', 'SOPORTE', 'SOPORTE_MIN', 'VALIDEZ',
  ],
  reverso: ['DOMICILIO', 'EQUIPO', 'HIJO_DE', 'LUGAR_NACIMIENTO', 'MRZ', 'SOPORTE_MIN'],
};

/**
 * Un campo con varias clases, como el número de DNI (NUM_DNI y NUM_DNI_MIN), se da por encontrado con cualquiera de
 * ellas. Así no se pide censura manual por una clase que el modelo no saca en todos los DNI, como SOPORTE_MIN en el
 * anverso de las fotos reales.
 * @param {Object} campos - Campo de la interfaz → true si se tapa (selectedFrontFields o selectedBackFields)
 * @param {Array} detecciones - Detecciones de esa cara
 * @param {'anverso'|'reverso'} cara
 * @param {Object} clasesDeCampo - Campo de la interfaz → clase o lista de clases del detector (mapUiToYolo)
 * @returns {string[]} Los campos que faltan, con su nombre de la interfaz
 */
export function camposSinDetectar(campos, detecciones, cara, clasesDeCampo) {
  const vistas = new Set(detecciones.map((d) => d.label));
  const posibles = new Set(CLASES_POR_CARA[cara] || []);
  return Object.entries(campos || {})
    .filter(([, tapar]) => tapar === true)
    .map(([campo]) => [campo, [].concat(clasesDeCampo[campo] || campo.toUpperCase()).filter((c) => posibles.has(c))])
    .filter(([, clases]) => clases.length > 0 && !clases.some((c) => vistas.has(c)))
    .map(([campo]) => campo);
}

// Clase del documento en cada cara y mínimo de detecciones para fiarse de sus cajas. Sin el documento o con menos
// detecciones, lo encontrado puede estar mal colocado, así que la cara se tapa entera a mano
export const DOCUMENTO_POR_CARA = { anverso: 'DOC_DNI', reverso: 'DOC_DNI_REV' };
export const MIN_DETECCIONES = { anverso: 15, reverso: 6 };

// Campos que el modelo encuentra pocas veces y que ninguna otra caja tapa, como el CLI (CEN-7). En los especímenes del
// banco no sale nunca, y en las fotos reales a veces sí, con poca confianza (0,53 en s24_cerca). Por eso no cuentan para
// decidir si una cara se tapa sola, y si no los encuentra se quedan a la vista. Pero en una cara parcial se piden si no
// se han encontrado, porque la persona ya va a dibujar. Antes de FUN-2 esa cara iba entera a mano y quien tapaba con
// cuidado los tapaba (en el banco, el CLI de dos fotos reales). El domicilio y la provincia del reverso no están porque
// la caja del municipio tapa todo el bloque de la dirección
export const SIEMPRE_A_MANO = { anverso: ['cli'], reverso: [] };

/**
 * Cómo se tapa una cara.
 * - 'auto' si se reconoce el DNI y están todos los campos que el perfil tapa. Se tapa sola.
 * - 'parcial' si se reconoce el DNI pero falta alguno de esos campos. Se tapa con lo encontrado y la censura manual
 *   pide solo lo que falta (FUN-2).
 * - 'manual' si no se encuentra el documento o hay menos detecciones del mínimo. Se tapa entera a mano, como antes.
 * Los parámetros son los de camposSinDetectar.
 * @returns {{ modo: 'auto'|'parcial'|'manual', faltan: string[], motivo: string }} faltan lleva los campos de la
 *   interfaz que hay que tapar a mano (solo en 'parcial') y motivo explica la decisión en la consola
 */
export function modoDeCensura(campos, detecciones, cara, clasesDeCampo) {
  const documento = DOCUMENTO_POR_CARA[cara];
  if (!detecciones.some((d) => d.label === documento)) {
    return { modo: 'manual', faltan: [], motivo: `no se detectó el documento ${documento}` };
  }
  const minimo = MIN_DETECCIONES[cara];
  if (detecciones.length < minimo) {
    return { modo: 'manual', faltan: [], motivo: `solo ${detecciones.length} detecciones, mínimo ${minimo}` };
  }
  const faltan = camposSinDetectar(campos, detecciones, cara, clasesDeCampo);
  if (faltan.length > 0) {
    // Los que casi nunca encuentra se piden solo si se tapan y esta vez tampoco los ha encontrado
    const vistas = new Set(detecciones.map((d) => d.label));
    const sinEncontrar = (SIEMPRE_A_MANO[cara] || []).filter((campo) => campos?.[campo] === true
      && !faltan.includes(campo)
      && ![].concat(clasesDeCampo[campo] || campo.toUpperCase()).some((clase) => vistas.has(clase)));
    return { modo: 'parcial', faltan: [...faltan, ...sinEncontrar], motivo: `no se han encontrado: ${faltan.join(', ')}` };
  }
  return { modo: 'auto', faltan: [], motivo: 'están todos los campos que se tapan' };
}
