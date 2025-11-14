/**
 * Utilidad para censurar campos del DNI usando OpenCV
 * Esta función NO usa hooks de React y puede llamarse desde cualquier módulo
 */

// OCRHelpers - normalización y validación de datos
import * as OCRHelper from '../../utils/OCRhelpers';
import { TESSERACT_CONFIG } from '../../config/tesseractConfig';

// Atributos presentes en el DNI 4.0 (cara frontal)
export const POSICIONES = {
  nombre: [[0.38, 0.429, 0.703, 0.501]],
  apellidos: [
    [0.38, 0.292, 0.703, 0.35], // APELLIDO1
    [0.38, 0.345, 0.703, 0.411] // APELLIDO2
  ],
  dni: [
    [0.441, 0.166, 0.749, 0.271],
    [0.01, 0.19, 0.21, 0.235], //dni pequeño (bandero EU)
    [0.82, 0.67, 0.95, 0.71] // dni con foto
  ],
  sexo: [[0.397, 0.53, 0.45, 0.592]],
  nacionalidad: [[0.525, 0.528, 0.679, 0.591]],
  fechaExpedicion: [[0.389, 0.615, 0.592, 0.682]],
  fechaCaducidad: [[0.592, 0.615, 0.793, 0.682]],
  fechaNacimiento: [[0.775, 0.524, 0.985, 0.596]],
  numeroSoporte: [
    [0.392, 0.707, 0.585, 0.77], // numero de soporte
    [0.765, 0.175, 0.88, 0.25] //numero de soporte "ventana"
  ],
  can: [[0.778, 0.819, 0.99, 0.92]],
  firma: [[0.435, 0.78, 0.74, 0.89]],
};

// Atributos presentes en el DNI 4.0 (cara trasera)
export const POSICIONES_BACK = {
  mrz: [[0, 0.65, 1, 0.938]],
  domicilio: [[0.27, 0.07, 0.95, 0.13]],
  municipio: [
    [0.27, 0.123, 0.95, 0.18], // MUNICIPIO
    [0.27, 0.35, 0.9, 0.4]     // MUNICIPIO_N
  ],
  provincia: [
    [0.27, 0.171, 0.95, 0.228], // PROVINCIA
    [0.27, 0.39, 0.9, 0.452]    // PROVINCIA_N
  ],
  equipoExpedidor: [[0.035, 0.268, 0.08, 0.57]],
  progenitores: [[0.27, 0.52, 0.9, 0.6]]
};

// Mapeo de nombres de campos del backend al frontend
export const FIELD_MAPPING_FRONT = {
  nombre: 'nombre',
  apellidos: 'apellidos',
  dni: 'dni',
  fechaNacimiento: 'fechaNacimiento',
  sexo: 'sexo',
  nacionalidad: 'nacionalidad',
  fechaExpedicion: 'fechaExpedicion',
  fechaCaducidad: 'fechaCaducidad',
  numeroSoporte: 'numeroSoporte',
  can: 'can',
  firma: 'firma'
};

export const FIELD_MAPPING_BACK = {
  mrz: 'mrz',
  domicilio: 'domicilio',
  municipio: 'municipio',
  provincia: 'provincia',
  equipoExpedidor: 'equipoExpedidor',
  progenitores: 'progenitores'
};  



/**
 * Carga una imagen desde un File y devuelve un elemento Image
 * @param {File} file - Archivo de imagen
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Procesa una imagen del DNI y aplica censura a los campos especificados
 * @param {File} imageFile - Archivo de imagen a procesar
 * @param {Array<string>} fieldsToRedact - Lista de nombres de campos a censurar
 * @param {string} side - 'front' o 'back' para indicar qué lado del DNI
 * @returns {Promise<string>} URL de la imagen procesada (blob URL)
 */
