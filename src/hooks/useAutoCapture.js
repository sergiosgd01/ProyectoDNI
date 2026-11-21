import { useEffect, useRef, useState } from 'react';
import { detectDniFromCanvas, preloadDetector } from '../components/dni_scripts/dni_detector';
import { usarWorker } from '../utils/detectorWorker';
import {
  ANALYSIS_WIDTH,
  DETECTION_MARGIN,
  DETECTOR_MAX_SIDE,
  HINTS,
  QUALITY,
  SHARPNESS_SMOOTH,
  SHARPNESS_WINDOW_MS,
  analysisInterval,
  clampRect,
  evaluatePlacement,
  expandRect,
  guideRectInVideo,
  imageQualityHint,
  measureFrame,
  median,
  screenAngle,
} from '../utils/liveCapture';

// Ancho de la copia del recuadro con la que se mide el movimiento
const MOTION_WIDTH = 200;
// El vídeo se lee con createImageBitmap y no dibujándolo en un lienzo. En un Xiaomi Poco X3 NFC dibujar el vídeo 4K en
// un lienzo costaba unos 100 ms cada vez y se hacía dos veces por análisis, y el vídeo iba a saltos. Con bitmaps, unos
// 40 ms en total. Se piden dos: la zona del detector a su tamaño, para el movimiento y el detector, y la zona donde se
// mide la calidad ya a ANALYSIS_WIDTH px. Si esta se sacara de la primera, la nitidez saldría un 20-40 % más baja que
// leyendo el vídeo directamente, y los umbrales de QUALITY dejarían de valer
// Separación habitual entre dos fotogramas analizados. El movimiento se pasa a esta escala, para que valga
// lo mismo en un móvil que analiza 10 fotogramas por segundo que en uno que solo llega a 5
const MOTION_REFERENCE_MS = 100;
// Si entre dos fotogramas pasa más que esto, no se sabe si la diferencia es pulso o es que se ha movido el DNI.
// Un móvil lento puede tardar más de 300 ms entre fotogramas, y sin medir el movimiento la foto no se hace nunca
const MAX_MOTION_GAP_MS = 700;
// Tiempo moviéndose por encima del límite a partir del cual lo que vio el detector deja de valer
const AGITATION_LIMIT_MS = 300;
// Tiempo que el DNI tiene que llevar quieto antes de la foto, y parte de los fotogramas de ese rato que tienen
// que estar quietos. No se pide el 100 % porque en un móvil siempre hay algún fotograma suelto que se sale
const HOLD_MS = 500;
const STEADY_RATIO = 0.7;
// Una vez quieto, se da por movido cuando baja de aquí. Con los dos límites el aviso no va y viene
const STEADY_EXIT_RATIO = 0.5;
// Fotogramas seguidos con el DNI viéndose bien (luz, reflejos y nitidez) antes de la foto
const CARD_FRAMES = 3;
// Pausa entre dos pasadas del detector cuando va en un worker: una parte de lo que tardó la última, entre estos
// dos límites. Así el móvil descansa algo y no se calienta más de la cuenta
const DETECTION_GAP_RATIO = 0.25;
const MIN_DETECTION_GAP_MS = 80;
const MAX_DETECTION_GAP_MS = 300;
// Sin worker el detector para la página mientras trabaja. Se espera al menos lo que tardó, para que la
// pantalla no pase más de la mitad del tiempo ocupada
const BLOCKING_DETECTION_GAP_MS = 350;
// Mientras el DNI se mueve no se lanza el detector, porque el resultado no serviría. Si el movimiento
// no para, se lanza igual cada este tiempo para poder seguir dando avisos
const MAX_WAIT_FOR_CALM_MS = 700;
// Una detección más antigua ya no cuenta. En un móvil lento el plazo se alarga a tres pasadas
const DETECTION_MAX_AGE_MS = 2500;
// Al abrir la cámara o reintentar se deja que el enfoque y la exposición se asienten
const WARMUP_MS = 600;
// Un aviso nuevo tiene que salir en estos fotogramas seguidos para enseñarse, y un aviso de corrección
// se queda al menos este tiempo antes de cambiar por otro. Sin esto el texto parpadea y no da tiempo a leerlo
const HINT_CONFIRM_FRAMES = 2;
const MIN_HINT_MS = 700;

