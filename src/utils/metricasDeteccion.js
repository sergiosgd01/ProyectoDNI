// Métricas de detección por campo (MET-1). Con ellas el backend estima con qué frecuencia falla cada campo.
// Por cada cara se envía si se encontró el documento, si se censuró sola, cuántas cajas devolvió el detector
// y la confianza máxima de cada clase. Desde MET-4 (23/11/2026) también si se colocó la plantilla del DNI y con
// qué error, qué cajas puso el modelo fuera de su sitio, qué clases se taparon con la plantilla y, en el reverso,
// si se pudo separar la calle del municipio y la provincia. Solo booleanos, enteros, confianzas y nombres de clase.
// Nunca cajas, posiciones, textos leídos ni nombres de archivo.

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

// Lista de clases sin repetir, solo las del detector y en su orden
const listaDeClases = (lista) => CLASES_DETECTOR.filter((clase) => Array.isArray(lista) && lista.includes(clase));

// Clases de las cajas que el modelo puso donde no van según la plantilla. Si algo falla, ninguna, porque las métricas
// no pueden romper la censura
function clasesFueraDeSitio(cajas, ajuste) {
  if (typeof ajuste?.enSuSitio !== 'function') return [];
  try {
    return cajas.filter((caja) => CLASES.has(caja?.label) && !ajuste.enSuSitio(caja)).map((caja) => caja.label);
  } catch {
    return [];
  }
}

/**
 * Lo que añade MET-4 a una cara, con valores seguros si falta algo. plantilla dice si se colocó y se usó para decidir qué
 * tapar. En una cara que va entera a censura manual (sin el documento o con pocas cajas) no se usa, aunque encaje, y se
 * manda como false. Sin plantilla no hay error ni listas.
 * Las cajas fuera de sitio se buscan entre todas las del detector, no solo entre las de los campos marcados, para que
 * el dato mida al modelo y no dependa de lo que eligió tapar cada persona.
 * @param {Array} cajas - Todas las cajas que devolvió el detector en la cara
 * @param {Object|null} [extra]
 * @param {{fiable: boolean, residuo?: number, enSuSitio?: Function}} [extra.ajuste] - La plantilla colocada
 *   (ajustarPlantilla)
 * @param {{modo?: string, rellenadas?: string[]}} [extra.plan] - El plan de la cara (planDeCara)
 * @param {boolean|null} [extra.domicilioPartido] - Solo en el reverso. null si no se intentó
 */
function resumirPlantilla(cajas, extra) {
  const { ajuste, plan, domicilioPartido } = extra ?? {};
  const colocada = ajuste?.fiable === true && plan?.modo !== 'manual';
  return {
    plantilla: colocada,
    errorPlantilla: colocada && Number.isFinite(ajuste.residuo) ? redondear(ajuste.residuo) : null,
    fueraDeSitio: colocada ? listaDeClases(clasesFueraDeSitio(cajas, ajuste)) : [],
    rellenadas: colocada ? listaDeClases(plan?.rellenadas) : [],
    domicilioPartido: typeof domicilioPartido === 'boolean' ? domicilioPartido : null
  };
}

function resumirCara(detecciones, claseDocumento, automatica, extra) {
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
    clases,
    ...resumirPlantilla(cajas, extra)
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
 * @param {Object|null} [entrada.anversoPlantilla] - { ajuste, plan } del anverso, para MET-4 (ver resumirPlantilla)
 * @param {Object|null} [entrada.reversoPlantilla] - { ajuste, plan, domicilioPartido } del reverso
 * @returns {{modelo: string, anverso: Object, reverso: Object|null}}
 */
export function construirDeteccion({
  anverso, reverso, anversoAutomatico, reversoAutomatico, modelo, anversoPlantilla, reversoPlantilla
}) {
  return {
    modelo: typeof modelo === 'string' && VERSION_VALIDA.test(modelo) ? modelo : MODELO_DESCONOCIDO,
    anverso: resumirCara(anverso, DOCUMENTO_ANVERSO, anversoAutomatico, { ...anversoPlantilla, domicilioPartido: null }),
    reverso: reverso == null ? null : resumirCara(reverso, DOCUMENTO_REVERSO, reversoAutomatico, reversoPlantilla)
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