export async function censorDniImage(imageFile, fieldsToRedact, side = 'front') {
  if (!window.cv) {
    throw new Error('OpenCV no está cargado');
  }

  const img = await loadImageFromFile(imageFile);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const src = window.cv.imread(tempCanvas);

  // Use correct positions and mappings based on side
  const posiciones = side === 'back' ? POSICIONES_BACK : POSICIONES;
  const fieldMapping = side === 'back' ? FIELD_MAPPING_BACK : FIELD_MAPPING_FRONT;

  fieldsToRedact.forEach((fieldName) => {
    const mappedField = fieldMapping[fieldName] || fieldName;
    const positions = posiciones[mappedField];

    if (!positions || positions.length === 0) {
      console.warn(`⚠️ Campo no encontrado: ${fieldName} (lado: ${side})`);
      return;
    }

    positions.forEach((position) => {
      try {
        const [x1, y1, x2, y2] = position;
        const px1 = Math.floor(x1 * src.cols);
        const py1 = Math.floor(y1 * src.rows);
        const px2 = Math.floor(x2 * src.cols);
        const py2 = Math.floor(y2 * src.rows);

        const pt1 = new cv.Point(px1, py1);
        const pt2 = new cv.Point(px2, py2);
        cv.rectangle(src, pt1, pt2, [0, 0, 0, 255], cv.FILLED);
      } catch (error) {
        console.error(`Error censurando ${fieldName}:`, error);
      }
    });
  });

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = src.cols;
  resultCanvas.height = src.rows;
  
  cv.imshow(resultCanvas, src);
  src.delete();

  return new Promise((resolve, reject) => {
    resultCanvas.toBlob(
      (blob) => blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('Error creando blob')),
      'image/jpeg',
      0.95
    );
  });
}

/**
 * Procesa ambas caras del DNI con campos separados
 * @param {File} frontFile - Imagen frontal
 * @param {File} backFile - Imagen trasera
 * @param {Object} fields - Campos a censurar separados por cara
 * @param {Object} fields.frontFields - Campos frontales a censurar
 * @param {Object} fields.backFields - Campos traseros a censurar
 * @returns {Promise<{frontImageUrl: string, backImageUrl: string}>}
 */
export async function censorDniComplete(frontFile, backFile, fields, options = {}) {
  const { precomputedOcr = null } = options;
  const frontFieldsToRedact = Object.entries(fields.frontFields || {})
    .filter(([, value]) => value === false)
    .map(([key]) => key);

  const backFieldsToRedact = Object.entries(fields.backFields || {})
    .filter(([, value]) => value === false)
    .map(([key]) => key);

  console.log('Censurando campos frontales:', frontFieldsToRedact);
  console.log('Censurando campos traseros:', backFieldsToRedact);

  const [frontImageUrl, backImageUrl] = await Promise.all([
    censorDniImage(frontFile, frontFieldsToRedact, 'front'),
    backFile ? censorDniImage(backFile, backFieldsToRedact, 'back') : Promise.resolve(null)
  ]);

  let ocrData = null;
  if (precomputedOcr) {
    ocrData = precomputedOcr;
    if (ocrData && (ocrData.front || ocrData.back)) {
      console.groupCollapsed('Datos RAW OCR (prevalidado):', ocrData);
    }
    console.groupEnd();
  } else {
    try {
      ocrData = await extractDniText(frontFile, backFile);
      if (ocrData && (ocrData.front || ocrData.back)) {
        console.groupCollapsed('Datos RAW OCR:', ocrData);
      }
      console.groupEnd();
    } catch (ocrError) {
      console.error('Error ejecutando OCR: ', ocrError);
    }
  }

  return {
    frontImageUrl,
    backImageUrl,
    processedFields: {
      front: frontFieldsToRedact,
      back: backFieldsToRedact
    },
    ocrData
  };
}

// Métodos necesarios para OCR, métodos "utils" y método principal

/**
 * Métodos utils
 * - getFieldPositions: localiza las coordenadas del campo en función del lado (front/back) usando los mapas de posiciones.
 * - createCanvasFromImage: genera un canvas HTML5 a partir de una imagen y dibuja la imagen completa sobre él.
 * - runOcrOnField: recorta una región rectangular del canvas y ejecuta OCR con Tesseract para obtener el texto.
 * - extractSideText: recibe un archivo de imagen y una lista de campos; para cada campo obtiene posiciones, recorta la región y aplica OCR, devolviendo {campo: texto}. 
 * Groso modo replica "los métodos" de censura pero en este caso en vez de realizar un recorte extrae el texto con OCR de cada 
 * elemento declarado del DNI para la extracción (FRONT_STATIC_FIELDS, BACK_STATIC_FIELDS)
 */

