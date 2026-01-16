import * as OCRHelper from '../../utils/OCRhelpers';
import { TESSERACT_CONFIG } from '../../config/tesseractConfig';

// Helper para cargar imagen
// const loadImageFromFile = (file) => new Promise((resolve, reject) => {
//   const img = new Image();
//   img.onload = () => resolve(img);
//   img.onerror = reject;
//   img.src = URL.createObjectURL(file);
// });
const loadImageFromFile = (file) => new Promise((resolve, reject) => {

  console.log("Archivo recibido:", file);
  if (!file) {
    reject(new Error("Archivo no válido para URL.createObjectURL"));
    return;
  }

  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = URL.createObjectURL(file);
});

/**
 * CENSURA: Usa detecciones de YOLO
 */
export async function censorDniImage(imageFile, fieldsToRedact, side = 'front', dynamicBoxes = null) {
  if (!window.cv) throw new Error('OpenCV no está cargado');

  const img = await loadImageFromFile(imageFile);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const src = window.cv.imread(tempCanvas);

  if (dynamicBoxes && dynamicBoxes.length > 0) {
    fieldsToRedact.forEach((fieldName) => {
      dynamicBoxes
        .filter(box => box.label.toUpperCase() === fieldName.toUpperCase())
        .forEach(box => {
          try {
            const pt1 = new cv.Point(Math.floor(box.x), Math.floor(box.y));
            const pt2 = new cv.Point(Math.floor(box.x + box.width), Math.floor(box.y + box.height));
            cv.rectangle(src, pt1, pt2, [0, 0, 0, 255], cv.FILLED);
          } catch (e) { console.error("Error al censurar campo:", fieldName, e); }
        });
    });
  }

  const resultCanvas = document.createElement('canvas');
  cv.imshow(resultCanvas, src);
  const url = resultCanvas.toDataURL('image/jpeg', 0.92);
  src.delete();
  return url;
}

/**
 * OCR: Extrae texto usando recortes de YOLO
 */
async function extractSideText(imageFile, fieldNames, dynamicBoxes) {
  if (!imageFile || !dynamicBoxes?.length) return null;
  
  const img = await loadImageFromFile(imageFile);
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = img.width;
  baseCanvas.height = img.height;
  baseCanvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);

  const { createWorker } = await import('tesseract.js');
  
  // Inicialización moderna
  const worker = await createWorker('spa', 1, {
    workerPath: TESSERACT_CONFIG.workerPath,
    corePath: TESSERACT_CONFIG.corePath,
    langPath: TESSERACT_CONFIG.langPath,
  });

  const results = {};
  try {
    for (const fieldName of fieldNames) {
      const regions = dynamicBoxes.filter(box => box.label.toUpperCase() === fieldName.toUpperCase());
      if (!regions.length) continue;

      const texts = [];
      for (const box of regions) {
        const text = await runOcrOnField(worker, baseCanvas, box);
        if (text) texts.push(text);
      }
      results[fieldName] = texts.join(' ').trim();
    }
    return results;
  } catch (err) {
    console.error("Error en extracción OCR:", err);
    return null;
  } finally {
    await worker.terminate();
  }
}

async function runOcrOnField(worker, baseCanvas, box) {
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const w = Math.min(baseCanvas.width - x, Math.floor(box.width));
  const h = Math.min(baseCanvas.height - y, Math.floor(box.height));

  const fieldCanvas = document.createElement('canvas');
  fieldCanvas.width = w;
  fieldCanvas.height = h;
  fieldCanvas.getContext('2d').drawImage(baseCanvas, x, y, w, h, 0, 0, w, h);

  const { data: { text } } = await worker.recognize(fieldCanvas);
  return text?.trim() || '';
}

export async function censorDniComplete(frontFile, backFile, fields, options = {}) {
  const { frontDetections = [], backDetections = [] } = options;

  /**
   * 1. CENSURA: Mapeo completo de clases YOLO
   * Convertimos las keys de la UI (ej: 'fechaNacimiento') a las clases de YOLO (ej: 'NACIMIENTO')
   * para que la función de censura encuentre las cajas.
   */
  const mapUiToYolo = {
    // ANVERSO
    nombre: 'NOMBRE',
    apellidos: 'APELLIDOS',
    dni: ['NUM_DNI','NUM_DNI_MIN'],
    fechaNacimiento: 'NACIMIENTO',
    sexo: 'SEXO',
    nacionalidad: 'NACIONALIDAD',
    fechaExpedicion: 'EMISIÓN',
    fechaCaducidad: 'VALIDEZ',
    numeroSoporte: ['SOPORTE', 'SOPORTE_MIN'],
    can: 'CAN',
    firma: 'FIRMA',
    cli: 'CLI',
    // REVERSO
    mrz: 'MRZ',
    domicilio: 'DIRECCION',
    municipio: 'DOMICILIO',
    lugarNacimiento: 'LUGAR_NACIMIENTO',
    equipoExpedidor: 'EQUIPO',
    progenitores: 'HIJO_DE',
    ventanaSoporte: 'SOPORTE_MIN'
  };

  const getLabelsToRedact = (selectedFields) => {
    return Object.entries(selectedFields)
      .filter(([_, visible]) => visible === true) 
      .flatMap(([key]) => mapUiToYolo[key] || [key.toUpperCase()]);
  };

  const frontToRedact = getLabelsToRedact(fields.frontFields || {});
  const backToRedact = getLabelsToRedact(fields.backFields || {});

  const [frontImageUrl, backImageUrl] = await Promise.all([
    censorDniImage(frontFile, frontToRedact, 'front', frontDetections),
    backFile ? censorDniImage(backFile, backToRedact, 'back', backDetections) : Promise.resolve(null)
  ]);

  /**
   * 2. OCR: Extracción selectiva
   * Solo pasamos por Tesseract las clases que contienen texto legible
   * para no desperdiciar recursos procesando imágenes (Firma/Foto).
   */
  const ocrLabels = [
    'NOMBRE', 'APELLIDOS', 'NUM_DNI', 'NACIMIENTO', 
    'NACIONALIDAD', 'NUM_SOPORTE', 'MRZ', 'DIRECCION'
  ];

  const [frontRaw, backRaw] = await Promise.all([
    extractSideText(frontFile, ocrLabels, frontDetections),
    backFile ? extractSideText(backFile, ocrLabels, backDetections) : Promise.resolve(null)
  ]);

  return {
    frontImageUrl,
    backImageUrl,
    processedFields: { front: frontToRedact, back: backToRedact },
    ocrData: {
      front: frontRaw ? OCRHelper.normalizeDniData(frontRaw) : null,
      back: backRaw ? OCRHelper.normalizeDniData(backRaw) : null
    }
  };
}