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
// Tras un fallo con varios hilos el worker se cambia por otro con uno solo (VEL-6, ver probarSinHilos)
let unHilo = false;
// Peticiones que esperan respuesta, por su id
const pendientes = new Map();

const rechazarPendientes = (motivo, datos = {}) => {
  pendientes.forEach(({ reject }) => reject(Object.assign(new Error(motivo), datos)));
  pendientes.clear();
};

const crearWorker = () => {
  const nuevo = new Worker(new URL('../workers/detector.worker.js', import.meta.url), { type: 'module' });
  nuevo.onmessage = ({ data }) => {
    const peticion = pendientes.get(data.id);
    if (!peticion) return;
    pendientes.delete(data.id);
    if (data.ok) {
      peticion.resolve(data);
      return;
    }
    const error = new Error(data.error || 'El worker del detector ha fallado');
    // Con cuántos hilos estaba ONNX Runtime cuando falló
    error.hilos = data.hilos;
    peticion.reject(error);
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
    worker.postMessage({ ...mensaje, id, unHilo }, transferir);
  } catch (error) {
    desactivarWorker();
    reject(error);
  }
});

/**
 * Si el worker ha fallado con varios hilos (VEL-6), lo cambia por uno nuevo con un solo hilo, como antes de VEL-6,
 * y devuelve true. Así un navegador que no puede arrancar los hilos, por ejemplo por la memoria compartida, sigue
 * detectando fuera del hilo principal. Si ya iba con un hilo devuelve false y el fallo no era de los hilos
 * @param {Error} error - Error con el que ha fallado la petición al worker
 */
export const probarSinHilos = (error) => {
  // La petición se cortó porque el worker se cambiaba por uno con un hilo. También se repite en el nuevo
  if (error?.cambioDeWorker) return true;
  if (unHilo || !(error?.hilos > 1)) return false;
  unHilo = true;
  if (worker) {
    worker.terminate();
    worker = null;
  }
  rechazarPendientes('El worker del detector se cambia por uno con un solo hilo', { cambioDeWorker: true });
  return true;
};

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
