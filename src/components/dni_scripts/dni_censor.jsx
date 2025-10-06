/**
 * Utilidad para censurar campos del DNI usando OpenCV
 * Esta función NO usa hooks de React y puede llamarse desde cualquier módulo
 */

export const POSICIONES = {
  nombre: [0.38, 0.429, 0.703, 0.501],
  apellidos: [0.38, 0.292, 0.703, 0.411], // Combinación de APELLIDO1 y APELLIDO2
  dni: [0.441, 0.166, 0.749, 0.271],
  sexo: [0.397, 0.53, 0.45, 0.592],
  nacionalidad: [0.525, 0.528, 0.679, 0.591],
  numeroSoporte: [0.392, 0.707, 0.585, 0.77],
  fechaExpedicion: [0.389, 0.615, 0.592, 0.682],
  fechaCaducidad: [0.592, 0.615, 0.793, 0.682],
  fechaNacimiento: [0.775, 0.524, 0.985, 0.596],
  can: [0.775, 0.707, 0.985, 0.77]
};

// Posiciones para el reverso del DNI
const POSICIONES_BACK = {
  mrz: [0, 0.65, 1, 0.938], 
  domicilio: [0.27, 0.07, 0.95, 0.13],
  municipio: [0.27, 0.123, 0.95, 0.18],
  equipoExpedidor: [0.035, 0.268, 0.08, 0.57],
  provincia: [0.27, 0.171, 0.95, 0.228]
};

// Mapeo de nombres de campos del backend al frontend
const FIELD_MAPPING_FRONT = {
  nombre: 'nombre',
  apellidos: 'apellidos',
  dni: 'dni',
  sexo: 'sexo',
  nacionalidad: 'nacionalidad',
  numeroSoporte: 'numeroSoporte',
  fechaExpedicion: 'fechaExpedicion',
  fechaCaducidad: 'fechaCaducidad',
  fechaNacimiento: 'fechaNacimiento',
  can: 'can'
};

const FIELD_MAPPING_BACK = {
  mrz: 'mrz',
  domicilio: 'domicilio',
  municipio: 'municipio',
  provincia: 'provincia',
  equipoExpedidor: 'equipoExpedidor'
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
    const position = posiciones[mappedField];

    if (!position) {
      console.warn(`⚠️ Campo no encontrado: ${fieldName} (lado: ${side})`);
      return;
    }

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
export async function censorDniComplete(frontFile, backFile, fields) {
  const frontFieldsToRedact = Object.entries(fields.frontFields || {})
    .filter(([, value]) => value === true)
    .map(([key]) => key);

  const backFieldsToRedact = Object.entries(fields.backFields || {})
    .filter(([, value]) => value === true)
    .map(([key]) => key);

  console.log('📝 Censurando campos frontales:', frontFieldsToRedact);
  console.log('📝 Censurando campos traseros:', backFieldsToRedact);

  const [frontImageUrl, backImageUrl] = await Promise.all([
    censorDniImage(frontFile, frontFieldsToRedact, 'front'),
    backFile ? censorDniImage(backFile, backFieldsToRedact, 'back') : Promise.resolve(null)
  ]);

  return {
    frontImageUrl,
    backImageUrl,
    processedFields: {
      front: frontFieldsToRedact,
      back: backFieldsToRedact
    }
  };
}