// Archivos de ONNX Runtime que el navegador descarga aparte del código de la web: el cargador (.mjs) y el motor (.wasm).
// Vite los copia tal cual desde node_modules a /assets con una huella en el nombre. Así salen de la propia web y no de un CDN ajeno,
// son siempre de la versión instalada y el navegador puede guardarlos un año (ver public/_headers).
// El cargador se publica con extensión .js (ver assetFileNames en vite.config.js).
// Basta con importar este archivo antes de crear la sesión de ONNX Runtime, como hace dni_detector.jsx.
import * as ort from 'onnxruntime-web';
import mjs from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url';
import wasm from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';

ort.env.wasm.wasmPaths = { mjs, wasm };

// Hilos del motor (VEL-6). Con la página aislada de otros dominios (crossOriginIsolated, lo que consiguen las cabeceras
// COOP y COEP de public/_headers), ONNX Runtime reparte cada pasada del modelo entre varios hilos, que son workers que
// crea él mismo. En un Mac una pasada del modelo de campos baja de 160 a 49 ms con 4 hilos.
// Se usan solo dentro del worker del detector (src/workers/detector.worker.js) y si ese worker puede crear otros.
// Son los mismos que pondría ONNX Runtime por su cuenta, la mitad de los núcleos y 4 como mucho.
// En el hilo principal, que es el respaldo cuando el worker falla, se queda en un hilo como antes, para que el
// respaldo no dependa de los hilos.
// Un worker no tiene document
const enWorker = typeof document === 'undefined';
ort.env.wasm.numThreads = enWorker && self.crossOriginIsolated && typeof Worker !== 'undefined'
  ? Math.min(4, Math.ceil((navigator.hardwareConcurrency || 1) / 2))
  : 1;
