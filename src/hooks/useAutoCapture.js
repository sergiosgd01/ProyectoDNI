import { useEffect, useRef, useState } from 'react';
import { detectDniFromCanvas, preloadDetector } from '../components/dni_scripts/dni_detector';
import {
  ANALYSIS_WIDTH,
  DETECTION_MARGIN,
  DETECTOR_MAX_SIDE,
  HINTS,
  evaluatePlacement,
  expandRect,
  guideRectInVideo,
  measureFrame,
  qualityHint,
  SHARPNESS_WINDOW_MS,
} from '../utils/liveCapture';

// Cada cuánto se mira un fotograma, unas 12 veces por segundo
const ANALYSIS_INTERVAL_MS = 80;
// Ancho de la copia del recuadro con la que se mide el movimiento
const MOTION_WIDTH = 200;
// Pausa mínima entre dos pasadas del detector. Si el detector tarda más, se espera lo mismo que tardó,
// para que en un móvil lento la pantalla no pase más de la mitad del tiempo ocupada
const MIN_DETECTION_GAP_MS = 350;
// Una detección más antigua ya no cuenta
const DETECTION_MAX_AGE_MS = 2500;
// Tiempo con todo en verde antes de hacer la foto
const HOLD_MS = 500;
// Al abrir la cámara o reintentar se deja que el enfoque y la exposición se asienten
const WARMUP_MS = 600;

const IDLE = { status: 'inactivo', hint: null, progress: 0, debug: null };

/**
 * Captura automática del DNI. Mira el vídeo de la cámara y llama a onReady una sola vez cuando el DNI
 * está dentro del recuadro, es la cara pedida, se leen sus campos, hay luz, está nítido y quieto.
 *
 * En cada fotograma mide luz, nitidez, reflejos y movimiento, que tarda unos milisegundos. Una o dos veces
 * por segundo pasa el detector de campos, el mismo que usa la censura, sobre la zona del recuadro.
 *
 * Estados: inactivo, cargando, manual (sin detector, la foto se hace con el botón), buscando, ajustando,
 * listo (todo bien, cuenta hacia la foto) y disparado.
 *
 * @param {object} options
 * @param {React.RefObject<HTMLVideoElement>} options.videoRef - Vídeo de la cámara
 * @param {React.RefObject<HTMLElement>} options.guideRef - Recuadro guía que se ve en pantalla
 * @param {boolean} options.enabled - Si está mirando. Se apaga mientras se procesa una foto o hay un error
 * @param {'anverso'|'reverso'|null} options.expectedSide - Cara que se pide, o null si vale cualquiera
 * @param {Function} options.onReady - Se llama cuando hay que hacer la foto
 */
