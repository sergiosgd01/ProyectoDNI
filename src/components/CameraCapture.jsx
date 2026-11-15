import React, { useRef, useState, useEffect, useCallback } from 'react';
import { processWithYolo } from '../services/processWithYolo';
import ManualCropModal from './ManualCropModal';
import { useAutoCapture } from '../hooks/useAutoCapture';
import { CROP_MARGIN, expandRect, guideRectInVideo } from '../utils/liveCapture';
import { prepareImageForUpload } from '../utils/imageResize';

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

/**
 * Recuadro donde se coloca el DNI. Va fuera de CameraCapture para que no se vuelva a crear en cada
 * render, que con la captura automática son varios por segundo.
 * Solo se oscurece lo de fuera, para que el DNI se vea con su luz real.
 */
function DNIGuide({ guideRef, isMobile, tone, progress }) {
  const colors = GUIDE_TONES[tone] || GUIDE_TONES.neutral;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        ref={guideRef}
        data-guia-dni
        className={`relative border-2 ${colors.border} rounded-xl shadow-2xl bg-transparent transition-colors duration-200`}
        style={{
          width: isMobile ? '80%' : '60%',
          aspectRatio: '1.586',
          maxWidth: '600px',
          maxHeight: '70vh',
        }}
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

function CameraCapture({ onCapture, onClose, expectedSide = null }) {
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
  // Mientras se hace la foto y la analiza el servidor. Apaga la captura automática y evita fotos dobles
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const isCapturingRef = useRef(false);
  const isInitializing = useRef(false);
  const hasInitialized = useRef(false);
  // Si se sale de la vista mientras se pide la cámara, por ejemplo con el botón Atrás del navegador,
  // la cámara llega cuando el componente ya no está y nadie la apagaría
  const isMountedRef = useRef(false);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

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
          setError(`Error al acceder a la cámara: ${err.message}`);
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

  // Foto a resolución completa si el navegador lo permite (Chrome en Android) y, si no, el fotograma
  // del vídeo recortado al recuadro con margen
  const grabPhoto = async (video, canvas, guide) => {
    const track = streamRef.current?.getVideoTracks()[0];

    if ('ImageCapture' in window && track && track.readyState === 'live') {
      try {
        const imageCapture = new ImageCapture(track);
        const photo = await imageCapture.takePhoto();
        console.log('📸 Foto a resolución completa:', photo.size, photo.type);
        return photo;
      } catch (err) {
        console.warn('⚠️ Falló ImageCapture, se usa el fotograma del vídeo:', err);
      }
    }

    // El recuadro se pasa a píxeles del vídeo teniendo en cuenta object-cover y se deja un margen
    // para no cortar el borde del DNI. Sin recuadro se envía el fotograma entero
    const guideRect = guide ? guideRectInVideo(video, guide) : null;
    const area = (guideRect && expandRect(guideRect, CROP_MARGIN, video.videoWidth, video.videoHeight))
      || { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };

    canvas.width = Math.round(area.width);
    canvas.height = Math.round(area.height);
    canvas.getContext('2d').drawImage(
      video,
      area.x, area.y, area.width, area.height,
      0, 0, canvas.width, canvas.height
    );
    console.log('✂️ Fotograma recortado:', `${canvas.width}x${canvas.height} px`);

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });
  };

  const capturePhoto = async () => {
    // La captura automática y el botón pueden coincidir. Solo vale la primera
    if (isCapturingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !streamRef.current || !video.videoWidth || !video.videoHeight) {
      console.error('Vídeo o lienzo no disponibles');
      return;
    }

    isCapturingRef.current = true;
    setIsProcessing(true);
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
      await processCapturedBlob(blob);
    } finally {
      isCapturingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Envía la foto al servidor de recorte
  const processCapturedBlob = async (blob) => {
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
        onCapture?.(processedFile, { yolo: { ok: true, confidence: resp.confidence } });
        stopCamera();
        onClose();
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

  // La captura automática avisa con un destello y una vibración corta, y hace la foto
  const handleAutoCapture = () => {
    navigator.vibrate?.(60);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 180);
    capturePhoto();
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
    enabled: !isLoading && !error && !detectionError && !isProcessing && !showManualCrop,
    expectedSide,
    onReady: handleAutoCapture,
  });

  const guideTone = autoCapture.status === 'listo' || autoCapture.status === 'disparado'
    ? 'listo'
    : autoCapture.status === 'ajustando' ? 'ajuste' : 'neutral';
  const hintText = autoCapture.hint || 'Coloca el DNI dentro del recuadro';
  const hintBackground = HINT_BACKGROUNDS[autoCapture.status] || 'bg-black/70';
  const isAutoAvailable = autoCapture.status !== 'manual';

  const processingOverlay = isProcessing && (
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
  const renderDebugPanel = (positionClass) => autoCapture.debug && !detectionError && (
    <div
      data-captura-depuracion
      className={`absolute ${positionClass} z-30 rounded-lg bg-black/75 px-3 py-2 font-mono text-[11px] leading-tight text-white pointer-events-none`}
    >
      {Object.entries(autoCapture.debug).map(([name, value]) => (
        <div key={name}>{name} {value}</div>
      ))}
    </div>
  );

  const hintPill = (
    <div
      data-captura-estado={autoCapture.status}
      className={`inline-block ${hintBackground} backdrop-blur-sm rounded-2xl px-6 py-3 shadow-xl transition-colors duration-200`}
    >
      <p className="text-white text-sm font-semibold">{hintText}</p>
    </div>
  );

  // Vista móvil fullscreen
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <h3 className="text-white font-semibold text-lg flex items-center">
            <i className="bi bi-camera mr-2"></i>
            Capturar DNI
          </h3>
          <button
            onClick={handleClose}
            className="text-white text-2xl w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
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
            <div className="flex-1 relative">
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
                className={`w-full h-full object-cover ${detectionError ? 'invisible' : 'visible'}`}
              />

              {!isLoading && !detectionError && (
                <DNIGuide guideRef={guideRef} isMobile={isMobile} tone={guideTone} progress={autoCapture.progress} />
              )}

              {renderDebugPanel('left-2 top-36')}
              {processingOverlay}
              {flashOverlay}

              {/* Overlay de error */}
              {detectionError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-6 bg-gradient-to-b from-black to-gray-900 z-20">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center bg-yellow-500/20 animate-pulse">
                    <i className={`bi ${getErrorIcon(detectionError.type)} text-5xl text-yellow-400`}></i>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-white font-bold text-xl">{getErrorTitle(detectionError.type)}</p>
                    <p className="text-white/90 text-sm px-4">{detectionError.message}</p>
                    {detectionError.confidence !== undefined && detectionError.confidence !== null && (
                      <p className="text-yellow-400 text-xs">
                        Confianza: {(detectionError.confidence * 100).toFixed(1)}%
                        {detectionError.minRequired && ` (mínimo requerido: ${(detectionError.minRequired * 100).toFixed(0)}%)`}
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

              <div className="absolute top-20 left-0 right-0 text-center px-4 pointer-events-none z-10">
                {hintPill}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20">
              <button onClick={capturePhoto} disabled={isLoading || isProcessing} className="w-full btn-primary py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50">
                <i className="bi bi-camera-fill text-2xl"></i>
                Capturar Foto
              </button>
              {isAutoAvailable && (
                <p className="text-white/80 text-xs text-center mt-2">
                  También se hace sola cuando el DNI se ve bien
                </p>
              )}
            </div>
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

              // Enviar imagen recortada al siguiente paso directamente
              onCapture?.(croppedFile, {
                yolo: { ok: true, manualCrop: true },
                manualCrop: true
              });
              stopCamera();
              onClose();
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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        <div className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0" style={{ borderColor: 'var(--color-border-default)' }}>
          <h3 className="text-lg sm:text-xl font-bold flex items-center" style={{ color: 'var(--color-text-primary)' }}>
            <i className="bi bi-camera mr-2 text-xl sm:text-2xl" style={{ color: 'var(--color-primary)' }}></i>
            Capturar DNI
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
                  className={`w-full h-auto max-h-[60vh] min-h-[300px] sm:min-h-[400px] object-contain ${detectionError ? 'invisible' : 'visible'}`}
                />

                {!isLoading && !detectionError && (
                  <>
                    <DNIGuide guideRef={guideRef} isMobile={isMobile} tone={guideTone} progress={autoCapture.progress} />
                    <div className="absolute top-3 left-0 right-0 text-center px-4 pointer-events-none z-10">
                      {hintPill}
                    </div>
                  </>
                )}

                {renderDebugPanel('left-2 bottom-2')}
                {processingOverlay}
                {flashOverlay}

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
                          Confianza: {(detectionError.confidence * 100).toFixed(1)}%
                          {detectionError.minRequired && ` (mínimo: ${(detectionError.minRequired * 100).toFixed(0)}%)`}
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

              <button onClick={capturePhoto} disabled={isLoading || isProcessing} className="btn-primary w-full py-4 px-8 text-base sm:text-lg font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2">
                <i className="bi bi-camera text-xl"></i>
                Capturar Foto
              </button>

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

              // Enviar imagen recortada al siguiente paso directamente
              onCapture?.(croppedFile, {
                yolo: { ok: true, manualCrop: true },
                manualCrop: true
              });
              stopCamera();
              onClose();
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