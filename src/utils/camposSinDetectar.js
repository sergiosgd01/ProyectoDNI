/**
 * Campos que el perfil manda tapar en una cara y que el detector no ha encontrado.
 *
 * El editor tapaba solo una cara si había al menos 15 detecciones en el anverso o 6 en el reverso, sin mirar cuáles.
 * El 16/11/2026 un anverso hecho con la cámara de un Galaxy S24 Ultra llegó a 15 sin el CAN ni la firma, y con el
 * perfil Viajes los dos se quedaron a la vista en la imagen final. Ahora, si falta alguno de los campos que se tapan,
 * esa cara va a censura manual.
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
