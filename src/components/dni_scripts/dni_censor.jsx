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
  const { frontDetections = [], backDetections = [] } = options;

  const getLabelsToRedact = (selectedFields) => {
    return Object.entries(selectedFields)
      .filter(([_, visible]) => visible === true) 
      .flatMap(([key]) => mapUiToYolo[key] || [key.toUpperCase()]);
  };

  const frontToRedact = getLabelsToRedact(fields.frontFields || {});
  const backToRedact = getLabelsToRedact(fields.backFields || {});

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