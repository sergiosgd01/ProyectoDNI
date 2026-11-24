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
 * Tapa en negro los rectángulos dados, en píxeles de la foto, y devuelve la imagen en JPEG como URL data:.
 * Es lo que usa el editor desde que decide qué tapar con planDeCara (utils/planCensura.js), que añade las copias de
 * cada dato y las zonas de la plantilla a las cajas del modelo
 */
export async function taparRectangulos(imageFile, rectangulos) {
  const cv = window.cv;
  if (!cv) throw new Error('OpenCV no está cargado');

  const img = await loadImageFromFile(imageFile);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  tempCanvas.getContext('2d').drawImage(img, 0, 0);

  const src = window.cv.imread(tempCanvas);
  for (const caja of rectangulos) {
    // Hacia fuera, para que un rectángulo con decimales no deje sin tapar la última fila o columna de píxeles
    const pt1 = new cv.Point(Math.max(0, Math.floor(caja.x)), Math.max(0, Math.floor(caja.y)));
    const pt2 = new cv.Point(Math.min(img.width - 1, Math.ceil(caja.x + caja.width)),
      Math.min(img.height - 1, Math.ceil(caja.y + caja.height)));
    if (pt2.x > pt1.x && pt2.y > pt1.y) cv.rectangle(src, pt1, pt2, [0, 0, 0, 255], cv.FILLED);
  }

  const resultCanvas = document.createElement('canvas');
  cv.imshow(resultCanvas, src);
  const url = resultCanvas.toDataURL('image/jpeg', 0.92);
  src.delete();
  return url;
}

/**
 * 1. CENSURA: Mapeo completo de clases YOLO
 * Convertimos las keys de la UI (ej: 'fechaNacimiento') a las clases de YOLO (ej: 'NACIMIENTO')
 * para que la función de censura encuentre las cajas.
 * Se exporta para que el editor compruebe antes de tapar solo que ha encontrado los campos que se tapan
 */
export const mapUiToYolo = {
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
  fotografia: 'FOTOGRAFIA',
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

export async function censorDniComplete(frontFile, backFile, fields, options = {}) {
  const { frontDetections = [], backDetections = [], cajas = null } = options;

  const getLabelsToRedact = (selectedFields) => {
    return Object.entries(selectedFields)
      .filter(([_, visible]) => visible === true) 
      .flatMap(([key]) => mapUiToYolo[key] || [key.toUpperCase()]);
  };

  const frontToRedact = getLabelsToRedact(fields.frontFields || {});
  const backToRedact = getLabelsToRedact(fields.backFields || {});

  // Con cajas, se tapan esos rectángulos ya decididos (planDeCara). Sin ellas, las cajas de las clases marcadas
  if (cajas) {
    const [frontImageUrl, backImageUrl] = await Promise.all([
      frontFile ? taparRectangulos(frontFile, cajas.front || []) : Promise.resolve(null),
      backFile ? taparRectangulos(backFile, cajas.back || []) : Promise.resolve(null)
    ]);
    return { frontImageUrl, backImageUrl, processedFields: { front: frontToRedact, back: backToRedact } };
  }

  // Cada cara se tapa una sola vez. La que llega sin foto (null) se salta, por ejemplo la que va a censura manual
  const [frontImageUrl, backImageUrl] = await Promise.all([
    frontFile ? censorDniImage(frontFile, frontToRedact, 'front', frontDetections) : Promise.resolve(null),
    backFile ? censorDniImage(backFile, backToRedact, 'back', backDetections) : Promise.resolve(null)
  ]);

  return {
    frontImageUrl,
    backImageUrl,
    processedFields: { front: frontToRedact, back: backToRedact }
  };
}