// Con ?depurar-camara el panel enseña en pequeño lo que recibió el detector la última vez, a este ancho y como mucho
// una vez por segundo. Sirve para ver en un móvil si el detector recibe el DNI derecho, entero y nítido
const DEBUG_VIEW_WIDTH = 200;
const DEBUG_VIEW_EVERY_MS = 1000;
// Archivo de la web que está corriendo, con la huella de su contenido. En el panel sirve para saber si el móvil ya
// tiene la última versión publicada o sigue con la de antes en la caché
const WEB_FILE = (() => {
  try {
    return new URL(import.meta.url).pathname.split('/').pop();
  } catch {
    return '-';
  }
})();

// Ancho y alto de lo que se lee: el vídeo o un bitmap ya sacado de él
const sourceSize = (source) => (source instanceof HTMLVideoElement
  ? { width: source.videoWidth, height: source.videoHeight }
  : { width: source.width, height: source.height });

// Veces que se vuelve a intentar cargar el detector si falla, por ejemplo por un corte de la red, y espera entre intentos
const LOAD_RETRIES = 3;
const LOAD_RETRY_MS = 3000;

const IDLE = { status: 'inactivo', hint: null, progress: 0, debug: null };

/**
 * Lienzo pequeño donde se reduce una zona del vídeo, con su copia legible.
 *
 * El vídeo se reduce primero en un lienzo normal, que el navegador dibuja con la gráfica, y después solo esa
 * copia pequeña se pasa a un lienzo con willReadFrequently para leer sus píxeles. Dibujar el vídeo directamente en
 * un lienzo con willReadFrequently obliga a bajar el fotograma entero de la gráfica a la memoria. Con la cámara a 4K,
 * en un Galaxy S24 Ultra eso dejaba la página parada unos 0,4 s en cada fotograma analizado.
 */
function createFrameReader() {
  const scaled = document.createElement('canvas');
  const scaledContext = scaled.getContext('2d');
  const readable = document.createElement('canvas');
  const readableContext = readable.getContext('2d', { willReadFrequently: true });

  /**
   * Píxeles de la zona del vídeo o del bitmap reducida a width x height. Un bitmap ya leído del vídeo se dibuja
   * directamente en el lienzo legible, que en el Xiaomi era tres veces más rápido que pasar por el lienzo normal
   */
  return (source, requested, width, height) => {
    if (scaled.width !== width || scaled.height !== height) {
      scaled.width = width;
      scaled.height = height;
      readable.width = width;
      readable.height = height;
    }
    // Safari no dibuja nada si la zona se sale de lo leído (ver clampRect)
    const { width: sourceWidth, height: sourceHeight } = sourceSize(source);
    const area = clampRect(requested, sourceWidth, sourceHeight) || requested;
    if (source instanceof HTMLVideoElement) {
      scaledContext.drawImage(source, area.x, area.y, area.width, area.height, 0, 0, width, height);
      readableContext.drawImage(scaled, 0, 0);
    } else {
      readableContext.drawImage(source, area.x, area.y, area.width, area.height, 0, 0, width, height);
    }
    return readableContext.getImageData(0, 0, width, height);
  };
}

