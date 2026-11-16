// Métricas de detección por campo (MET-1). Con ellas el backend estima con qué frecuencia falla cada campo.
// Por cada cara se envía si se encontró el documento, si se censuró sola, cuántas cajas devolvió el detector
// y la confianza máxima de cada clase. Solo booleanos, enteros y confianzas. Nunca cajas, posiciones,
// textos leídos ni nombres de archivo.

// Las 26 clases del modelo de campos. Es una copia de CLASS_NAMES de components/dni_scripts/dni_detector.jsx,
// que no la exporta. Las dos listas deben coincidir. Si el modelo cambia de clases, hay que cambiar las dos
export const CLASES_DETECTOR = [
  'APELLIDOS', 'CAN', 'CLI', 'DOC_DNI', 'DOC_DNI_REV', 'DOMICILIO',
  'EMISIÓN', 'EQUIPO', 'ES', 'ESP', 'ESP_HOLO', 'FIRMA', 'FOTOGRAFIA',
  'HIJO_DE', 'LUGAR_NACIMIENTO', 'MRZ', 'NACIMIENTO', 'NACIONALIDAD',
  'NOMBRE', 'NUM_DNI', 'NUM_DNI_MIN', 'OPT_VAR', 'SEXO',
  'SOPORTE', 'SOPORTE_MIN', 'VALIDEZ'
];

const CLASES = new Set(CLASES_DETECTOR);

// Caja del documento entero en cada cara. Es la misma comprobación que hace el editor antes de censurar
const DOCUMENTO_ANVERSO = 'DOC_DNI';
const DOCUMENTO_REVERSO = 'DOC_DNI_REV';

// La misma ruta que MODEL_PATH en dni_detector.jsx, que tampoco se exporta
const RUTA_MODELO = '/models/best.onnx';

export const MODELO_DESCONOCIDO = 'desconocido';
const ESPERA_MAXIMA_VERSION_MS = 3000;
const LARGO_MAXIMO_VERSION = 64;
const VERSION_VALIDA = /^[A-Za-z0-9._:+/=-]{1,64}$/;

let avisoClaseDesconocida = false;

/**
 * Convierte la cabecera ETag del modelo en un identificador corto de su versión.
 * Quita la marca de ETag débil (W/) y las comillas, deja solo los caracteres permitidos y corta a 64.
 * Si no queda nada devuelve 'desconocido'.
 * @param {string|null} etag
 * @returns {string}
 */
