// Archivos de Tesseract (OCR) que el navegador descarga aparte del código de la web: el worker, el motor y los datos del español.
// Vite los copia tal cual desde node_modules a /assets con una huella en el nombre. Así salen de la propia web y no de un CDN ajeno,
// son siempre de la versión instalada y el navegador puede guardarlos un año (ver public/_headers).
import workerPath from 'tesseract.js/dist/worker.min.js?url';
import corePath from 'tesseract.js-core/tesseract-core-simd.wasm.js?url';
// Tesseract pide los datos del idioma como <langPath>/spa.traineddata.gz, con ese nombre exacto.
// Por eso este archivo lleva la huella en la carpeta y no en el nombre (ver assetFileNames en vite.config.js).
import spaTraineddataPath from '@tesseract.js-data/spa/4.0.0/spa.traineddata.gz?url';

export const TESSERACT_CONFIG = {
  workerPath,
  corePath,
  langPath: spaTraineddataPath.slice(0, spaTraineddataPath.lastIndexOf('/')),
};
