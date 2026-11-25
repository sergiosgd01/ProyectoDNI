// Archivos de ONNX Runtime que el navegador descarga aparte del código de la web: el cargador (.mjs) y el motor (.wasm).
// Vite los copia tal cual desde node_modules a /assets con una huella en el nombre. Así salen de la propia web y no de un CDN ajeno,
// son siempre de la versión instalada y el navegador puede guardarlos un año (ver public/_headers).
// El cargador se publica con extensión .js (ver assetFileNames en vite.config.js).
// Basta con importar este archivo antes de crear la sesión de ONNX Runtime, como hace dni_detector.jsx.
import * as ort from 'onnxruntime-web';
import mjs from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url';
import wasm from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';

ort.env.wasm.wasmPaths = { mjs, wasm };