export function limpiarVersionModelo(etag) {
  if (typeof etag !== 'string') return MODELO_DESCONOCIDO;
  const version = etag
    .trim()
    .replace(/^W\//i, '')
    .replace(/"/g, '')
    .replace(/[^A-Za-z0-9._:+/=-]/g, '')
    .slice(0, LARGO_MAXIMO_VERSION);
  return version || MODELO_DESCONOCIDO;
}

async function pedirVersionModelo() {
  const controlador = typeof AbortController === 'function' ? new AbortController() : null;
  let temporizador;
  // Pase lo que pase con la petición, a los 3 s se sigue sin versión
  const tiempoAgotado = new Promise((resolver) => {
    temporizador = setTimeout(() => {
      controlador?.abort();
      resolver(null);
    }, ESPERA_MAXIMA_VERSION_MS);
  });
  try {
    const respuesta = await Promise.race([
      fetch(RUTA_MODELO, { method: 'HEAD', signal: controlador?.signal }),
      tiempoAgotado
    ]);
    return limpiarVersionModelo(respuesta?.ok ? respuesta.headers.get('etag') : null);
  } catch {
    return MODELO_DESCONOCIDO;
  } finally {
    clearTimeout(temporizador);
  }
}

let versionModelo = null;

/**
 * Versión del modelo de campos, sacada de la cabecera ETag de /models/best.onnx con una petición HEAD.
 * Si sale bien se pide una sola vez por carga de página, y nunca tarda más de 3 s. Se lanza al precargar el detector
 * y al empezar a procesar, sin esperarla, para que esté lista cuando se guarden las métricas.
 * No lanza errores. Si la petición falla o se agota el tiempo, la versión es 'desconocido'.
 * @returns {Promise<string>}
 */
export function obtenerVersionModelo() {
  if (!versionModelo) {
    const peticion = pedirVersionModelo();
    versionModelo = peticion;
    // Si no se pudo saber (por ejemplo, la precarga coincidió con la descarga del modelo en una red lenta),
    // la siguiente llamada lo intenta otra vez en lugar de quedarse con 'desconocido' toda la visita
    peticion.then((version) => {
      if (version === MODELO_DESCONOCIDO && versionModelo === peticion) versionModelo = null;
    });
  }
  return versionModelo;
}

// Confianza entre 0 y 1 con 3 decimales
const redondear = (confianza) => Math.round(Math.min(1, Math.max(0, confianza)) * 1000) / 1000;

function resumirCara(detecciones, claseDocumento, automatica) {
  const cajas = Array.isArray(detecciones) ? detecciones : [];
  // Siempre las 26 clases. null es que el detector no la encontró en esta cara
  const clases = Object.fromEntries(CLASES_DETECTOR.map((clase) => [clase, null]));

  for (const caja of cajas) {
    const clase = caja?.label;
    if (!CLASES.has(clase)) {
      // El backend la descartaría. Si pasa, la lista de arriba ya no coincide con la del detector
      if (!avisoClaseDesconocida) {
        avisoClaseDesconocida = true;
        console.warn(`[métricas] La clase ${clase} no está en la lista del detector y no se envía`);
      }
      continue;
    }
    if (!Number.isFinite(caja.confidence)) continue;
    const confianza = redondear(caja.confidence);
    if (clases[clase] === null || confianza > clases[clase]) {
      clases[clase] = confianza;
    }
  }

  return {
    caraDetectada: cajas.some((caja) => caja?.label === claseDocumento),
    automatica: automatica === true,
    detecciones: cajas.length,
    clases
  };
}

/**
 * Arma el campo «deteccion» del registro que se envía a /api/dni/save.
 * @param {Object} entrada
 * @param {Array<{label: string, confidence: number}>} entrada.anverso - Cajas que devolvió el detector en el anverso
 * @param {Array<{label: string, confidence: number}>|null} entrada.reverso - Lo mismo en el reverso, o null si no se subió
 * @param {boolean} entrada.anversoAutomatico - El anverso se censuró solo, sin pasar por la censura manual
 * @param {boolean} entrada.reversoAutomatico - Lo mismo con el reverso
 * @param {string} entrada.modelo - Versión del modelo (ver obtenerVersionModelo)
 * @returns {{modelo: string, anverso: Object, reverso: Object|null}}
 */
export function construirDeteccion({ anverso, reverso, anversoAutomatico, reversoAutomatico, modelo }) {
  return {
    modelo: typeof modelo === 'string' && VERSION_VALIDA.test(modelo) ? modelo : MODELO_DESCONOCIDO,
    anverso: resumirCara(anverso, DOCUMENTO_ANVERSO, anversoAutomatico),
    reverso: reverso == null ? null : resumirCara(reverso, DOCUMENTO_REVERSO, reversoAutomatico)
  };
}

/**
 * Selección de campos con todos los campos del editor, cada uno a true (se tapa) o false (se ve).
 * Los perfiles no traen CLI, lugar de nacimiento ni ventana del soporte, y sin esto esos campos no llegaban
 * en hiddenFields aunque se vieran.
 * @param {string[]} campos - Campos del editor en esa cara
 * @param {Object<string, boolean>} seleccion - Campos marcados para tapar
 * @returns {Object<string, boolean>}
 */
export function completarCampos(campos, seleccion) {
  return Object.fromEntries(campos.map((campo) => [campo, seleccion?.[campo] === true]));
}