/**
 * Captura automática del DNI. Mira el vídeo de la cámara y llama a onReady una sola vez cuando el DNI
 * está dentro del recuadro, es la cara pedida, se leen sus campos, hay luz, está nítido y quieto.
 *
 * Hay dos ritmos. Varias veces por segundo se miden luz, nitidez, reflejos y movimiento, dejando entre una vez y
 * otra al menos lo que tarda la medida (ver analysisInterval), para que el vídeo no vaya a saltos en un móvil lento.
 * Aparte, el detector de campos, el mismo que usa la censura, pasa sobre la zona del recuadro tan a menudo como
 * puede (de 2 a 5 veces por segundo en un ordenador y cada 1 o 2 segundos en un móvil lento).
 *
 * La foto se hace cuando coinciden tres cosas:
 *   1. La última pasada del detector dio por bueno el DNI y desde ese fotograma no se ha movido.
 *   2. El recuadro lleva HOLD_MS quieto, contado fotograma a fotograma mientras el detector trabaja.
 *   3. Los últimos fotogramas del DNI se ven bien, y este en concreto no es de los menos nítidos.
 * Así basta una pasada buena del detector, que en un móvil es lo que más tarda.
 *
 * Estados: inactivo, cargando, manual (sin detector, la foto se hace con el botón), buscando, ajustando,
 * listo (todo bien, cuenta hacia la foto) y disparado.
 *
 * @param {object} options
 * @param {React.RefObject<HTMLVideoElement>} options.videoRef - Vídeo de la cámara
 * @param {React.RefObject<HTMLElement>} options.guideRef - Recuadro guía que se ve en pantalla
 * @param {boolean} options.enabled - Si está mirando. Se apaga mientras se procesa una foto o hay un error
 * @param {'anverso'|'reverso'|null} options.expectedSide - Cara que se pide, o null si vale cualquiera
 * @param {number} options.warmupMs - Espera mínima antes de la foto desde que se enciende. Sirve para dar
 *   tiempo a leer un aviso cuando se repite una foto
 * @param {Function} options.onReady - Se llama cuando hay que hacer la foto
 * @returns {{status: string, hint: string|null, progress: number, debug: object|null,
 *   placementRef: React.RefObject}} placementRef guarda la última zona del DNI que vio el detector
 *   ({ docRect, at }) o null. La usa la cámara para no cortar el DNI cuando recorta el fotograma
 */
