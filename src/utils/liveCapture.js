/**
 * Cálculos de la captura automática del DNI con la cámara.
 *
 * Todo ocurre en el navegador. Ningún fotograma sale del dispositivo, al servidor solo llega la foto final.
 * Los umbrales salen del catálogo sintético de dni-bench (14/11/2026) y hay que ajustarlos con
 * fotogramas de móviles reales. Abriendo la web con ?depurar-camara la cámara enseña los valores en directo.
 */

/** Calidad del fotograma, medida sobre el DNI (o el recuadro, si aún no se ha visto) reducido a ANALYSIS_WIDTH px de ancho */
export const QUALITY = {
  // Luz media de 0 a 255. Con poca luz (C03) da unos 60 y las fotos normales dan 118 o más
  minBrightness: 75,
  // Casi blanco del todo. La sobreexpuesta (C05) da unos 228 y la más clara de las normales 213
  maxBrightness: 235,
  // Varianza del laplaciano. En un Galaxy S24 Ultra el DNI bien colocado da de 190 a 380 según el fotograma,
  // mucho menos que las fotos del catálogo (900 o más) porque el vídeo va comprimido. Una foto desenfocada
  // del catálogo (D01) da unos 190, así que un umbral fijo no las separa. Por eso solo hay un mínimo muy bajo
  // y además se pide que la nitidez esté cerca de la mejor de los últimos SHARPNESS_WINDOW_MS, es decir, que el
  // enfoque ya se haya asentado. Como de un fotograma al siguiente oscila mucho sin que cambie nada (en ese móvil
  // el peor daba el 58 % del mejor), las dos cosas se miran sobre la mediana de los últimos SHARPNESS_SMOOTH
  // fotogramas y no sobre cada uno. Si los datos se leen lo dice el detector, en directo y en la foto final
  minSharpness: 120,
  sharpnessRatio: 0.7,
  // La foto se hace en un fotograma que esté al menos así de nítido respecto a esa mediana, no en uno de los flojos
  fireSharpnessRatio: 0.85,
  // Fracción de píxeles quemados. La sobreexpuesta (C05) da un 64 % y las normales un 5 % como mucho
  maxGlare: 0.12,
  // Diferencia media entre dos fotogramas seguidos, de 0 a 255, sobre una copia del recuadro de 50 px
  // de ancho. Quieto da 0, con el pulso de una mano de 2 a 4 y moviendo el DNI 20 px da unos 20
  maxMotion: 12,
  // Por encima de esto no es pulso, es que se ha movido el DNI o el móvil, y lo que vio el detector ya no vale
  strongMotion: 30,
};

/**
 * Posición del DNI respecto al recuadro y lectura de sus campos, según el detector.
 * Las cajas del detector varían hasta un 20 % entre fotogramas, sobre todo con fondos recargados,
 * así que el margen es amplio. Lo importante es que el DNI quede entero y con margen en la foto
 */
export const PLACEMENT = {
  // Ancho del DNI dividido por el ancho del recuadro
  minCoverage: 0.6,
  maxCoverage: 1.4,
  // Desvío máximo entre el centro del DNI y el del recuadro, en fracción del recuadro
  maxOffsetX: 0.22,
  maxOffsetY: 0.25,
  // Detecciones mínimas contando la del documento. El editor pide 15 y 6 para censurar solo, pero lo mira
  // en la foto final, que tiene más resolución que el vídeo. En directo el reverso de A01 se queda en 5
  minDetections: { anverso: 10, reverso: 5 },
};

