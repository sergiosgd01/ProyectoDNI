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

const cargar = (modelo) => {
  if (!sesion) {
    sesion = ort.InferenceSession.create(modelo, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    }).catch((error) => {
      // Si falla, por ejemplo sin conexión, el siguiente intento vuelve a cargarlo
      sesion = null;
      throw error;
    });
  }
  return sesion;
};

const atender = async (data) => {
  const { id, tipo, modelo } = data;
  try {
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
    self.postMessage({ id, ok: false, error: String(error?.message || error) });
  }
};

// Las peticiones se atienden de una en una, porque una sesión no admite dos pasadas a la vez
let cola = Promise.resolve();
self.onmessage = ({ data }) => {
  cola = cola.then(() => atender(data));
};