function getFieldPositions(fieldName, side = 'front') {
  const posiciones = side === 'back' ? POSICIONES_BACK : POSICIONES;
  const fieldMapping = side === 'back' ? FIELD_MAPPING_BACK : FIELD_MAPPING_FRONT;
  const mappedField = fieldMapping[fieldName] || fieldName;
  return posiciones[mappedField] || [];
}

function createCanvasFromImage(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return canvas;
}

async function runOcrOnField(worker, baseCanvas, rect) {
  const [x1, y1, x2, y2] = rect;
  const width = Math.max(x2 - x1, 1);
  const height = Math.max(y2 - y1, 1);

  const fieldCanvas = document.createElement('canvas');
  fieldCanvas.width = width;
  fieldCanvas.height = height;
  const ctx = fieldCanvas.getContext('2d');
  ctx.drawImage(baseCanvas, x1, y1, width, height, 0, 0, width, height);

  const { data } = await worker.recognize(fieldCanvas);
  const text = data?.text?.trim() || '';
  return text.replace(/\s+/g, ' ').trim();
}

// Extracción datos con OCR y normalización de datos
async function extractSideText(imageFile, fieldNames, side = 'front') {
  if (!imageFile || !fieldNames || fieldNames.length === 0) {
    return null;
  }

  const img = await loadImageFromFile(imageFile);
  const baseCanvas = createCanvasFromImage(img);
  let workerModule;
  try {
    workerModule = await import('tesseract.js');
  } catch (error) {
    console.error('✘ No se pudo cargar tesseract.js. Asegúrate de instalar la dependencia.', error);
    throw error;
  }

  const worker = await workerModule.createWorker(
    OCR_LANGUAGE,
    undefined,
    {
      workerPath: TESSERACT_CONFIG.workerPath,
      corePath: TESSERACT_CONFIG.corePath,
      langPath: TESSERACT_CONFIG.langPath,
    }
  );

  try {

    const results = {};
    for (const fieldName of fieldNames) {
      const positions = getFieldPositions(fieldName, side);
      if (!positions.length) {
        continue;
      }

      const texts = [];
      for (const position of positions) {
        const [x1, y1, x2, y2] = position;
        const px1 = Math.floor(x1 * baseCanvas.width);
        const py1 = Math.floor(y1 * baseCanvas.height);
        const px2 = Math.floor(x2 * baseCanvas.width);
        const py2 = Math.floor(y2 * baseCanvas.height);

        const text = await runOcrOnField(worker, baseCanvas, [px1, py1, px2, py2]);
        if (text) {
          texts.push(text);
        }
      }

      results[fieldName] = texts.length ? texts.join(' ').trim() : '';
    }

    return results;
  } finally {
    await worker.terminate();
  }
}

// Campos OCR (extraer)
const getFrontOcrFields = () => Object.keys(POSICIONES);
const getBackOcrFields = () => Object.keys(POSICIONES_BACK);
const OCR_LANGUAGE = 'spa';
 /* 
 * Método principal - extractDniTextStatic: función principal que aplica OCR al DNI.
 *   Procesa los campos del anverso y del reverso declarados,
 *   llamando a extractSideText y a los métodos utils para cada campo.
 *   Devuelve un objeto con los textos extraídos: { front: {...}, back: {...} }.
 */
export async function extractDniText(frontFile, backFile) {
  const frontFieldList = getFrontOcrFields();
  const backFieldList = getBackOcrFields();

  const frontRaw = frontFile && frontFieldList.length
    ? await extractSideText(frontFile, frontFieldList, 'front')
    : null;

  const backRaw = backFile && backFieldList.length
    ? await extractSideText(backFile, backFieldList, 'back')
    : null;

  return {
    front: frontRaw ? OCRHelper.normalizeDniData(frontRaw) : null,
    back: backRaw ? OCRHelper.normalizeDniData(backRaw) : null
  };
}
