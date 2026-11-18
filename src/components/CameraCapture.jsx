import React, { useRef, useState, useEffect, useCallback } from 'react';
import { processWithYolo } from '../services/processWithYolo';
import ManualCropModal from './ManualCropModal';
import { useAutoCapture } from '../hooks/useAutoCapture';
import {
  HINTS,
  captureArea,
  checkFinalPhoto,
  expandRect,
  guideRectInVideo,
  measureFrame,
  sharperCapture,
  videoRectInPhoto,
} from '../utils/liveCapture';
import { prepareImageForUpload } from '../utils/imageResize';
import { detectDniFromFile } from './dni_scripts/dni_detector';

// Veces que la cámara repite sola una foto que no ha salido bien antes de preguntar qué hacer
const MAX_AUTO_RETRIES = 2;
// Tras una foto fallida, tiempo que se enseña el motivo antes de volver a intentarlo
const RETRY_PAUSE_MS = 2500;
// La zona del DNI que vio el detector sirve para recortar el fotograma si es de hace poco
const PLACEMENT_MAX_AGE_MS = 3000;
// Ancho al que se reduce el DNI para comparar la nitidez de la foto con la del fotograma del vídeo
const SHARPNESS_SAMPLE_WIDTH = 480;

// Nitidez de una zona de una imagen (el lienzo con el fotograma o la foto ya abierta), reducida a un ancho fijo
// para que las dos se puedan comparar
function sharpnessOf(source, rect) {
  const width = SHARPNESS_SAMPLE_WIDTH;
  const height = Math.max(8, Math.round((width * rect.height) / rect.width));
  const sample = document.createElement('canvas');
  sample.width = width;
  sample.height = height;
  const context = sample.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
  return measureFrame(context.getImageData(0, 0, width, height)).sharpness;
}

// Una fracción de 0 a 1 escrita como porcentaje en español, con coma decimal y espacio antes de %
const porcentaje = (fraccion, decimales) => `${(fraccion * 100).toFixed(decimales).replace('.', ',')} %`;

// Qué se le dice a la persona cuando la foto no sirve, según lo que falle
const PROBLEM_TEXTS = {
  fields: 'No se leen bien todos los datos del DNI. La foto puede estar borrosa, movida o con reflejos.',
  document: 'En la foto no se reconoce el DNI.',
};

// Móvil tumbado. La pantalla es más ancha que alta y baja, así que el recuadro se mide por el alto y el botón de la
// foto va en una columna a la derecha, como en la cámara del móvil. Antes el botón, a lo ancho abajo, tapaba la
// mitad de abajo del recuadro, y el recuadro se salía por arriba y por abajo (UX-15)
const CONSULTA_TUMBADO = '(orientation: landscape) and (max-height: 500px)';
// Ancho de la columna del botón con el móvil tumbado, en px
const COLUMNA_BOTON = 132;
// Alto de la fila de arriba con el móvil tumbado, donde van el aviso y la X para cerrar, en px
const FILA_ARRIBA = 64;

// Tiempo que se deja a la captura automática antes de ofrecer el botón para hacer la foto a mano. Con el botón a la
// vista desde el principio, quien no se fía de la tecnología lo pulsa nada más abrir la cámara y la foto sale peor que
// la que se hace sola. Cuenta desde que la cámara empieza a preparar la detección y vuelve a empezar cuando ya busca el
// DNI, así que con una red lenta el botón también sale aunque el detector no haya terminado de cargar
const MANUAL_BUTTON_DELAY_MS = 8000;
// Fase de la captura automática según su estado, para el plazo del botón. Mientras se hace o se analiza una foto no
// cuenta, y al volver a la cámara empieza de cero
const AUTO_PHASES = {
  manual: 'manual',
  cargando: 'cargando',
  buscando: 'mirando',
  ajustando: 'mirando',
  listo: 'mirando',
};

// Colores del recuadro según lo que ve la captura automática
const GUIDE_TONES = {
  neutral: { border: 'border-white', corner: 'border-white' },
  ajuste: { border: 'border-amber-300', corner: 'border-amber-400' },
  listo: { border: 'border-green-400', corner: 'border-green-400' },
};

// Fondo del aviso de arriba según el estado de la captura automática
const HINT_BACKGROUNDS = {
  listo: 'bg-green-600/90',
  disparado: 'bg-green-600/90',
  ajustando: 'bg-amber-600/90',
};

// Nombre de cada cara en los textos de la cámara
const NOMBRE_CARA = { anverso: 'delantera', reverso: 'trasera' };
// Al pasar a la otra cara, tiempo que se enseña que la primera está lista
const AVISO_CARA_HECHA_MS = 2000;
// Y tiempo mínimo hasta que la foto de la otra cara se hace sola, para que dé tiempo a ver ese aviso. Más no hace
// falta, porque la foto no se hace mientras se le da la vuelta al DNI ni con la cara que no toca
const ESPERA_OTRA_CARA_MS = 1000;
// Sin decir qué caras se piden, una sola foto de cualquiera de ellas
const UNA_CARA_CUALQUIERA = [null];

/**
 * Recuadro donde se coloca el DNI. Va fuera de CameraCapture para que no se vuelva a crear en cada
 * render, que con la captura automática son varios por segundo.
 * Solo se oscurece lo de fuera, para que el DNI se vea con su luz real.
 */