/**
 * Detecciones que tiene que dar la foto ya recortada, contando la del documento, para darla por buena.
 *
 * No son las del editor (15 y 6 para censurar solo). El 16/11/2026 tres fotos nítidas del anverso hechas con la
 * cámara de un Galaxy S24 Ultra dieron 9, 10 y 11, y una foto normal del mismo DNI, hecha con la cámara del móvil,
 * 17 y 18. Con la misma foto normal reducida o desenfocada 3 px seguían saliendo 16 o 17, y con menos contraste 10.
 * El detector encuentra menos campos con la luz desigual y el poco contraste de las fotos del navegador, no por
 * falta de nitidez. Si se pidieran 15 y 6, la cámara repetiría sin fin fotos que se leen bien.
 * Aquí solo se descartan las fotos que no sirven (movidas o desenfocadas de verdad, que en el banco dan 4 y 2).
 * Si luego no llegan a 15 y 6, el editor pide tapar a mano lo que falte, igual que con una foto de la galería
 */
export const FINAL_MIN_DETECTIONS = { anverso: 8, reverso: 3 };

export const ANALYSIS_WIDTH = 400;

// Ritmo del análisis de cada fotograma, que para la página mientras dura. Entre el comienzo de uno y el del siguiente
// pasan al menos ANALYSIS_MIN_INTERVAL_MS y al menos el doble de lo que tarda, así el vídeo tiene la mitad del tiempo
// para pintarse. En un Xiaomi Poco X3 NFC cada análisis tardaba unos 150 ms y se hacían seguidos, y el vídeo iba a
// saltos. Nunca más de ANALYSIS_MAX_INTERVAL_MS, para poder seguir midiendo el pulso entre dos fotogramas
export const ANALYSIS_MIN_INTERVAL_MS = 80;
export const ANALYSIS_MAX_INTERVAL_MS = 450;

/**
 * Tiempo entre el comienzo de dos análisis seguidos
 * @param {number|null} averageAnalysisMs - Lo que tarda de media cada análisis, o null si aún no se sabe
 */
export function analysisInterval(averageAnalysisMs) {
  return Math.min(ANALYSIS_MAX_INTERVAL_MS, Math.max(ANALYSIS_MIN_INTERVAL_MS, 2 * (averageAnalysisMs || 0)));
}

// El modelo trabaja a 640 px, no sirve de nada pasarle más
export const DETECTOR_MAX_SIDE = 640;
// Margen alrededor del recuadro que ve el detector, para notar si el DNI se sale o está descentrado
export const DETECTION_MARGIN = 0.25;
// Margen del recorte cuando no se puede hacer la foto a resolución completa, para no cortar el borde del DNI.
// Se deja alrededor del recuadro y, si se sabe dónde está el DNI, también alrededor de él
export const CROP_MARGIN = 0.1;
export const CARD_CROP_MARGIN = 0.15;

export const HINTS = {
  loading: 'Preparando la detección del DNI',
  manual: 'Coloca el DNI dentro del recuadro y pulsa «Capturar foto»',
  place: 'Coloca el DNI dentro del recuadro',
  closer: 'Acerca el DNI a la cámara',
  farther: 'Aleja un poco el DNI',
  center: 'Centra el DNI en el recuadro',
  flipToFront: 'Esa es la parte trasera. Dale la vuelta al DNI',
  flipToBack: 'Esa es la parte delantera. Dale la vuelta al DNI',
  unreadable: 'No se leen bien los datos. Pon el DNI recto, sin reflejos y sin tapar nada',
  dark: 'Hay poca luz. Busca un sitio más iluminado',
  glare: 'Hay reflejos. Inclina un poco el DNI o apártalo de la luz',
  moving: 'No te muevas',
  blurry: 'Enfocando. Mantén el DNI quieto',
  hold: 'Muy bien, no te muevas',
  capturing: 'Haciendo la foto, no te muevas',
  retryBlurry: 'En la foto no se leen bien los datos. Vamos a repetirla',
  retryNoDocument: 'En la foto no se reconoce el DNI. Vamos a repetirla',
};

/**
 * Traduce el recuadro guía de la pantalla a píxeles del vídeo. Tiene en cuenta object-fit, porque en el
 * móvil el vídeo va con cover (se recorta para llenar la pantalla) y en el ordenador con contain (deja bandas).
 * @returns {{x: number, y: number, width: number, height: number} | null}
 */