export function useAutoCapture({ videoRef, guideRef, enabled, expectedSide = null, warmupMs = 0, onReady }) {
  const [state, setState] = useState(IDLE);
  const onReadyRef = useRef(onReady);
  const warmupRef = useRef(warmupMs);
  const placementRef = useRef(null);
  const [debugEnabled] = useState(
    () => new URLSearchParams(window.location.search).has('depurar-camara')
  );

  useEffect(() => {
    onReadyRef.current = onReady;
    warmupRef.current = warmupMs;
  }, [onReady, warmupMs]);

  useEffect(() => {
    if (!enabled) {
      setState(IDLE);
      return undefined;
    }

    let cancelled = false;
    let frameHandle = null;
    const enabledAt = performance.now();
    let lastAnalysisAt = 0;

    // Movimiento
    let previousSmall = null;
    let previousAt = null;
    let agitatedMs = 0;
    // Fotogramas recientes en los que se pudo medir el movimiento, con si estaba quieto o no
    const steadySamples = [];
    let wasSteady = false;
    // Desde cuándo vale lo que ve el detector. Se adelanta cada vez que se mueve el DNI o el móvil
    let sceneChangedAt = enabledAt;

    // Nitidez
    const recentSharpness = [];
    // Zona sobre la que se midió la nitidez reciente. Al cambiar de zona no se pueden comparar
    let sharpnessSource = null;
    let cardFrames = 0;

    // Detector
    let placement = null;
    let detecting = false;
    let nextDetectionAt = 0;
    let lastDetectionStartedAt = 0;
    let lastDetectionMs = null;
    let fired = false;
    // Con el ahorro de datos activado no se descarga el modelo y la foto se hace con el botón
    let detectorState = navigator.connection?.saveData ? 'manual' : 'cargando';

    // Lo que se está enseñando y el aviso que aspira a sustituirlo
    let shown = { key: '', status: 'inactivo', hint: null, since: 0 };
    let candidate = { key: '', count: 0 };
    let lastPublished = '';
    let lastDebugAt = 0;

    const readAnalysis = createFrameReader();
    const readMotion = createFrameReader();
    const detectionCanvas = document.createElement('canvas');
    const detectionContext = detectionCanvas.getContext('2d');
    // Lo que recibió el detector, en pequeño, para el panel de depuración
    const debugViewCanvas = debugEnabled ? document.createElement('canvas') : null;
    let debugView = null;
    let lastDebugViewAt = 0;
    // Para el panel de depuración: cuánto tarda cada análisis y cada cuánto se hace
    let analysisMs = null;
    let analysisEveryMs = null;
    // Lo que tarda de media cada análisis. Marca cada cuánto se hace el siguiente
    let averageAnalysisMs = null;
    let analyzing = false;
    // Si el navegador no puede sacar un bitmap del vídeo, se lee el vídeo directamente como antes
    let bitmapReading = typeof createImageBitmap === 'function';

    // Lee una zona del vídeo de este fotograma reducida a width x height. Si el navegador no puede, devuelve el vídeo
    // para leerlo directamente como antes. Las zonas se piden en píxeles del vídeo y frameArea las pasa a píxeles de lo
    // leído. readMs es lo que la página ha estado parada
    const grabArea = async (video, area, width, height) => {
      if (bitmapReading) {
        try {
          const startedAt = performance.now();
          const pending = createImageBitmap(video, area.x, area.y, area.width, area.height,
            { resizeWidth: width, resizeHeight: height });
          const readMs = performance.now() - startedAt;
          const bitmap = await pending;
          // Con el tamaño que haya salido, por si el navegador no hace caso de resizeWidth y resizeHeight
          return {
            source: bitmap,
            region: area,
            requested: area,
            scaleX: bitmap.width / area.width,
            scaleY: bitmap.height / area.height,
            readMs,
            close: () => bitmap.close(),
          };
        } catch (err) {
          console.error('[useAutoCapture] No se puede leer el vídeo con createImageBitmap, se lee directamente:', err);
          bitmapReading = false;
        }
      }
      return {
        source: video,
        region: { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight },
        requested: null,
        scaleX: 1,
        scaleY: 1,
        readMs: 0,
        close: () => {},
      };
    };

    // Zona donde se miden luz, nitidez y reflejos: el DNI si el detector lo ha encontrado y no se ha movido desde
    // entonces y, si no, la parte de dentro del recuadro. Así un fondo blanco alrededor del DNI no cuenta como reflejo.
    // En píxeles enteros, para que la zona leída ya reducida coincida píxel a píxel con la que se mide
    const qualityState = (now, guideRect, videoWidth, videoHeight) => {
      const maxAge = Math.max(DETECTION_MAX_AGE_MS, 3 * (lastDetectionMs || 0));
      const fresh = placement && now - placement.finishedAt < maxAge;
      const placementValid = fresh && placement.found && placement.startedAt >= sceneChangedAt;
      const cardArea = placementValid ? expandRect(placement.docRect, -0.04, videoWidth, videoHeight) : null;
      const area = cardArea || expandRect(guideRect, -0.06, videoWidth, videoHeight);
      const qualityArea = area && {
        x: Math.round(area.x),
        y: Math.round(area.y),
        width: Math.round(area.width),
        height: Math.round(area.height),
      };
      return { fresh, placementValid, cardArea, qualityArea };
    };
    const sameArea = (a, b) => Boolean(a && b)
      && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    const qualityHeight = (area) => Math.max(8, Math.round((ANALYSIS_WIDTH * area.height) / area.width));
    const frameArea = (frame, area) => ({
      x: (area.x - frame.region.x) * frame.scaleX,
      y: (area.y - frame.region.y) * frame.scaleY,
      width: area.width * frame.scaleX,
      height: area.height * frame.scaleY,
    });

    if (detectorState === 'cargando') {
      // Si falla, por ejemplo porque se ha cortado la red mientras se descargaba el modelo, se vuelve a intentar.
      // Mientras tanto la foto se puede hacer con el botón
      const load = (retriesLeft) => preloadDetector().then((ready) => {
        if (cancelled) return;
        if (ready) {
          detectorState = 'listo';
        } else if (retriesLeft > 0) {
          setTimeout(() => {
            if (!cancelled) load(retriesLeft - 1);
          }, LOAD_RETRY_MS);
        } else {
          detectorState = 'manual';
        }
      });
      load(LOAD_RETRIES);
    }

    const publish = (status, hint, progress, info, now) => {
      const roundedProgress = Math.round(progress * 20) / 20;
      const key = `${status}|${hint}|${roundedProgress}`;
      let debug = null;
      if (debugEnabled && info && now - lastDebugAt > 250) {
        lastDebugAt = now;
        const { metrics, sharpness, steadyRatio } = info;
        debug = {
          estado: status,
          luz: metrics.brightness.toFixed(0),
          nitidez: `${metrics.sharpness.toFixed(0)} (mediana ${sharpness.toFixed(0)})`,
          reflejos: `${(metrics.glare * 100).toFixed(1)} %`,
          movimiento: metrics.motion === null ? '-' : metrics.motion.toFixed(1),
          quieto: steadyRatio === null ? '-' : `${Math.round(steadyRatio * 100)} %`,
          detector: lastDetectionMs === null ? detectorState : `${lastDetectionMs.toFixed(0)} ms`,
          análisis: analysisMs === null ? '-'
            : `${analysisMs.toFixed(0)} ms cada ${analysisEveryMs === null ? '-' : analysisEveryMs.toFixed(0)} ms`,
          vídeo: `${videoRef.current?.videoWidth || 0}x${videoRef.current?.videoHeight || 0}`,
          cara: placement?.side || '-',
          tamaño: placement?.coverage ? placement.coverage.toFixed(2) : '-',
          desvío: placement?.found ? `${placement.offsetX.toFixed(2)} ${placement.offsetY.toFixed(2)}` : '-',
          detecciones: placement?.detections ?? '-',
          cajas: placement?.boxes ?? '-',
          documento: placement?.documentConfidence ? placement.documentConfidence.toFixed(2) : '-',
          web: WEB_FILE,
          pantalla: `${screenAngle()}°`,
          foto: 'ImageCapture' in window ? 'ImageCapture' : 'fotograma del vídeo',
          // La imagen, que el panel enseña debajo de los números
          vista: debugView,
        };
      }
      if (key === lastPublished && !debug) return;
      lastPublished = key;
      setState((previous) => ({
        status,
        hint,
        progress: roundedProgress,
        debug: debug || previous.debug,
      }));
    };

    // Decide qué aviso se enseña. Las buenas noticias salen enseguida y un aviso de corrección se queda
    // un mínimo antes de cambiar por otro
    const show = (status, hint, now) => {
      const key = `${status}|${hint}`;
      if (key === shown.key) {
        candidate = { key: '', count: 0 };
        return;
      }
      candidate = candidate.key === key ? { key, count: candidate.count + 1 } : { key, count: 1 };
      const fixed = status === 'manual' || status === 'cargando';
      // Vale para todos los avisos, no solo los de «ajustando». Si no, «Hay poca luz» salía y se iba en 0,2 s
      const settled = shown.status === 'listo' || status === 'listo' || now - shown.since >= MIN_HINT_MS;
      if (fixed || shown.key === '' || (candidate.count >= HINT_CONFIRM_FRAMES && settled)) {
        shown = { key, status, hint, since: now };
        candidate = { key: '', count: 0 };
      }
    };

    const startDetection = (video, guideRect, frame) => {
      const region = expandRect(guideRect, DETECTION_MARGIN, video.videoWidth, video.videoHeight);
      if (!region) return;

      // La zona se pasa a píxeles de lo leído y se recorta a ello. Por el redondeo podía salirse una fracción de píxel
      // del bitmap, y entonces Safari no dibujaba nada y el detector recibía una imagen vacía (ver clampRect)
      const { width: sourceWidth, height: sourceHeight } = sourceSize(frame.source);
      const source = clampRect(frameArea(frame, region), sourceWidth, sourceHeight);
      if (!source) return;

      const scale = Math.min(1, DETECTOR_MAX_SIDE / Math.max(region.width, region.height));
      const width = Math.max(1, Math.round(region.width * scale));
      const height = Math.max(1, Math.round(region.height * scale));
      detectionCanvas.width = width;
      detectionCanvas.height = height;
      detectionContext.drawImage(frame.source, source.x, source.y, source.width, source.height, 0, 0, width, height);

      const view = { region, scale, canvasWidth: width, canvasHeight: height, guide: guideRect };
      const startedAt = performance.now();
      detecting = true;
      lastDetectionStartedAt = startedAt;

      detectDniFromCanvas(detectionCanvas)
        .then((boxes) => {
          if (cancelled) return;
          const finishedAt = performance.now();
          lastDetectionMs = finishedAt - startedAt;
          if (debugViewCanvas && finishedAt - lastDebugViewAt >= DEBUG_VIEW_EVERY_MS) {
            lastDebugViewAt = finishedAt;
            debugViewCanvas.width = DEBUG_VIEW_WIDTH;
            debugViewCanvas.height = Math.max(1, Math.round((DEBUG_VIEW_WIDTH * height) / width));
            debugViewCanvas.getContext('2d').drawImage(detectionCanvas, 0, 0, debugViewCanvas.width, debugViewCanvas.height);
            debugView = debugViewCanvas.toDataURL('image/jpeg', 0.7);
          }
          placement = { ...evaluatePlacement(boxes, view, expectedSide), startedAt, finishedAt };
          placementRef.current = placement.found ? { docRect: placement.docRect, at: finishedAt } : null;
          const gap = usarWorker()
            ? Math.min(MAX_DETECTION_GAP_MS, Math.max(MIN_DETECTION_GAP_MS, lastDetectionMs * DETECTION_GAP_RATIO))
            : Math.max(BLOCKING_DETECTION_GAP_MS, lastDetectionMs);
          nextDetectionAt = finishedAt + gap;
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('[useAutoCapture] Falló la detección en directo, se pasa a modo manual:', err);
          detectorState = 'manual';
        })
        .finally(() => {
          detecting = false;
        });
    };

    // frames.region es la zona del detector y frames.quality la zona de calidad que se esperaba, ya a su tamaño
    const analyze = (now, video, guideRect, frames) => {
      const frame = frames.region;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // 1. Movimiento, siempre sobre la zona del recuadro para comparar fotogramas seguidos
      const guideArea = expandRect(guideRect, 0, videoWidth, videoHeight);
      if (!guideArea) return;
      const motionHeight = Math.max(8, Math.round((MOTION_WIDTH * guideArea.height) / guideArea.width));
      const motionFrame = measureFrame(
        readMotion(frame.source, frameArea(frame, guideArea), MOTION_WIDTH, motionHeight),
        previousSmall,
      );
      const elapsed = previousAt === null ? null : now - previousAt;
      previousSmall = motionFrame.small;
      previousAt = now;

      let motion = null;
      let sceneChanged = false;
      if (motionFrame.motion !== null && elapsed !== null) {
        if (elapsed <= MAX_MOTION_GAP_MS) {
          motion = motionFrame.motion * Math.min(1, MOTION_REFERENCE_MS / elapsed);
          const moving = motion > QUALITY.maxMotion;
          // Se acumula el tiempo moviéndose y se descuenta el tiempo quieto, sin pasar mucho del límite
          agitatedMs = moving
            ? Math.min(AGITATION_LIMIT_MS + elapsed, agitatedMs + elapsed)
            : Math.max(0, agitatedMs - elapsed);
          sceneChanged = motion > QUALITY.strongMotion || agitatedMs > AGITATION_LIMIT_MS;
          if (!sceneChanged) steadySamples.push({ at: now, ok: !moving });
        } else {
          // Ha pasado demasiado tiempo para medir el pulso, pero un cambio grande sí se nota
          sceneChanged = motionFrame.motion > QUALITY.strongMotion;
        }
      }
      if (sceneChanged) {
        sceneChangedAt = now;
        steadySamples.length = 0;
        wasSteady = false;
      }
      while (steadySamples.length && now - steadySamples[0].at > HOLD_MS + analysisInterval(averageAnalysisMs)) {
        steadySamples.shift();
      }
      const steadySpan = steadySamples.length ? now - steadySamples[0].at : 0;
      const steadyRatio = steadySamples.length
        ? steadySamples.filter((sample) => sample.ok).length / steadySamples.length
        : null;
      const windowFull = steadySpan >= HOLD_MS * 0.9;
      const calm = steadyRatio !== null && steadyRatio >= (wasSteady ? STEADY_EXIT_RATIO : STEADY_RATIO);
      const steady = windowFull && calm;
      wasSteady = steady;
      const movingNow = motion !== null && motion > QUALITY.maxMotion;

      // 2. Luz, nitidez y reflejos (ver qualityState). Casi siempre la zona es la que se esperaba y ya está leída a su
      // tamaño. Si el DNI se acaba de mover y la zona cambia, se saca de la del detector
      const { fresh, placementValid, cardArea, qualityArea } = qualityState(now, guideRect, videoWidth, videoHeight);
      if (!qualityArea) return;
      const height = qualityHeight(qualityArea);
      const qualityFrame = sameArea(frames.quality?.requested, qualityArea) ? frames.quality : frame;
      const metrics = {
        ...measureFrame(readAnalysis(qualityFrame.source, frameArea(qualityFrame, qualityArea), ANALYSIS_WIDTH, height)),
        motion,
      };

      // El fondo del recuadro suele ser más nítido que el DNI, así que al pasar de medir el recuadro
      // a medir el DNI se empieza de cero
      const source = cardArea ? 'dni' : 'recuadro';
      if (source !== sharpnessSource) {
        sharpnessSource = source;
        recentSharpness.length = 0;
        cardFrames = 0;
      }
      const lastValues = recentSharpness.slice(1 - SHARPNESS_SMOOTH).map((sample) => sample.value);
      const sharpness = median([...lastValues, metrics.sharpness]);
      recentSharpness.push({ at: now, value: metrics.sharpness, smooth: sharpness });
      while (recentSharpness.length && now - recentSharpness[0].at > SHARPNESS_WINDOW_MS) {
        recentSharpness.shift();
      }
      const bestSharpness = Math.max(...recentSharpness.map((sample) => sample.smooth));
      const imageHint = imageQualityHint(metrics, sharpness, bestSharpness);
      cardFrames = cardArea && !imageHint ? cardFrames + 1 : 0;

      // 3. El detector, cuando le toca y el DNI no se está moviendo
      if (detectorState === 'listo' && !detecting && now >= nextDetectionAt
        && (!movingNow || now - lastDetectionStartedAt >= MAX_WAIT_FOR_CALM_MS)) {
        startDetection(video, guideRect, frame);
      }

      // 4. Qué decirle a la persona y si ya se puede hacer la foto
      let status;
      let hint;
      if (detectorState === 'manual') {
        status = 'manual';
        hint = HINTS.manual;
      } else if (detectorState === 'cargando') {
        status = 'cargando';
        hint = HINTS.loading;
      } else if (!fresh || !placement.found) {
        status = 'buscando';
        hint = imageHint === HINTS.dark ? HINTS.dark : HINTS.place;
      } else if (!placementValid) {
        // Se ha movido después de la última pasada del detector. Hasta la siguiente no se sabe cómo ha quedado
        status = 'ajustando';
        hint = HINTS.moving;
      } else if (!placement.ok && !(placement.reason === 'fields' && imageHint)) {
        status = 'ajustando';
        hint = placement.hint;
      } else if (imageHint) {
        // Si no se leen los campos porque está borroso, oscuro o con reflejos, se dice la causa
        status = 'ajustando';
        hint = imageHint;
      } else if (steadyRatio !== null && !calm) {
        status = 'ajustando';
        hint = HINTS.moving;
      } else {
        status = 'listo';
        hint = HINTS.hold;
      }
      show(status, hint, now);

      const info = { metrics, sharpness, steadyRatio };
      const warmup = Math.max(WARMUP_MS, warmupRef.current || 0);
      // La foto se hace en un fotograma nítido de los últimos, no en uno de los que salen flojos,
      // y solo cuando en pantalla ya pone que está bien, para que no llegue por sorpresa
      const sharpNow = metrics.sharpness >= sharpness * QUALITY.fireSharpnessRatio;
      if (status === 'listo' && shown.status === 'listo' && !fired && steady && !movingNow
        && cardFrames >= CARD_FRAMES && sharpNow && now - enabledAt >= warmup) {
        fired = true;
        publish('disparado', HINTS.capturing, 1, info, now);
        onReadyRef.current?.();
        return;
      }

      // La barra cuenta el rato quieto. Se queda casi llena mientras espera a un fotograma nítido
      const progress = shown.status === 'listo' && calm ? Math.min(0.95, steadySpan / HOLD_MS) : 0;
      publish(shown.status, shown.hint, progress, info, now);
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && typeof video.requestVideoFrameCallback === 'function') {
        frameHandle = { video, id: video.requestVideoFrameCallback(onFrame) };
      } else {
        frameHandle = { video: null, id: requestAnimationFrame(onFrame) };
      }
    };

    const runAnalysis = async (now, video, guideRect) => {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      let frames = [];
      try {
        const found = expandRect(guideRect, DETECTION_MARGIN, videoWidth, videoHeight);
        if (!found) return;
        const region = {
          x: Math.round(found.x),
          y: Math.round(found.y),
          width: Math.round(found.width),
          height: Math.round(found.height),
        };
        const regionScale = Math.min(1, DETECTOR_MAX_SIDE / Math.max(region.width, region.height));
        const expected = qualityState(now, guideRect, videoWidth, videoHeight).qualityArea;
        frames = await Promise.all([
          grabArea(video, region, Math.max(1, Math.round(region.width * regionScale)),
            Math.max(1, Math.round(region.height * regionScale))),
          expected ? grabArea(video, expected, ANALYSIS_WIDTH, qualityHeight(expected)) : null,
        ]);
        if (cancelled || fired) return;
        const startedAt = performance.now();
        analyze(now, video, guideRect, { region: frames[0], quality: frames[1] });
        // Solo cuenta lo que la página ha estado parada, no la espera a los bitmaps
        analysisMs = frames[0].readMs + (frames[1]?.readMs || 0) + performance.now() - startedAt;
        averageAnalysisMs = averageAnalysisMs === null ? analysisMs : averageAnalysisMs * 0.7 + analysisMs * 0.3;
      } catch (err) {
        console.error('[useAutoCapture] Error al analizar el fotograma:', err);
      } finally {
        frames.forEach((frame) => frame?.close());
        analyzing = false;
      }
    };

    const onFrame = () => {
      if (cancelled) return;
      const now = performance.now();
      if (!fired && !analyzing && now - lastAnalysisAt >= analysisInterval(averageAnalysisMs)) {
        const video = videoRef.current;
        const guide = guideRef.current;
        const guideRect = video && guide && video.readyState >= 2 ? guideRectInVideo(video, guide) : null;
        if (guideRect) {
          if (lastAnalysisAt) analysisEveryMs = now - lastAnalysisAt;
          lastAnalysisAt = now;
          analyzing = true;
          runAnalysis(now, video, guideRect);
        }
      }
      scheduleNext();
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (frameHandle?.video) {
        frameHandle.video.cancelVideoFrameCallback?.(frameHandle.id);
      } else if (frameHandle) {
        cancelAnimationFrame(frameHandle.id);
      }
    };
  }, [enabled, expectedSide, videoRef, guideRef, debugEnabled]);

  return { ...state, placementRef };
}