export function useAutoCapture({ videoRef, guideRef, enabled, expectedSide = null, onReady }) {
  const [state, setState] = useState(IDLE);
  const onReadyRef = useRef(onReady);
  const [debugEnabled] = useState(
    () => new URLSearchParams(window.location.search).has('depurar-camara')
  );

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!enabled) {
      setState(IDLE);
      return undefined;
    }

    let cancelled = false;
    let frameHandle = null;
    const enabledAt = performance.now();
    let lastAnalysisAt = 0;
    let previousSmall = null;
    const recentSharpness = [];
    // Zona sobre la que se midió la nitidez reciente. Al cambiar de zona no se pueden comparar
    let sharpnessSource = null;
    let placement = null;
    let detecting = false;
    let nextDetectionAt = 0;
    let lastDetectionMs = null;
    let holdStart = null;
    let fired = false;
    let lastPublished = '';
    let lastDebugAt = 0;
    // Con el ahorro de datos activado no se descarga el modelo y la foto se hace con el botón
    let detectorState = navigator.connection?.saveData ? 'manual' : 'cargando';

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

    const publish = (status, hint, progress, metrics, now) => {
      const roundedProgress = Math.round(progress * 20) / 20;
      const key = `${status}|${hint}|${roundedProgress}`;
      let debug = null;
      if (debugEnabled && metrics && now - lastDebugAt > 250) {
        lastDebugAt = now;
        debug = {
          estado: status,
          luz: metrics.brightness.toFixed(0),
          nitidez: metrics.sharpness.toFixed(0),
          reflejos: `${(metrics.glare * 100).toFixed(1)} %`,
          movimiento: metrics.motion === null ? '-' : metrics.motion.toFixed(1),
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

      detectDniFromCanvas(detectionCanvas)
        .then((boxes) => {
          if (cancelled) return;
          const finishedAt = performance.now();
          lastDetectionMs = finishedAt - startedAt;
          placement = { ...evaluatePlacement(boxes, view, expectedSide), startedAt, finishedAt };
          nextDetectionAt = finishedAt + Math.max(MIN_DETECTION_GAP_MS, lastDetectionMs);
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
      const fresh = placement && now - placement.finishedAt < DETECTION_MAX_AGE_MS;

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
      previousSmall = motionFrame.small;

      // 2. Luz, nitidez y reflejos, sobre el DNI si el detector ya lo ha encontrado. Si no, sobre la
      // parte de dentro del recuadro. Así un fondo blanco alrededor del DNI no cuenta como reflejo
      const cardArea = fresh && placement.found ? expandRect(placement.docRect, -0.04, videoWidth, videoHeight) : null;
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
        motion: motionFrame.motion,
      };

      // 3. El detector, cuando le toca
      if (detectorState === 'listo' && !detecting && now >= nextDetectionAt) {
        startDetection(video, guideRect);
      }

      // 4. Qué decirle a la persona y si ya se puede hacer la foto
      // Nitidez de referencia: la mejor de los últimos instantes, para saber si el enfoque ya se asentó
      // El fondo del recuadro suele ser más nítido que el DNI, así que al pasar de medir el recuadro
      // a medir el DNI se empieza de cero
      const source = cardArea ? 'dni' : 'recuadro';
      if (source !== sharpnessSource) {
        sharpnessSource = source;
        recentSharpness.length = 0;
      }
      recentSharpness.push({ at: now, value: metrics.sharpness });
      while (recentSharpness.length && now - recentSharpness[0].at > SHARPNESS_WINDOW_MS) {
        recentSharpness.shift();
      }
      const bestSharpness = Math.max(...recentSharpness.map((sample) => sample.value));
      const quality = qualityHint(metrics, bestSharpness);
      let status;
      let hint;
      let progress = 0;

      if (detectorState === 'manual') {
        status = 'manual';
        hint = HINTS.manual;
      } else if (detectorState === 'cargando') {
        status = 'cargando';
        hint = HINTS.loading;
      } else if (!fresh || !placement.found) {
        status = 'buscando';
        hint = quality === HINTS.dark ? HINTS.dark : HINTS.place;
      } else if (!placement.ok && !(placement.reason === 'fields' && quality)) {
        status = 'ajustando';
        hint = placement.hint;
      } else if (quality) {
        // Si no se leen los campos porque está borroso, oscuro o con reflejos, se dice la causa
        status = 'ajustando';
        hint = quality;
      } else {
        if (holdStart === null) holdStart = now;
        // Hace falta una pasada del detector hecha entera con el DNI ya quieto
        const confirmed = placement.startedAt >= holdStart;
        const held = (now - holdStart) / HOLD_MS;
        progress = Math.min(confirmed ? 1 : 0.95, held);
        status = 'listo';
        hint = HINTS.hold;

        if (!fired && confirmed && held >= 1 && now - enabledAt >= WARMUP_MS) {
          fired = true;
          publish('disparado', HINTS.capturing, 1, metrics, now);
          onReadyRef.current?.();
          return;
        }
      }

      if (status !== 'listo') holdStart = null;
      publish(status, hint, progress, metrics, now);
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

  return state;
}