export function guideRectInVideo(video, guide) {
  const videoWidth = video?.videoWidth;
  const videoHeight = video?.videoHeight;
  if (!videoWidth || !videoHeight || !guide) return null;

  const box = video.getBoundingClientRect();
  const guideBox = guide.getBoundingClientRect();
  if (!box.width || !box.height || !guideBox.width || !guideBox.height) return null;

  const fit = window.getComputedStyle(video).objectFit;
  let scaleX;
  let scaleY;
  if (fit === 'fill') {
    scaleX = box.width / videoWidth;
    scaleY = box.height / videoHeight;
  } else {
    const scale = fit === 'cover'
      ? Math.max(box.width / videoWidth, box.height / videoHeight)
      : Math.min(box.width / videoWidth, box.height / videoHeight);
    scaleX = scale;
    scaleY = scale;
  }

  // El vídeo va centrado dentro de su caja (object-position por defecto)
  const offsetX = (box.width - videoWidth * scaleX) / 2;
  const offsetY = (box.height - videoHeight * scaleY) / 2;

  return {
    x: (guideBox.left - box.left - offsetX) / scaleX,
    y: (guideBox.top - box.top - offsetY) / scaleY,
    width: guideBox.width / scaleX,
    height: guideBox.height / scaleY,
  };
}

/**
 * Agranda el rectángulo por cada lado en la fracción indicada (con un valor negativo lo achica)
 * y lo ajusta a los bordes del vídeo.
 */
export function expandRect(rect, margin, maxWidth, maxHeight) {
  const dx = rect.width * margin;
  const dy = rect.height * margin;
  const x = Math.max(0, rect.x - dx);
  const y = Math.max(0, rect.y - dy);
  const right = Math.min(maxWidth, rect.x + rect.width + dx);
  const bottom = Math.min(maxHeight, rect.y + rect.height + dy);
  if (right - x < 2 || bottom - y < 2) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Mide luz, nitidez, reflejos y movimiento de un fotograma.
 * @param {ImageData} imageData - Zona del recuadro ya reducida
 * @param {Float32Array|null} previousSmall - Versión pequeña del fotograma anterior, para el movimiento
 */
export function measureFrame(imageData, previousSmall = null) {
  const { data, width, height } = imageData;
  const pixels = width * height;
  const gray = new Float32Array(pixels);
  let sum = 0;
  let burnt = 0;

  for (let i = 0, p = 0; p < pixels; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[p] = y;
    sum += y;
    if (r > 245 && g > 245 && b > 245) burnt++;
  }

  // Nitidez: varianza del laplaciano. Una imagen movida o desenfocada tiene pocos bordes marcados
  let lapSum = 0;
  let lapSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = row + x;
      const v = gray[p - width] + gray[p + width] + gray[p - 1] + gray[p + 1] - 4 * gray[p];
      lapSum += v;
      lapSquares += v * v;
      count++;
    }
  }
  const lapMean = count ? lapSum / count : 0;
  const sharpness = count ? lapSquares / count - lapMean * lapMean : 0;

  // Versión 4 veces más pequeña para comparar con el fotograma anterior sin que cuente el ruido
  const smallWidth = Math.floor(width / 4);
  const smallHeight = Math.floor(height / 4);
  const small = new Float32Array(smallWidth * smallHeight);
  for (let by = 0; by < smallHeight; by++) {
    for (let bx = 0; bx < smallWidth; bx++) {
      let block = 0;
      for (let dy = 0; dy < 4; dy++) {
        const start = (by * 4 + dy) * width + bx * 4;
        block += gray[start] + gray[start + 1] + gray[start + 2] + gray[start + 3];
      }
      small[by * smallWidth + bx] = block / 16;
    }
  }

  // Al moverse el DNI unas zonas se aclaran y otras se oscurecen. Si cambia la luz de todo el fotograma a la vez,
  // por ejemplo cuando la cámara ajusta la exposición, no es movimiento, así que ese cambio común se descuenta
  let motion = null;
  if (previousSmall && previousSmall.length === small.length && small.length > 0) {
    let shift = 0;
    for (let i = 0; i < small.length; i++) {
      shift += small[i] - previousSmall[i];
    }
    shift /= small.length;
    let difference = 0;
    for (let i = 0; i < small.length; i++) {
      difference += Math.abs(small[i] - previousSmall[i] - shift);
    }
    motion = difference / small.length;
  }

  return {
    brightness: pixels ? sum / pixels : 0,
    sharpness,
    glare: pixels ? burnt / pixels : 0,
    motion,
    small,
  };
}