function DNIGuide({ guideRef, isMobile, tumbado = false, tone, progress }) {
  const colors = GUIDE_TONES[tone] || GUIDE_TONES.neutral;
  // Con el móvil tumbado el recuadro deja libres la fila de arriba (aviso y cerrar) y la columna del botón, y se
  // mide por el alto que queda, sin pasar del ancho libre. La captura lee el recuadro por su posición en pantalla
  // (guideRectInVideo), así que no hay que tocarla
  const hueco = tumbado ? { top: FILA_ARRIBA, right: COLUMNA_BOTON, bottom: 12, left: 0 } : undefined;
  const medida = tumbado
    ? { height: `min(100%, calc((100vw - ${COLUMNA_BOTON + 32}px) / 1.586))`, aspectRatio: '1.586' }
    : { width: isMobile ? '80%' : '60%', aspectRatio: '1.586', maxWidth: '600px', maxHeight: '70vh' };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={hueco}>
      <div
        ref={guideRef}
        data-guia-dni
        className={`relative border-2 ${colors.border} rounded-xl shadow-2xl bg-transparent transition-colors duration-200`}
        style={medida}
      >
        {/* Sombra exterior */}
        <div className="absolute inset-0 rounded-xl" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }}></div>

        {/* Esquinas */}
        <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 ${colors.corner} rounded-tl-xl transition-colors duration-200`}></div>
        <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 ${colors.corner} rounded-tr-xl transition-colors duration-200`}></div>
        <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 ${colors.corner} rounded-bl-xl transition-colors duration-200`}></div>
        <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 ${colors.corner} rounded-br-xl transition-colors duration-200`}></div>

        {/* Icono y texto, solo mientras no hay un DNI dentro, para no taparlo */}
        {tone === 'neutral' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <i className="bi bi-credit-card text-white text-4xl mb-2 block opacity-90"></i>
            <p className="text-white text-sm font-semibold drop-shadow-lg">
              Alinea tu DNI aquí
            </p>
          </div>
        )}

        {/* Cuenta hasta la foto automática */}
        {progress > 0 && (
          <div className="absolute left-4 right-4 bottom-3 h-1.5 rounded-full bg-white/30 overflow-hidden">
            <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.round(progress * 100)}%` }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Aviso de que la foto ha llegado bien al servidor pero no sirve para censurarla sola. Deja repetirla o
 * seguir con ella, porque en el editor los datos también se pueden tapar a mano.
 */
function CaptureProblem({ problem, onRepeat, onUse, onCancel }) {
  // Con el móvil tumbado no cabe entero, así que se puede bajar. safe center lo centra solo si cabe, para que no
  // se corte por arriba
  return (
    <div
      data-captura-problema
      role="alertdialog"
      aria-label="La foto no ha salido bien"
      className="absolute inset-0 overflow-y-auto flex flex-col items-center [justify-content:safe_center] p-6 space-y-5 bg-gradient-to-b from-black to-gray-900 z-20"
    >
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-yellow-500/20">
        <i className="bi bi-exclamation-triangle text-4xl text-yellow-400"></i>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white font-bold text-xl">La foto no ha salido bien</p>
        <p className="text-white/90 text-sm max-w-sm">{problem.message}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button onClick={onRepeat} className="btn-primary w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
          <i className="bi bi-camera-fill"></i>
          Repetir la foto
        </button>
        <button onClick={onUse} className="bg-white/20 text-white w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors">
          <i className="bi bi-check2"></i>
          Usar esta foto
        </button>
        <button onClick={onCancel} className="text-white/80 w-full py-2 text-sm underline">
          Cancelar
        </button>
      </div>
      <p className="text-white/70 text-xs text-center max-w-sm">
        Si sigues con esta foto, puede que tengas que tapar los datos a mano.
      </p>
    </div>
  );
}

/**
 * Cámara para hacer la foto del DNI. caras dice qué caras se piden y en qué orden ('anverso', 'reverso', o null si
 * vale cualquiera). Con dos, al terminar la primera se sigue con la segunda sin cerrar la cámara, como quien le da la
 * vuelta al DNI. onCapture(foto, metadatos, cara) se llama al terminar cada cara y onClose al cerrar la cámara, tanto
 * al terminar la última como al cerrarla antes
 */
function CameraCapture({ onCapture, onClose, caras = UNA_CARA_CUALQUIERA }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const guideRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [detectionError, setDetectionError] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [showManualCrop, setShowManualCrop] = useState(false);
  const [capturedFileForCrop, setCapturedFileForCrop] = useState(null);
  // 'foto' mientras se hace la foto y 'analisis' mientras la analiza el servidor. En las dos se apaga la
  // captura automática y no se admiten más fotos. Van separadas porque hacer la foto a resolución completa
  // tarda, y hasta que no está hecha hay que seguir pidiendo que no se mueva el DNI
  const [capturePhase, setCapturePhase] = useState(null);
  const isProcessing = capturePhase !== null;
  // Foto que ha llegado bien al servidor pero no sirve para censurarla sola, con lo que se le dice a la persona
  const [captureProblem, setCaptureProblem] = useState(null);
  // Motivo por el que se repite una foto, que se enseña un momento en el aviso de arriba
  const [retryNotice, setRetryNotice] = useState(null);
  const failedChecksRef = useRef(0);
  const bestAttemptRef = useRef(null);
  const [showFlash, setShowFlash] = useState(false);
  // Si ya se ofrece el botón para hacer la foto a mano (ver MANUAL_BUTTON_DELAY_MS). Una vez sale, se queda. Con el
  // ahorro de datos no hay captura automática (ver useAutoCapture), así que sale desde el principio
  const [manualButtonShown, setManualButtonShown] = useState(() => Boolean(navigator.connection?.saveData));
  const isCapturingRef = useRef(false);
  const isInitializing = useRef(false);
  const hasInitialized = useRef(false);
  // Si se sale de la vista mientras se pide la cámara, por ejemplo con el botón Atrás del navegador,
  // la cámara llega cuando el componente ya no está y nadie la apagaría
  const isMountedRef = useRef(false);
  // Cara que se está pidiendo (su posición en caras) y la que viene después, si queda alguna
  const [paso, setPaso] = useState(0);
  const expectedSide = caras[paso] ?? null;
  const siguienteCara = caras[paso + 1] ?? null;
  // Cara que se acaba de terminar al pasar a la otra, con la miniatura de su foto. Se enseña un momento
  const [caraHecha, setCaraHecha] = useState(null);
  useEffect(() => {
    if (!caraHecha) return undefined;
    const timer = setTimeout(() => setCaraHecha(null), AVISO_CARA_HECHA_MS);
    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(caraHecha.miniatura);
    };
  }, [caraHecha]);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Si el móvil está tumbado (ver CONSULTA_TUMBADO). Cambia al girarlo con la cámara abierta
  const [tumbado, setTumbado] = useState(() => window.matchMedia(CONSULTA_TUMBADO).matches);
  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_TUMBADO);
    const alCambiar = (e) => setTumbado(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const getAvailableDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((device) => device.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('Error getting devices:', err);
      return [];
    }
  }, []);

  const initializeCamera = useCallback(
    async () => {
      if (isInitializing.current || !isMountedRef.current) {
        return;
      }

      try {
        isInitializing.current = true;
        setIsLoading(true);
        setError(null);

        stopCamera();

        const constraints = {
          video: {
            width: { ideal: 3840 },
            height: { ideal: 2160 },
          },
        };

        if (selectedDeviceId) {
          constraints.video.deviceId = { exact: selectedDeviceId };
        } else {
          constraints.video.facingMode = isMobile ? 'environment' : 'user';
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMountedRef.current) {
          // Ya se había salido de la vista. Se apaga la cámara en el acto
          newStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = newStream;

        // Enfoque continuo si la cámara lo permite (Chrome en Android), para que la captura automática
        // no espere a un enfoque que no llega. Si falla, la cámara sigue como venga por defecto
        const [videoTrack] = newStream.getVideoTracks();
        if (videoTrack?.getCapabilities?.().focusMode?.includes('continuous')) {
          videoTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        }

        // Se guarda el vídeo porque la referencia se vacía si se sale de la vista antes de que cargue
        const video = videoRef.current;
        if (video) {
          video.srcObject = newStream;

          await new Promise((resolve) => {
            video.onloadedmetadata = () => {
              video.play().then(resolve).catch(resolve);
            };
          });

          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        console.log('Error name:', err.name);
        setIsLoading(false);

        if (err.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara en tu dispositivo.');
        } else if (err.name === 'NotAllowedError') {
          setError('Acceso a la cámara denegado. Por favor, permite el acceso a la cámara.');
        } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
          setError('Error desconocido al acceder a la cámara.');
        } else if (err.name === 'OverconstrainedError') {
          setError('No se puede usar esa cámara específica. Intenta con otra.');
          setSelectedDeviceId(null);
        } else {
          // El mensaje del navegador va en inglés. Se queda en la consola, arriba
          setError('Error al acceder a la cámara.');
        }
      } finally {
        isInitializing.current = false;
      }
    },
    [selectedDeviceId, isMobile, stopCamera]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const initialize = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      const videoDevices = await getAvailableDevices();

      if (!selectedDeviceId && videoDevices.length > 0 && isMobile) {
        const backCamera = videoDevices.find(
          (device) =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('trasera')
        );

        if (backCamera) {
          setSelectedDeviceId(backCamera.deviceId);
          return;
        }
      }

      await initializeCamera();
    };

    initialize();

    return () => {
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedDeviceId === null || !hasInitialized.current) {
      return;
    }

    initializeCamera();
  }, [selectedDeviceId, initializeCamera]);

  // Dibuja en el lienzo el fotograma del vídeo recortado al recuadro con margen. El recuadro se pasa a píxeles del
  // vídeo teniendo en cuenta object-cover. Si el detector ha visto el DNI hace poco, la zona se amplía para que entre
  // entero aunque se salga del recuadro. Sin recuadro se dibuja el fotograma entero.
  // Devuelve la zona dibujada y dónde medir la nitidez (el DNI, o si no se sabe el recuadro, sin los bordes),
  // las dos en píxeles del vídeo
  const drawVideoArea = (video, canvas, guide) => {
    const guideRect = guide ? guideRectInVideo(video, guide) : null;
    const seen = autoCapture.placementRef.current;
    const cardRect = seen && performance.now() - seen.at < PLACEMENT_MAX_AGE_MS ? seen.docRect : null;
    const area = (guideRect && captureArea(guideRect, cardRect, video.videoWidth, video.videoHeight))
      || { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };

    canvas.width = Math.round(area.width);
    canvas.height = Math.round(area.height);
    canvas.getContext('2d').drawImage(
      video,
      area.x, area.y, area.width, area.height,
      0, 0, canvas.width, canvas.height
    );
    const target = expandRect(cardRect || guideRect || area, -0.15, video.videoWidth, video.videoHeight);
    return { area, target };
  };

  // Con ImageCapture la foto se hace aparte del vídeo, y en algunos móviles sale borrosa aunque el vídeo se vea
  // nítido. Se compara sobre el DNI con el fotograma que se acaba de dibujar y se dice cuál se sube
  const choosePhotoOrFrame = async (photo, canvas, frame, video) => {
    if (!frame.target) return 'foto';
    let bitmap = null;
    try {
      bitmap = await createImageBitmap(photo);
      const { target, area } = frame;
      const frameSharpness = sharpnessOf(canvas, { ...target, x: target.x - area.x, y: target.y - area.y });
      const photoRect = videoRectInPhoto(target, video.videoWidth, video.videoHeight, bitmap.width, bitmap.height);
      const photoSharpness = sharpnessOf(bitmap, photoRect);
      const choice = sharperCapture(photoSharpness, frameSharpness);
      // Con ?depurar-camara queda apuntado para poder revisarlo desde el ordenador
      if (new URLSearchParams(window.location.search).has('depurar-camara')) {
        (window.__capturas ||= []).push({
          fuente: choice,
          nitidezFoto: Math.round(photoSharpness),
          nitidezVideo: Math.round(frameSharpness),
          foto: `${bitmap.width}x${bitmap.height}`,
        });
      }
      return choice;
    } catch (err) {
      console.error('[CameraCapture] No se pudo comparar la foto con el vídeo:', err);
      return 'foto';
    } finally {
      bitmap?.close();
    }
  };

  // Foto a resolución completa si el navegador lo permite (Chrome en Android), salvo que salga más borrosa que el
  // fotograma del vídeo. Si no, el fotograma del vídeo recortado al recuadro con margen
  const grabPhoto = async (video, canvas, guide) => {
    const track = streamRef.current?.getVideoTracks()[0];
    // El fotograma se guarda antes de hacer la foto, porque es el que la captura automática acaba de ver nítido
    const frame = drawVideoArea(video, canvas, guide);

    if ('ImageCapture' in window && track && track.readyState === 'live') {
      try {
        const photo = await new ImageCapture(track).takePhoto();
        console.log('📸 Foto a resolución completa:', photo.size, photo.type);
        if (await choosePhotoOrFrame(photo, canvas, frame, video) === 'foto') return photo;
        console.log('📸 El fotograma del vídeo se ve más nítido que la foto, se usa el fotograma');
      } catch (err) {
        console.warn('⚠️ Falló ImageCapture, se usa el fotograma del vídeo:', err);
      }
    }

    console.log('✂️ Fotograma recortado:', `${canvas.width}x${canvas.height} px`);
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });
  };

  // auto dice si la ha pedido la captura automática o el botón
  const capturePhoto = async (auto = false) => {
    // La captura automática y el botón pueden coincidir. Solo vale la primera
    if (isCapturingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !streamRef.current || !video.videoWidth || !video.videoHeight) {
      console.error('Vídeo o lienzo no disponibles');
      return;
    }

    isCapturingRef.current = true;
    setRetryNotice(null);
    setCapturePhase('foto');
    try {
      const blob = await grabPhoto(video, canvas, guideRef.current);
      if (!blob) {
        setDetectionError({
          type: 'unexpected_error',
          message: 'No se pudo hacer la foto',
          suggestion: 'Intenta nuevamente o reinicia la aplicación.'
        });
        return;
      }
      // La foto ya está hecha. Se avisa con un destello y una vibración corta, y ya se puede mover el DNI
      navigator.vibrate?.(60);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 180);
      setCapturePhase('analisis');
      await processCapturedBlob(blob, auto);
    } finally {
      isCapturingRef.current = false;
      setCapturePhase(null);
    }
  };

  // La cara que se pedía ya tiene foto. Se entrega y, si queda otra, la cámara sigue con ella sin cerrarse. Lo de la
  // cara anterior (fotos fallidas, avisos y la foto para recortar a mano) no vale para la nueva
  const terminarCara = (file, metadata) => {
    onCapture?.(file, metadata, expectedSide);
    if (!siguienteCara) {
      stopCamera();
      onClose();
      return;
    }
    failedChecksRef.current = 0;
    bestAttemptRef.current = null;
    setCaptureProblem(null);
    setDetectionError(null);
    setRetryNotice(null);
    setCapturedFileForCrop(null);
    setCaraHecha({ cara: expectedSide, miniatura: URL.createObjectURL(file) });
    setPaso((actual) => actual + 1);
    // Como al cerrar un aviso con «Intentar de nuevo», el vídeo se vuelve a poner en marcha si se ha parado
    if (videoRef.current?.paused) videoRef.current.play().catch(() => {});
  };

  // Mira con el mismo detector que el editor si en la foto ya recortada se leen los datos (ver
  // FINAL_MIN_DETECTIONS). Devuelve null si no se puede comprobar, y entonces la foto se da por buena como antes
  const checkCapture = async (file) => {
    // Con el ahorro de datos activado no se descarga el modelo solo para esto
    if (navigator.connection?.saveData) return null;
    try {
      return checkFinalPhoto(await detectDniFromFile(file), expectedSide);
    } catch (err) {
      console.error('[CameraCapture] No se pudo comprobar la foto:', err);
      return null;
    }
  };

  // Envía la foto al servidor de recorte
  const processCapturedBlob = async (blob, auto) => {
    const capturedFile = new File([blob], 'dni-camera-capture.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    // Con ImageCapture la foto puede pasar de 12 MP y del límite del servidor. Se reduce igual
    // que una foto subida desde la galería y, si falla, se sigue con la original
    let uploadFile = capturedFile;
    try {
      uploadFile = await prepareImageForUpload(capturedFile);
    } catch (resizeError) {
      console.error('[CameraCapture] No se pudo reducir la foto:', resizeError);
    }

    // Guardar archivo para posible recorte manual
    setCapturedFileForCrop(uploadFile);
    setDetectionError(null);

    try {
      const resp = await processWithYolo(uploadFile);

      if (resp.ok && resp.blob) {
        // ✅ ÉXITO: DNI detectado y procesado correctamente
        const processedFile = new File([resp.blob], 'dni-camera-processed.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        console.log('✅ [capturePhoto] YOLO procesado exitosamente, confianza:', resp.confidence);
        const metadata = { yolo: { ok: true, confidence: resp.confidence } };
        const check = await checkCapture(processedFile);
        if (!check || check.ok) {
          terminarCara(processedFile, metadata);
          return;
        }

        // El servidor ha recortado el DNI, pero en esta foto no se leen bien los datos.
        // Se guarda la mejor por si al final se decide seguir con ella
        console.warn('⚠️ [capturePhoto] La foto no sirve:', check.reason, check.detections);
        failedChecksRef.current += 1;
        const attempt = { file: processedFile, metadata, detections: check.detections, rightSide: check.reason !== 'side' };
        const best = bestAttemptRef.current;
        // Vale más una foto de la cara pedida que una de la otra cara, aunque esta dé más detecciones
        if (!best || (attempt.rightSide && !best.rightSide)
          || (attempt.rightSide === best.rightSide && attempt.detections > best.detections)) {
          bestAttemptRef.current = attempt;
        }
        if (auto && failedChecksRef.current <= MAX_AUTO_RETRIES) {
          // La cámara sigue abierta y la captura automática la repite sola
          setRetryNotice(check.hint);
        } else {
          setCaptureProblem({ message: PROBLEM_TEXTS[check.reason] || check.hint });
        }
      } else {
        // ❌ ERROR: Problemas con la detección
        console.warn(`⚠️ [capturePhoto] Error de detección: ${resp.errorType}`, resp);

        setDetectionError({
          type: resp.errorType,
          message: resp.message,
          suggestion: resp.suggestion,
          confidence: resp.confidence,
          minRequired: resp.minRequired
        });
      }
    } catch (err) {
      console.error('[CameraCapture] Error inesperado:', err);

      setDetectionError({
        type: 'unexpected_error',
        message: 'Error inesperado al procesar la imagen',
        suggestion: 'Intenta nuevamente o reinicia la aplicación.'
      });
    }
  };

  const handleAutoCapture = () => {
    capturePhoto(true);
  };

  // El motivo por el que se repite la foto se enseña un momento y después vuelven los avisos en directo
  useEffect(() => {
    if (!retryNotice) return undefined;
    const timer = setTimeout(() => setRetryNotice(null), RETRY_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [retryNotice]);

  const handleRepeatPhoto = () => {
    failedChecksRef.current = 0;
    setCaptureProblem(null);
  };

  const handleUseAnyway = () => {
    const best = bestAttemptRef.current;
    if (best) terminarCara(best.file, best.metadata);
  };

  const handleDeviceChange = (deviceId) => {
    if (deviceId !== selectedDeviceId) {
      setSelectedDeviceId(deviceId);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setDetectionError(null);
    initializeCamera();
  };

  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case 'no_detection':
        return 'bi-camera-video-off';
      case 'no_mask':
        return 'bi-eye-slash';
      case 'low_confidence':
        return 'bi-exclamation-triangle';
      case 'extraction_failed':
        return 'bi-scissors';
      case 'timeout':
        return 'bi-clock';
      case 'network_error':
        return 'bi-wifi-off';
      default:
        return 'bi-exclamation-circle';
    }
  };

  const getErrorTitle = (errorType) => {
    switch (errorType) {
      case 'no_detection':
        return 'No se detectó el DNI';
      case 'no_mask':
        return 'DNI no reconocido';
      case 'low_confidence':
        return 'Imagen poco clara';
      case 'extraction_failed':
        return 'No se pudo extraer el DNI';
      case 'timeout':
        return 'Tiempo agotado';
      case 'network_error':
        return 'Error de conexión';
      default:
        return 'Error al procesar';
    }
  };

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('⚠️ Navegador bloqueó el acceso a la cámara (contexto no seguro)');
    navigator.mediaDevices = { getUserMedia: () => Promise.reject(new Error('No disponible')) };
  }

  // Captura automática. Solo mira mientras se ve la cámara sin errores ni fotos en curso
  const autoCapture = useAutoCapture({
    videoRef,
    guideRef,
    enabled: !isLoading && !error && !detectionError && !captureProblem && !isProcessing && !showManualCrop,
    expectedSide,
    warmupMs: retryNotice ? RETRY_PAUSE_MS : caraHecha ? ESPERA_OTRA_CARA_MS : 0,
    onReady: handleAutoCapture,
  });

  // Qué cara se pide, para los textos. Con las dos caras, también por cuál se va
  const nombreCara = expectedSide ? NOMBRE_CARA[expectedSide] : null;
  const titulo = nombreCara ? `Parte ${nombreCara}` : 'Capturar DNI';
  const contador = caras.length > 1 ? `${paso + 1} de ${caras.length}` : null;
  const avisoColocar = nombreCara ? `Coloca la parte ${nombreCara} dentro del recuadro` : HINTS.place;

  // Mientras se hace la foto el recuadro sigue en verde y se pide no moverse. Justo después de una foto
  // fallida se enseña el motivo en vez del aviso en directo, y al pasar a la otra cara, que la primera está lista
  const isTakingPhoto = capturePhase === 'foto';
  const avisoCaraHecha = !isTakingPhoto && caraHecha;
  const guideTone = isProcessing || autoCapture.status === 'listo' || autoCapture.status === 'disparado'
    ? 'listo'
    : retryNotice || autoCapture.status === 'ajustando' ? 'ajuste' : 'neutral';
  const guideProgress = isTakingPhoto ? 1 : autoCapture.progress;
  const hintText = isTakingPhoto
    ? HINTS.capturing
    : retryNotice || (autoCapture.hint === HINTS.place ? avisoColocar : autoCapture.hint) || avisoColocar;
  const hintBackground = isTakingPhoto || avisoCaraHecha
    ? HINT_BACKGROUNDS.listo
    : retryNotice ? HINT_BACKGROUNDS.ajustando : HINT_BACKGROUNDS[autoCapture.status] || 'bg-black/70';
  const isAutoAvailable = autoCapture.status !== 'manual';
  // El botón para hacer la foto a mano sale cuando la captura automática lleva MANUAL_BUTTON_DELAY_MS sin hacerla, y
  // enseguida si no hay captura automática (no carga el detector o está activado el ahorro de datos)
  const autoPhase = AUTO_PHASES[autoCapture.status] || null;
  useEffect(() => {
    if (manualButtonShown || !autoPhase) return undefined;
    const timer = setTimeout(() => setManualButtonShown(true), autoPhase === 'manual' ? 0 : MANUAL_BUTTON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoPhase, manualButtonShown]);
  const showManualButton = manualButtonShown || !isAutoAvailable;
  // Con un aviso que tapa la cámara y trae sus propios botones no se ofrece hacer otra foto
  const hasBlockingOverlay = Boolean(detectionError || captureProblem);

  const processingOverlay = capturePhase === 'analisis' && (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
        <p>Analizando DNI...</p>
      </div>
    </div>
  );

  const flashOverlay = showFlash && (
    <div className="absolute inset-0 bg-white/80 z-40 pointer-events-none"></div>
  );

  // Valores en directo para ajustar los umbrales en un móvil, abriendo la web con ?depurar-camara
  const renderDebugPanel = (positionClass) => autoCapture.debug && !hasBlockingOverlay && (
    <div
      data-captura-depuracion
      className={`absolute ${positionClass} z-30 rounded-lg bg-black/75 px-3 py-2 font-mono text-[11px] leading-tight text-white pointer-events-none`}
    >
      {Object.entries(autoCapture.debug).map(([name, value]) => (
        <div key={name}>{name} {value}</div>
      ))}
    </div>
  );

  // Mientras el servidor analiza la foto no se enseña, porque quedaría debajo de «Analizando DNI».
  // Los lectores de pantalla lo leen cada vez que cambia. Al pasar a la otra cara lleva la miniatura de la primera, y
  // con el móvil tumbado va en una línea para que quepa en la fila de arriba sin tapar el recuadro
  const hintPill = capturePhase !== 'analisis' && (
    <div
      data-captura-estado={autoCapture.status}
      data-cara-hecha={avisoCaraHecha ? caraHecha.cara : undefined}
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-3 ${hintBackground} backdrop-blur-sm rounded-2xl ${avisoCaraHecha ? `pl-3 pr-5 ${tumbado ? 'py-1.5' : 'py-2'}` : 'px-6 py-3'} shadow-xl transition-colors duration-200`}
    >
      {avisoCaraHecha ? (
        <>
          <img src={caraHecha.miniatura} alt="" className={`${tumbado ? 'h-8' : 'h-10'} w-auto shrink-0 rounded-md border border-white/60`} />
          <p className="text-white text-sm text-left">
            <span className={`${tumbado ? '' : 'block'} font-semibold`}>Parte {NOMBRE_CARA[caraHecha.cara]} lista{tumbado ? '.' : ''}</span>{' '}
            <span className={tumbado ? '' : 'block'}>Ahora dale la vuelta al DNI</span>
          </p>
        </>
      ) : (
        <p className="text-white text-sm font-semibold">{hintText}</p>
      )}
    </div>
  );

  // Vista móvil fullscreen
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col" data-captura-cara={expectedSide || undefined} data-captura-paso={paso + 1}>
        {/* Con el móvil tumbado el título solo lo leen los lectores de pantalla, para dejar la fila de arriba al aviso */}
        <div className={`absolute top-0 left-0 right-0 z-20 ${tumbado ? 'p-3' : 'p-4'} flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent`}>
          <h3 className={tumbado ? 'sr-only' : 'text-white font-semibold text-lg flex items-center'}>
            <i className="bi bi-camera mr-2"></i>
            {titulo}
            {contador && (
              <>
                {' '}
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">{contador}</span>
              </>
            )}
          </h3>
          <button
            onClick={handleClose}
            aria-label="Cerrar la cámara"
            className="ml-auto text-white text-2xl w-11 h-11 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-red-500/20">
              <i className="bi bi-exclamation-triangle text-5xl text-red-500"></i>
            </div>
            <p className="text-white text-center font-medium px-4">{error}</p>
            <div className="flex flex-col gap-3 w-full max-w-sm px-4">
              <button onClick={handleRetry} className="btn-primary w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                <i className="bi bi-arrow-clockwise"></i>
                Intentar de nuevo
              </button>
              <button onClick={handleClose} className="bg-white/20 text-white w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors">
                <i className="bi bi-arrow-left"></i>
                Volver atrás
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* min-h-0 para que el vídeo no estire la zona más allá de la pantalla. Con el móvil tumbado el vídeo
                (16:9 a lo ancho) medía más que la pantalla y el recuadro quedaba centrado por debajo */}
            <div className="flex-1 relative min-h-0">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                    <p>Iniciando cámara...</p>
                  </div>
                </div>
              )}

              {/* Video siempre visible */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${hasBlockingOverlay ? 'invisible' : 'visible'}`}
              />

              {!isLoading && !hasBlockingOverlay && (
                <DNIGuide guideRef={guideRef} isMobile={isMobile} tumbado={tumbado} tone={guideTone} progress={guideProgress} />
              )}

              {renderDebugPanel('left-2 top-36')}
              {processingOverlay}
              {flashOverlay}

              {captureProblem && (
                <CaptureProblem
                  problem={captureProblem}
                  onRepeat={handleRepeatPhoto}
                  onUse={handleUseAnyway}
                  onCancel={handleClose}
                />
              )}

              {/* Overlay de error */}
              {detectionError && (
                <div className="absolute inset-0 overflow-y-auto flex flex-col items-center [justify-content:safe_center] p-6 space-y-6 bg-gradient-to-b from-black to-gray-900 z-20">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center bg-yellow-500/20 animate-pulse">
                    <i className={`bi ${getErrorIcon(detectionError.type)} text-5xl text-yellow-400`}></i>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-white font-bold text-xl">{getErrorTitle(detectionError.type)}</p>
                    <p className="text-white/90 text-sm px-4">{detectionError.message}</p>
                    {detectionError.confidence !== undefined && detectionError.confidence !== null && (
                      <p className="text-yellow-400 text-xs">
                        Confianza: {porcentaje(detectionError.confidence, 1)}
                        {detectionError.minRequired && ` (mínimo requerido: ${porcentaje(detectionError.minRequired, 0)})`}
                      </p>
                    )}
                  </div>
                  {detectionError.suggestion && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-sm">
                      <p className="text-white text-sm font-semibold mb-2">💡 Consejos:</p>
                      <p className="text-white/90 text-xs whitespace-pre-line">{detectionError.suggestion}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 w-full max-w-sm px-4">
                    <button
                      onClick={() => {
                        setDetectionError(null);
                        if (videoRef.current && videoRef.current.paused) {
                          videoRef.current.play().catch(console.error);
                        }
                      }}
                      className="btn-primary w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <i className="bi bi-camera-fill"></i>
                      Intentar de nuevo
                    </button>

                    {/* Botón de recorte manual */}
                    {capturedFileForCrop && (
                      <button
                        onClick={() => setShowManualCrop(true)}
                        className="bg-blue-600 text-white w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                      >
                        <i className="bi bi-crop"></i>
                        Recortar manualmente
                      </button>
                    )}

                    <button onClick={handleClose} className="bg-white/20 text-white w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors">
                      <i className="bi bi-x"></i>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div
                className={`absolute ${tumbado ? 'top-3' : 'top-20'} left-0 right-0 text-center px-4 pointer-events-none z-10`}
                style={tumbado ? { right: COLUMNA_BOTON } : undefined}
              >
                {hintPill}
              </div>
            </div>

            {/* Con el móvil tumbado el botón va en una columna a la derecha, redondo como el de la cámara del móvil.
                Hasta que sale (ver MANUAL_BUTTON_DELAY_MS), en su sitio se dice que la foto se hace sola. Empieza bajo
                la fila de arriba porque, desde arriba del todo, tapaba la X, que se veía gris y no se podía pulsar */}
            {!hasBlockingOverlay && tumbado && (
              <div
                aria-live="polite"
                className="absolute bottom-0 right-0 z-20 flex flex-col items-center justify-center gap-2 px-3 bg-gradient-to-l from-black/80 to-transparent"
                style={{ width: COLUMNA_BOTON, top: FILA_ARRIBA }}
              >
                {showManualButton ? (
                  <>
                    {isAutoAvailable && (
                      <p className="text-white/80 text-[11px] leading-snug text-center">
                        ¿No se hace sola? Hazla tú
                      </p>
                    )}
                    <button
                      onClick={() => capturePhoto(false)}
                      disabled={isLoading || isProcessing}
                      aria-label="Capturar foto"
                      className="btn-primary w-[76px] h-[76px] rounded-full shadow-2xl flex items-center justify-center disabled:opacity-50"
                    >
                      <i className="bi bi-camera-fill text-3xl" aria-hidden="true"></i>
                    </button>
                    <span className="text-white text-sm font-semibold" aria-hidden="true">Capturar foto</span>
                  </>
                ) : (
                  <div data-captura-sola className="text-center text-white">
                    <p className="text-base font-bold leading-snug">La foto se hace sola</p>
                    <p className="text-white/80 text-xs leading-snug mt-1">No hace falta pulsar nada</p>
                  </div>
                )}
              </div>
            )}

            {/* Con un aviso encima no se enseña, porque en pantallas pequeñas tapaba sus botones. Hasta que sale el botón
                (ver MANUAL_BUTTON_DELAY_MS), en su sitio se dice que la foto se hace sola */}
            {!hasBlockingOverlay && !tumbado && (
              <div aria-live="polite" className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20">
                {showManualButton ? (
                  <>
                    {isAutoAvailable && (
                      <p className="text-white/90 text-sm text-center mb-3">
                        ¿No se hace sola? Puedes hacerla tú
                      </p>
                    )}
                    <button onClick={() => capturePhoto(false)} disabled={isLoading || isProcessing} className="w-full btn-primary py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50">
                      <i className="bi bi-camera-fill text-2xl"></i>
                      Capturar foto
                    </button>
                  </>
                ) : (
                  <div data-captura-sola className="text-center text-white py-2">
                    <p className="text-xl font-bold">La foto se hace sola</p>
                    <p className="text-white/80 text-sm mt-1">No hace falta pulsar nada</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Modal de recorte manual */}
        {showManualCrop && capturedFileForCrop && (
          <ManualCropModal
            file={capturedFileForCrop}
            errorInfo={detectionError}
            onCrop={(croppedFile) => {
              console.log('✂️ [CameraCapture] Imagen recortada manualmente');
              setShowManualCrop(false);
              setDetectionError(null);
              setCapturedFileForCrop(null);

              // La imagen recortada se entrega directamente y, si queda otra cara, se sigue con ella
              terminarCara(croppedFile, {
                yolo: { ok: true, manualCrop: true },
                manualCrop: true
              });
            }}
            onCancel={() => {
              setShowManualCrop(false);
            }}
          />
        )}
      </div>
    );
  }

  // Vista desktop
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" data-captura-cara={expectedSide || undefined} data-captura-paso={paso + 1}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        <div className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0" style={{ borderColor: 'var(--color-border-default)' }}>
          <h3 className="text-lg sm:text-xl font-bold flex items-center" style={{ color: 'var(--color-text-primary)' }}>
            <i className="bi bi-camera mr-2 text-xl sm:text-2xl" style={{ color: 'var(--color-primary)' }}></i>
            {titulo}
            {contador && (
              <>
                {' '}
                <span className="ml-2 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{contador}</span>
              </>
            )}
          </h3>
          <button onClick={handleClose} className="text-2xl hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div className="p-3 sm:p-4 border-b flex-shrink-0" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-default)' }}>
          <div className="flex items-center justify-center text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <i className="bi bi-info-circle mr-2 flex-shrink-0" style={{ color: 'var(--color-primary)' }}></i>
            <span className="text-center">
              {isAutoAvailable
                ? 'Coloca el DNI dentro del recuadro. La foto se hace sola cuando se ve bien'
                : 'Coloca el DNI dentro del recuadro y captura cuando esté alineado'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)' }}>
                <i className="bi bi-exclamation-triangle text-4xl" style={{ color: 'var(--color-error)' }}></i>
              </div>
              <p className="text-center font-medium max-w-md px-4" style={{ color: 'var(--color-error)' }}>
                {error}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md px-4">
                <button onClick={handleRetry} className="btn-primary flex-1 py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <i className="bi bi-arrow-clockwise"></i>
                  Intentar de nuevo
                </button>
                <button onClick={handleClose} className="btn-secondary flex-1 py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <i className="bi bi-arrow-left"></i>
                  Volver atrás
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                      <p className="text-sm">Procesando imagen...</p>
                    </div>
                  </div>
                )}

                {/* Video siempre visible */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-auto max-h-[60vh] min-h-[300px] sm:min-h-[400px] object-contain ${hasBlockingOverlay ? 'invisible' : 'visible'}`}
                />

                {!isLoading && !hasBlockingOverlay && (
                  <>
                    <DNIGuide guideRef={guideRef} isMobile={isMobile} tone={guideTone} progress={guideProgress} />
                    <div className="absolute top-3 left-0 right-0 text-center px-4 pointer-events-none z-10">
                      {hintPill}
                    </div>
                  </>
                )}

                {renderDebugPanel('left-2 bottom-2')}
                {processingOverlay}
                {flashOverlay}

                {captureProblem && (
                  <CaptureProblem
                    problem={captureProblem}
                    onRepeat={handleRepeatPhoto}
                    onUse={handleUseAnyway}
                    onCancel={handleClose}
                  />
                )}

                {/* Overlay de error */}
                {detectionError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center py-8 space-y-6 bg-gradient-to-b from-gray-900 to-black z-20">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                      <i className={`bi ${getErrorIcon(detectionError.type)} text-4xl`} style={{ color: 'var(--color-warning)' }}></i>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>{getErrorTitle(detectionError.type)}</p>
                      <p className="text-base max-w-md" style={{ color: 'var(--color-text-secondary)' }}>{detectionError.message}</p>
                      {detectionError.confidence !== undefined && detectionError.confidence !== null && (
                        <p className="text-sm" style={{ color: 'var(--color-warning)' }}>
                          Confianza: {porcentaje(detectionError.confidence, 1)}
                          {detectionError.minRequired && ` (mínimo: ${porcentaje(detectionError.minRequired, 0)})`}
                        </p>
                      )}
                    </div>
                    {detectionError.suggestion && (
                      <div className="p-4 rounded-lg max-w-md" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                        <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>💡 Consejos:</p>
                        <p className="text-sm whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{detectionError.suggestion}</p>
                      </div>
                    )}
                    <div className="flex flex-col gap-3 w-full max-w-md">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setDetectionError(null);
                            if (videoRef.current && videoRef.current.paused) {
                              videoRef.current.play().catch(console.error);
                            }
                          }}
                          className="btn-primary flex-1 py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2"
                        >
                          <i className="bi bi-camera"></i>
                          Intentar de nuevo
                        </button>
                        <button onClick={handleClose} className="btn-secondary flex-1 py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2">
                          <i className="bi bi-x"></i>
                          Cancelar
                        </button>
                      </div>

                      {/* Botón de recorte manual */}
                      {capturedFileForCrop && (
                        <button
                          onClick={() => setShowManualCrop(true)}
                          className="w-full py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          <i className="bi bi-crop"></i>
                          Recortar manualmente
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Hasta que sale el botón (ver MANUAL_BUTTON_DELAY_MS), en su sitio se dice que la foto se hace sola. Con
                  un aviso encima no se enseña ninguno de los dos, porque el aviso trae sus propios botones */}
              {!hasBlockingOverlay && (
                <div aria-live="polite">
                  {showManualButton ? (
                    <div className="space-y-2">
                      {isAutoAvailable && (
                        <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          ¿No se hace sola? Puedes hacerla tú
                        </p>
                      )}
                      <button onClick={() => capturePhoto(false)} disabled={isLoading || isProcessing} className="btn-primary w-full py-4 px-8 text-base sm:text-lg font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2">
                        <i className="bi bi-camera text-xl"></i>
                        Capturar foto
                      </button>
                    </div>
                  ) : (
                    <div data-captura-sola className="text-center py-2">
                      <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>La foto se hace sola</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No hace falta pulsar nada</p>
                    </div>
                  )}
                </div>
              )}

              {!isMobile && devices.length > 1 && (
                <div className="flex justify-center">
                  <select value={selectedDeviceId || ''} onChange={(e) => handleDeviceChange(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm" style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Cámara ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-center text-xs sm:text-sm px-4" style={{ color: 'var(--color-text-secondary)' }}>
                <p className="flex items-center justify-center gap-1">
                  <i className="bi bi-lightbulb flex-shrink-0" style={{ color: 'var(--color-warning)' }}></i>
                  <span>Usa buena iluminación y mantén el DNI horizontal para mejores resultados</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Modal de recorte manual (desktop) */}
        {showManualCrop && capturedFileForCrop && (
          <ManualCropModal
            file={capturedFileForCrop}
            errorInfo={detectionError}
            onCrop={(croppedFile) => {
              console.log('✂️ [CameraCapture] Imagen recortada manualmente');
              setShowManualCrop(false);
              setDetectionError(null);
              setCapturedFileForCrop(null);

              // La imagen recortada se entrega directamente y, si queda otra cara, se sigue con ella
              terminarCara(croppedFile, {
                yolo: { ok: true, manualCrop: true },
                manualCrop: true
              });
            }}
            onCancel={() => {
              setShowManualCrop(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default CameraCapture;