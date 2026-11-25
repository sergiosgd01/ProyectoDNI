/**
 * Ejecuta el modelo de detección de campos fuera del hilo principal.
 *
 * Una pasada del modelo tarda unos 170 ms en un ordenador y entre 0,6 y 2 s en un móvil. En el hilo principal
 * la página se queda parada ese tiempo. Aquí la página sigue respondiendo mientras tanto.
 * Solo ejecuta el modelo. El lienzo se prepara antes y las cajas se sacan después en dni_detector.jsx,
 * que es donde está toda la lógica de la detección.
 *
 * Recibe { id, tipo, modelo } y, con tipo 'ejecutar', además { entrada, forma }.
 * Responde { id, ok: true } al cargar, { id, ok: true, datos, forma } al ejecutar o { id, ok: false, error }.
 */
import * as ort from 'onnxruntime-web';
// De dónde se descargan el cargador y el motor de ONNX Runtime, igual que en el hilo principal
import '../config/onnxConfig';

// Se guarda la promesa de carga, para que dos peticiones seguidas compartan la misma
let sesion = null;

/**
 * Deja ONNX Runtime en un hilo si su cargador no llega con la cabecera COEP (VEL-6).
 * Los hilos son workers que ONNX Runtime arranca con su cargador (el .mjs de onnxConfig.js), y con la página aislada el
 * navegador no los arranca si ese archivo llega sin COEP. Entonces ONNX Runtime no falla, se queda esperando sin fin,
 * y el 25/11/2026 «Procesar DNI» se quedó colgado con una copia del cargador guardada de antes de VEL-6. Se mira la
 * misma copia que usaría el navegador. Si falta la cabecera o no se puede mirar, un hilo, como antes de VEL-6
 */
const comprobarCargador = async () => {
  if (ort.env.wasm.numThreads <= 1) return;
  try {
    const respuesta = await fetch(ort.env.wasm.wasmPaths.mjs);
    respuesta.body?.cancel();
    if (respuesta.headers.get('cross-origin-embedder-policy') !== 'require-corp') ort.env.wasm.numThreads = 1;
  } catch {
    ort.env.wasm.numThreads = 1;
  }
};

const cargar = (modelo) => {
  if (!sesion) {
    sesion = comprobarCargador().then(() => ort.InferenceSession.create(modelo, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })).then((creada) => {
      // Cuántos hilos usa al final (VEL-6). Si el navegador no admite hilos, ONNX Runtime lo deja en uno.
      // Solo sale en local, porque la versión publicada quita los console.info
      console.info(`[detector.worker] ONNX Runtime con ${ort.env.wasm.numThreads} hilos`);
      return creada;
    }).catch((error) => {
      // Si falla, por ejemplo sin conexión, el siguiente intento vuelve a cargarlo
      sesion = null;
      throw error;
    });
  }
  return sesion;
};

const atender = async (data) => {
  const { id, tipo, modelo, unHilo } = data;
  try {
    // El hilo principal crea un worker con un solo hilo si el anterior falló con varios (VEL-6). Vale solo antes de
    // la primera carga, que es cuando ONNX Runtime prepara los hilos
    if (unHilo) ort.env.wasm.numThreads = 1;
    const cargada = await cargar(modelo);
    if (tipo === 'cargar') {
      self.postMessage({ id, ok: true });
      return;
    }

    const entrada = new ort.Tensor('float32', data.entrada, data.forma);
    const resultados = await cargada.run({ [cargada.inputNames[0]]: entrada });
    const salida = resultados[cargada.outputNames[0]];
    // La salida vuelve sin copiarla. Si no fuera dueña de toda su memoria, se copia antes
    const datos = salida.data.byteLength === salida.data.buffer.byteLength
      ? salida.data
      : new Float32Array(salida.data);
    self.postMessage({ id, ok: true, datos, forma: Array.from(salida.dims) }, [datos.buffer]);
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error?.message || error), hilos: ort.env.wasm.numThreads });
  }
};

// Las peticiones se atienden de una en una, porque una sesión no admite dos pasadas a la vez
let cola = Promise.resolve();
self.onmessage = ({ data }) => {
  cola = cola.then(() => atender(data));
};