// Campos que solo están en una cara. Sirven para saber qué cara es cuando el detector no ve el documento
const FRONT_FIELDS = new Set(['FOTOGRAFIA', 'APELLIDOS', 'NOMBRE', 'FIRMA', 'CAN', 'VALIDEZ']);
const BACK_FIELDS = new Set(['MRZ', 'DOMICILIO', 'LUGAR_NACIMIENTO', 'HIJO_DE', 'EQUIPO']);
// Campos mínimos para dar por encontrado el DNI aunque el detector no vea el documento
const MIN_FIELDS_WITHOUT_DOCUMENT = 4;
// Parte del ancho del DNI que ocupan sus campos. Sirve para estimar el tamaño del DNI a partir de ellos
const FIELDS_WIDTH_RATIO = 0.88;

/**
 * Decide si el DNI está bien colocado a partir de lo que ve el detector.
 *
 * La caja del documento (DOC_DNI o DOC_DNI_REV) solo se usa para saber qué cara es. En fotogramas sin
 * recortar sale hasta un 45 % más grande que el DNI, porque el modelo se entrenó con el DNI ya recortado,
 * y a veces ni aparece. La posición y el tamaño se calculan con los campos, que sí son precisos.
 *
 * @param {Array} boxes - Detecciones, en píxeles del lienzo que se le pasó al detector
 * @param {object} view - Zona del vídeo dibujada en ese lienzo (region), escala lienzo/vídeo (scale),
 *   tamaño del lienzo (canvasWidth, canvasHeight) y recuadro guía en píxeles del vídeo (guide)
 * @param {'anverso'|'reverso'|null} expectedSide - Cara que se está pidiendo, o null si da igual
 */
