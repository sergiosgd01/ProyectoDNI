/**
 * Habla con el worker que ejecuta el modelo de detección (src/workers/detector.worker.js).
 *
 * El worker se crea la primera vez que hace falta y se queda para toda la visita, igual que antes la sesión
 * del modelo. Si el navegador no puede crearlo o se rompe, deja de usarse y la detección sigue en el hilo
 * principal como antes, solo que con la página parada mientras dura cada pasada.
 * Abriendo la web con ?sin-worker no se usa, para poder comparar.
 */

let worker = null;
let disponible = typeof Worker !== 'undefined'
  && !new URLSearchParams(window.location.search).has('sin-worker');
let siguienteId = 1;
// Peticiones que esperan respuesta, por su id
const pendientes = new Map();

const rechazarPendientes = (motivo) => {
  pendientes.forEach(({ reject }) => reject(new Error(motivo)));
  pendientes.clear();
};

const crearWorker = () => {
  const nuevo = new Worker(new URL('../workers/detector.worker.js', import.meta.url), { type: 'module' });
  nuevo.onmessage = ({ data }) => {
    const peticion = pendientes.get(data.id);
    if (!peticion) return;
    pendientes.delete(data.id);
    if (data.ok) peticion.resolve(data);
    else peticion.reject(new Error(data.error || 'El worker del detector ha fallado'));
  };
  // El archivo del worker no carga o el navegador no admite workers de tipo módulo
  nuevo.onerror = (evento) => {
    evento.preventDefault?.();
    desactivarWorker();
    rechazarPendientes(evento.message || 'No se pudo arrancar el worker del detector');
  };
  return nuevo;
};

const pedir = (mensaje, transferir = []) => new Promise((resolve, reject) => {
  if (!disponible) {
    reject(new Error('El worker del detector no está disponible'));
    return;
  }
  try {
    if (!worker) worker = crearWorker();
    const id = siguienteId++;
    pendientes.set(id, { resolve, reject });
    worker.postMessage({ ...mensaje, id }, transferir);
  } catch (error) {
    desactivarWorker();
    reject(error);
  }
});

/** Si la detección va a ir por el worker. Cuando es false, cada pasada para la página lo que tarda */
export const usarWorker = () => disponible;

/** Deja de usar el worker para el resto de la visita */
export const desactivarWorker = () => {
  disponible = false;
  if (worker) {
    worker.terminate();
    worker = null;
  }
};

/** Descarga y prepara el modelo dentro del worker */
export const cargarEnWorker = (modelo) => pedir({ tipo: 'cargar', modelo });

/**
 * Ejecuta el modelo sobre una entrada ya preparada. La entrada se entrega al worker sin copiarla,
 * así que después de llamar ya no se puede usar aquí.
 * @param {string} modelo - Ruta del modelo
 * @param {Float32Array} entrada - Datos del tensor de entrada
 * @param {number[]} forma - Dimensiones del tensor de entrada
 * @returns {Promise<{datos: Float32Array, forma: number[]}>} Salida del modelo
 */
export const ejecutarEnWorker = (modelo, entrada, forma) => pedir(
  { tipo: 'ejecutar', modelo, entrada, forma: Array.from(forma) },
  [entrada.buffer]
);
