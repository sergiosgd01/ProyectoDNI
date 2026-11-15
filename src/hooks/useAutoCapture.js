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
  evaluatePlacement,
  expandRect,
  guideRectInVideo,
  imageQualityHint,
  measureFrame,
  median,
} from '../utils/liveCapture';

// Cada cuánto se mira un fotograma, unas 10 veces por segundo
const ANALYSIS_INTERVAL_MS = 80;
// Ancho de la copia del recuadro con la que se mide el movimiento
const MOTION_WIDTH = 200;
// Separación habitual entre dos fotogramas analizados. El movimiento se pasa a esta escala, para que valga
// lo mismo en un móvil que analiza 10 fotogramas por segundo que en uno que solo llega a 5
const MOTION_REFERENCE_MS = 100;
// Si entre dos fotogramas pasa más que esto, no se sabe si la diferencia es pulso o es que se ha movido el DNI
const MAX_MOTION_GAP_MS = 300;
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

const IDLE = { status: 'inactivo', hint: null, progress: 0, debug: null };

/**
 * Captura automática del DNI. Mira el vídeo de la cámara y llama a onReady una sola vez cuando el DNI
 * está dentro del recuadro, es la cara pedida, se leen sus campos, hay luz, está nítido y quieto.
 *
 * Hay dos ritmos. En cada fotograma se miden luz, nitidez, reflejos y movimiento, que tarda unos milisegundos.
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

    const analysisCanvas = document.createElement('canvas');
    const analysisContext = analysisCanvas.getContext('2d', { willReadFrequently: true });
    const motionCanvas = document.createElement('canvas');
    const motionContext = motionCanvas.getContext('2d', { willReadFrequently: true });
    const detectionCanvas = document.createElement('canvas');
    const detectionContext = detectionCanvas.getContext('2d');

    if (detectorState === 'cargando') {
      preloadDetector().then((ready) => {
        if (!cancelled) detectorState = ready ? 'listo' : 'manual';
      });
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
          cara: placement?.side || '-',
          tamaño: placement?.coverage ? placement.coverage.toFixed(2) : '-',
          desvío: placement?.found ? `${placement.offsetX.toFixed(2)} ${placement.offsetY.toFixed(2)}` : '-',
          detecciones: placement?.detections ?? '-',
          cajas: placement?.boxes ?? '-',
          documento: placement?.documentConfidence ? placement.documentConfidence.toFixed(2) : '-',
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
      const settled = shown.status !== 'ajustando' || status === 'listo' || now - shown.since >= MIN_HINT_MS;
      if (fixed || shown.key === '' || (candidate.count >= HINT_CONFIRM_FRAMES && settled)) {
        shown = { key, status, hint, since: now };
        candidate = { key: '', count: 0 };
      }
    };

    const startDetection = (video, guideRect) => {
      const region = expandRect(guideRect, DETECTION_MARGIN, video.videoWidth, video.videoHeight);
      if (!region) return;

      const scale = Math.min(1, DETECTOR_MAX_SIDE / Math.max(region.width, region.height));
      const width = Math.max(1, Math.round(region.width * scale));
      const height = Math.max(1, Math.round(region.height * scale));
      detectionCanvas.width = width;
      detectionCanvas.height = height;
      detectionContext.drawImage(video, region.x, region.y, region.width, region.height, 0, 0, width, height);

      const view = { region, scale, canvasWidth: width, canvasHeight: height, guide: guideRect };
      const startedAt = performance.now();
      detecting = true;
      lastDetectionStartedAt = startedAt;

      detectDniFromCanvas(detectionCanvas)
        .then((boxes) => {
          if (cancelled) return;
          const finishedAt = performance.now();
          lastDetectionMs = finishedAt - startedAt;
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

    const analyze = (now) => {
      const video = videoRef.current;
      const guide = guideRef.current;
      if (!video || !guide || video.readyState < 2) return;

      const guideRect = guideRectInVideo(video, guide);
      if (!guideRect) return;

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // 1. Movimiento, siempre sobre la zona del recuadro para comparar fotogramas seguidos
      const guideArea = expandRect(guideRect, 0, videoWidth, videoHeight);
      if (!guideArea) return;
      const motionHeight = Math.max(8, Math.round((MOTION_WIDTH * guideArea.height) / guideArea.width));
      if (motionCanvas.width !== MOTION_WIDTH || motionCanvas.height !== motionHeight) {
        motionCanvas.width = MOTION_WIDTH;
        motionCanvas.height = motionHeight;
        previousSmall = null;
      }
      motionContext.drawImage(
        video, guideArea.x, guideArea.y, guideArea.width, guideArea.height, 0, 0, MOTION_WIDTH, motionHeight
      );
      const motionFrame = measureFrame(motionContext.getImageData(0, 0, MOTION_WIDTH, motionHeight), previousSmall);
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
      while (steadySamples.length && now - steadySamples[0].at > HOLD_MS + ANALYSIS_INTERVAL_MS) {
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

      // 2. Luz, nitidez y reflejos, sobre el DNI si el detector lo ha encontrado y no se ha movido desde entonces.
      // Si no, sobre la parte de dentro del recuadro. Así un fondo blanco alrededor del DNI no cuenta como reflejo
      const maxAge = Math.max(DETECTION_MAX_AGE_MS, 3 * (lastDetectionMs || 0));
      const fresh = placement && now - placement.finishedAt < maxAge;
      const placementValid = fresh && placement.found && placement.startedAt >= sceneChangedAt;
      const cardArea = placementValid ? expandRect(placement.docRect, -0.04, videoWidth, videoHeight) : null;
      const qualityArea = cardArea || expandRect(guideRect, -0.06, videoWidth, videoHeight);
      if (!qualityArea) return;
      const height = Math.max(8, Math.round((ANALYSIS_WIDTH * qualityArea.height) / qualityArea.width));
      if (analysisCanvas.width !== ANALYSIS_WIDTH || analysisCanvas.height !== height) {
        analysisCanvas.width = ANALYSIS_WIDTH;
        analysisCanvas.height = height;
      }
      analysisContext.drawImage(
        video, qualityArea.x, qualityArea.y, qualityArea.width, qualityArea.height, 0, 0, ANALYSIS_WIDTH, height
      );
      const metrics = {
        ...measureFrame(analysisContext.getImageData(0, 0, ANALYSIS_WIDTH, height)),
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
        startDetection(video, guideRect);
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

    const onFrame = () => {
      if (cancelled) return;
      const now = performance.now();
      if (!fired && now - lastAnalysisAt >= ANALYSIS_INTERVAL_MS) {
        lastAnalysisAt = now;
        try {
          analyze(now);
        } catch (err) {
          console.error('[useAutoCapture] Error al analizar el fotograma:', err);
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