export function evaluatePlacement(boxes, view, expectedSide = null) {
  const documents = boxes.filter((box) => box.label === 'DOC_DNI' || box.label === 'DOC_DNI_REV');
  const doc = documents.length
    ? documents.reduce((best, box) => (box.confidence > best.confidence ? box : best))
    : null;

  // Campos del DNI. Con documento, los que caen dentro de él, para no contar nada del fondo
  const fields = boxes.filter((box) => {
    if (box.label.startsWith('DOC_')) return false;
    if (!doc) return true;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    return cx >= doc.x && cx <= doc.x + doc.width && cy >= doc.y && cy <= doc.y + doc.height;
  });

  if (!doc && fields.length < MIN_FIELDS_WITHOUT_DOCUMENT) {
    return { found: false, ok: false, hint: HINTS.place, boxes: boxes.length };
  }

  let side;
  if (doc) {
    side = doc.label === 'DOC_DNI' ? 'anverso' : 'reverso';
  } else {
    const front = fields.filter((box) => FRONT_FIELDS.has(box.label)).length;
    const back = fields.filter((box) => BACK_FIELDS.has(box.label)).length;
    if (front === back) {
      return { found: false, ok: false, hint: HINTS.place, boxes: boxes.length };
    }
    side = front > back ? 'anverso' : 'reverso';
  }

  // Zona que ocupan los campos, en píxeles del lienzo. Si hay pocos, se usa la del documento
  const area = fields.length >= 3
    ? fields.reduce((acc, box) => ({
      left: Math.min(acc.left, box.x),
      top: Math.min(acc.top, box.y),
      right: Math.max(acc.right, box.x + box.width),
      bottom: Math.max(acc.bottom, box.y + box.height),
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity })
    : { left: doc.x, top: doc.y, right: doc.x + doc.width, bottom: doc.y + doc.height };

  const { region, scale, canvasWidth, canvasHeight, guide } = view;
  const areaX = region.x + area.left / scale;
  const areaY = region.y + area.top / scale;
  const areaWidth = (area.right - area.left) / scale;
  const areaHeight = (area.bottom - area.top) / scale;

  const coverage = fields.length >= 3 ? areaWidth / FIELDS_WIDTH_RATIO / guide.width : areaWidth / guide.width;
  const offsetX = (areaX + areaWidth / 2 - (guide.x + guide.width / 2)) / guide.width;
  const offsetY = (areaY + areaHeight / 2 - (guide.y + guide.height / 2)) / guide.height;

  // Si los campos tocan el borde de lo que ve el detector, una parte del DNI se queda fuera
  const edge = 3;
  const touchesEdge = area.left <= edge || area.top <= edge
    || area.right >= canvasWidth - edge || area.bottom >= canvasHeight - edge;

  // Detecciones como las cuenta el editor, contando el documento si se ve
  const detections = fields.length + (doc ? 1 : 0);

  const result = {
    found: true,
    ok: false,
    side,
    coverage,
    offsetX,
    offsetY,
    detections,
    boxes: boxes.length,
    documentConfidence: doc ? doc.confidence : null,
    // Para medir la calidad sobre el DNI y no sobre el fondo que quede dentro del recuadro
    docRect: { x: areaX, y: areaY, width: areaWidth, height: areaHeight },
  };

  if (expectedSide && side !== expectedSide) {
    return { ...result, reason: 'side', hint: side === 'reverso' ? HINTS.flipToFront : HINTS.flipToBack };
  }
  if (touchesEdge) {
    return { ...result, reason: 'edge', hint: coverage < PLACEMENT.minCoverage ? HINTS.center : HINTS.farther };
  }
  if (coverage > PLACEMENT.maxCoverage) {
    return { ...result, reason: 'size', hint: HINTS.farther };
  }
  if (coverage < PLACEMENT.minCoverage) {
    return { ...result, reason: 'size', hint: HINTS.closer };
  }
  if (Math.abs(offsetX) > PLACEMENT.maxOffsetX || Math.abs(offsetY) > PLACEMENT.maxOffsetY) {
    return { ...result, reason: 'center', hint: HINTS.center };
  }
  if (detections < PLACEMENT.minDetections[side]) {
    return { ...result, reason: 'fields', hint: HINTS.unreadable };
  }
  return { ...result, ok: true, reason: null, hint: null };
}

// Ventana en la que se busca la mejor nitidez para comparar
export const SHARPNESS_WINDOW_MS = 1500;
// Fotogramas sobre los que se calcula la mediana de la nitidez
export const SHARPNESS_SMOOTH = 5;

/** Mediana de una lista de números. Con la lista vacía devuelve 0 */
export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Primer aviso de calidad de la imagen que falla, o null si se ve bien. El movimiento va aparte.
 * @param {object} metrics - Lo que devuelve measureFrame
 * @param {number} sharpness - Mediana de la nitidez de los últimos fotogramas
 * @param {number} bestSharpness - La mediana más alta de los últimos SHARPNESS_WINDOW_MS
 */
export function imageQualityHint(metrics, sharpness, bestSharpness = 0) {
  if (metrics.brightness < QUALITY.minBrightness) return HINTS.dark;
  if (metrics.glare > QUALITY.maxGlare || metrics.brightness > QUALITY.maxBrightness) return HINTS.glare;
  if (sharpness < QUALITY.minSharpness) return HINTS.blurry;
  if (sharpness < bestSharpness * QUALITY.sharpnessRatio) return HINTS.blurry;
  return null;
}

/**
 * Zona del fotograma que se sube cuando no se puede hacer la foto a resolución completa: el recuadro con margen
 * y, si se sabe dónde está el DNI, también el DNI con margen. La captura da por bueno un DNI algo más grande que
 * el recuadro o algo descentrado, y sin esto la foto salía con el borde del DNI cortado.
 * @param {object} guideRect - Recuadro guía en píxeles del vídeo
 * @param {object|null} cardRect - Zona del DNI según el detector, en píxeles del vídeo, o null si no se sabe
 */
export function captureArea(guideRect, cardRect, videoWidth, videoHeight) {
  const guideArea = expandRect(guideRect, CROP_MARGIN, videoWidth, videoHeight);
  const cardArea = cardRect ? expandRect(cardRect, CARD_CROP_MARGIN, videoWidth, videoHeight) : null;
  if (!guideArea || !cardArea) return guideArea || cardArea;
  const x = Math.min(guideArea.x, cardArea.x);
  const y = Math.min(guideArea.y, cardArea.y);
  const right = Math.max(guideArea.x + guideArea.width, cardArea.x + cardArea.width);
  const bottom = Math.max(guideArea.y + guideArea.height, cardArea.y + cardArea.height);
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Pasa un rectángulo de píxeles del vídeo a píxeles de la foto hecha con ImageCapture. El vídeo es la parte central
 * de la foto, a la misma escala en los dos ejes. En un Galaxy S24 Ultra la foto es 3:4 y el vídeo 9:16, así que el
 * vídeo es la franja central de la foto. Con la misma proporción, como en un Xiaomi Poco X3 NFC, solo cambia la escala
 */
export function videoRectInPhoto(rect, videoWidth, videoHeight, photoWidth, photoHeight) {
  const scale = Math.min(photoWidth / videoWidth, photoHeight / videoHeight);
  const offsetX = (photoWidth - videoWidth * scale) / 2;
  const offsetY = (photoHeight - videoHeight * scale) / 2;
  return {
    x: rect.x * scale + offsetX,
    y: rect.y * scale + offsetY,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

/**
 * Giro de la pantalla en grados: 0 en vertical, 90 con la parte de arriba del móvil a la izquierda y 270 a la derecha.
 * Safari en el iPhone lo da en screen.orientation desde iOS 16.4 y, antes, solo en window.orientation (90 y -90)
 */
export function screenAngle() {
  const angle = Number(window.screen?.orientation?.angle ?? window.orientation ?? 0) || 0;
  return ((angle % 360) + 360) % 360;
}

/**
 * Cuánto hay que girar la foto hecha con ImageCapture para que quede como se ve el vídeo, en grados en sentido
 * contrario a las agujas del reloj (0, 90 o 270).
 *
 * En el iPhone, con el móvil tumbado, Safari entrega el vídeo tumbado pero la foto de pie, como si el móvil siguiera en
 * vertical, así que el DNI sale de lado y el servidor no lo encuentra. Comprobado el 20/11/2026: con la parte de arriba
 * del móvil a la izquierda (screen.orientation.angle 90) el DNI salía girado un cuarto de vuelta a la derecha.
 * Solo se gira cuando la foto y el vídeo no tienen la misma orientación. Si la tienen, como en Android, se deja igual.
 *
 * @param {object} medidas
 * @param {number} medidas.photoWidth - Ancho de la foto tal como la enseña el navegador
 * @param {number} medidas.photoHeight
 * @param {number} medidas.videoWidth - videoWidth del vídeo de la cámara
 * @param {number} medidas.videoHeight
 * @param {number} medidas.screenAngle - Giro de la pantalla ahora: 0 en vertical, 90 con la parte de arriba del móvil a
 *   la izquierda y 270 a la derecha (screen.orientation.angle)
 * @param {number} [medidas.openingAngle] - Giro de la pantalla al abrir la cámara. Si la foto sale tumbada con el
 *   vídeo de pie, se supone que se ve derecha con este giro
 * @returns {0|90|270}
 */
export function photoRotation({ photoWidth, photoHeight, videoWidth, videoHeight, screenAngle, openingAngle }) {
  if (!photoWidth || !photoHeight || !videoWidth || !videoHeight) return 0;
  if (photoWidth === photoHeight || videoWidth === videoHeight) return 0;
  const photoLandscape = photoWidth > photoHeight;
  if (photoLandscape === videoWidth > videoHeight) return 0;
  // Giro con el que la foto se vería derecha. De pie, en vertical. Tumbada, con el que se abrió la cámara
  const photoAngle = !photoLandscape ? 0 : (openingAngle === 90 || openingAngle === 270 ? openingAngle : 90);
  const rotation = ((((screenAngle || 0) - photoAngle) % 360) + 360) % 360;
  // Si foto y vídeo no coinciden el giro es de un cuarto de vuelta. Si el ángulo de la pantalla no lo dice, por
  // ejemplo porque el navegador no lo da, se toma el que se vio en el iPhone
  return rotation === 90 || rotation === 270 ? rotation : 90;
}

// La foto de ImageCapture se usa salvo que el fotograma del vídeo se vea claramente más nítido. En un Xiaomi Poco X3
// NFC la foto salía borrosa aunque el vídeo se viera nítido. Si la foto sale bien, como en un Galaxy S24 Ultra, es
// mejor que el fotograma porque tiene más resolución y menos ruido
export const PHOTO_SHARPNESS_MARGIN = 1.5;

/**
 * Qué se sube, la foto o el fotograma del vídeo, según la nitidez de cada una sobre el DNI a la misma escala
 * @returns {'foto'|'video'}
 */
export function sharperCapture(photoSharpness, frameSharpness) {
  if (!(frameSharpness > 0)) return 'foto';
  if (!(photoSharpness > 0)) return 'video';
  return frameSharpness > photoSharpness * PHOTO_SHARPNESS_MARGIN ? 'video' : 'foto';
}

/**
 * Mira si la foto ya recortada sirve: tiene que verse el documento de esa cara y dar al menos
 * FINAL_MIN_DETECTIONS detecciones.
 * @param {Array} boxes - Detecciones sobre la foto recortada
 * @param {'anverso'|'reverso'|null} expectedSide - Cara que se pedía, o null si valía cualquiera
 * @returns {{ok: boolean, detections: number, reason: 'side'|'document'|'fields'|null, hint: string|null}}
 */
export function checkFinalPhoto(boxes, expectedSide = null) {
  const best = (label) => boxes
    .filter((box) => box.label === label)
    .reduce((top, box) => (!top || box.confidence > top.confidence ? box : top), null);
  const front = best('DOC_DNI');
  const back = best('DOC_DNI_REV');
  const detections = boxes.length;

  let side = expectedSide;
  if (!side) {
    if (!front && !back) return { ok: false, detections, reason: 'document', hint: HINTS.retryNoDocument };
    side = !back || (front && front.confidence >= back.confidence) ? 'anverso' : 'reverso';
  }

  const wanted = side === 'anverso' ? front : back;
  const other = side === 'anverso' ? back : front;
  if (!wanted) {
    if (other) {
      return { ok: false, detections, reason: 'side', hint: side === 'anverso' ? HINTS.flipToFront : HINTS.flipToBack };
    }
    return { ok: false, detections, reason: 'document', hint: HINTS.retryNoDocument };
  }
  if (detections < FINAL_MIN_DETECTIONS[side]) {
    return { ok: false, detections, reason: 'fields', hint: HINTS.retryBlurry };
  }
  return { ok: true, detections, reason: null, hint: null };
}
