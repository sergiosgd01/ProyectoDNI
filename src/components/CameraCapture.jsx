import React, { useRef, useState, useEffect, useCallback } from 'react';
import { processWithYolo } from '../services/processWithYolo';

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const guideRef = useRef(null); // ✅ Referencia al rectángulo guía
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [detectionError, setDetectionError] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const isInitializing = useRef(false);
  const hasInitialized = useRef(false);

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
      if (isInitializing.current) {
        return;
      }

      try {
        isInitializing.current = true;
        setIsLoading(true);
        setError(null);

        stopCamera();

        const constraints = {
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
        };

        if (selectedDeviceId) {
          constraints.video.deviceId = { exact: selectedDeviceId };
        } else {
          constraints.video.facingMode = isMobile ? 'environment' : 'user';
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = newStream;

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;

          await new Promise((resolve) => {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().then(resolve).catch(resolve);
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

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const guide = guideRef.current;

    if (!video || !canvas || !streamRef.current) {
      console.error('Video o canvas no disponibles');
      return;
    }

    if (!guide) {
      console.error('Guía de rectángulo no disponible');
      return;
    }

    const context = canvas.getContext('2d');
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) {
      console.error('Video no tiene dimensiones válidas');
      return;
    }

    // 🎯 OBTENER POSICIÓN EXACTA DEL RECTÁNGULO GUÍA EN PANTALLA
    const videoRect = video.getBoundingClientRect();
    const guideRect = guide.getBoundingClientRect();

    console.log('📺 Dimensiones del video:', {
      real: { width: videoWidth, height: videoHeight },
      display: { width: videoRect.width, height: videoRect.height },
      position: { top: videoRect.top, left: videoRect.left }
    });

    console.log('📐 Dimensiones del rectángulo guía:', {
      width: guideRect.width,
      height: guideRect.height,
      position: { top: guideRect.top, left: guideRect.left }
    });

    // Calcular posición relativa del rectángulo dentro del video (en píxeles de pantalla)
    const relativeX = guideRect.left - videoRect.left;
    const relativeY = guideRect.top - videoRect.top;
    const relativeWidth = guideRect.width;
    const relativeHeight = guideRect.height;

    console.log('🎯 Posición relativa de la guía en pantalla:', {
      x: relativeX,
      y: relativeY,
      width: relativeWidth,
      height: relativeHeight
    });

    // Calcular factores de escala
    const scaleX = videoWidth / videoRect.width;
    const scaleY = videoHeight / videoRect.height;

    console.log('📊 Factores de escala:', { scaleX, scaleY });

    // Convertir a coordenadas del video real
    const cropX = relativeX * scaleX;
    const cropY = relativeY * scaleY;
    const cropWidth = relativeWidth * scaleX;
    const cropHeight = relativeHeight * scaleY;

    // Asegurar que las coordenadas estén dentro de los límites
    const finalCropX = Math.max(0, Math.min(cropX, videoWidth - 1));
    const finalCropY = Math.max(0, Math.min(cropY, videoHeight - 1));
    const finalCropWidth = Math.min(cropWidth, videoWidth - finalCropX);
    const finalCropHeight = Math.min(cropHeight, videoHeight - finalCropY);

    console.log('✂️ Coordenadas finales de recorte:', {
      x: finalCropX,
      y: finalCropY,
      width: finalCropWidth,
      height: finalCropHeight
    });

    // Configurar canvas y recortar
    canvas.width = finalCropWidth;
    canvas.height = finalCropHeight;

    context.drawImage(
      video,
      finalCropX, finalCropY, finalCropWidth, finalCropHeight,
      0, 0, finalCropWidth, finalCropHeight
    );

    // MOSTRAR IMAGEN RECORTADA EN CONSOLA
    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.7);
    console.log('🖼️ VISTA PREVIA DE LA IMAGEN RECORTADA:');
    console.log('%c ', `
      font-size: 1px;
      padding: ${Math.min(finalCropHeight / 4, 200)}px ${Math.min(finalCropWidth / 4, 300)}px;
      background-image: url(${previewDataUrl});
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    `);
    console.log('👆 Haz clic derecho en la imagen de arriba → "Open Image in New Tab" para verla completa');
    console.log('📊 Tamaño recortado:', `${finalCropWidth.toFixed(0)}x${finalCropHeight.toFixed(0)} px`);

    // Convertir a blob y procesar con YOLO
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          console.error('Error al crear el blob de la imagen');
          return;
        }

        const croppedFile = new File([blob], 'dni-camera-cropped.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        console.log('✂️ Imagen recortada creada:', {
          width: canvas.width,
          height: canvas.height,
          size: `${(blob.size / 1024).toFixed(2)} KB`
        });

        // Crear overlay de procesamiento temporal
        console.log('🎬 [capturePhoto] Creando overlay de procesamiento...');
        let processingOverlay = null;
        if (isMobile) {
          processingOverlay = document.createElement('div');
          processingOverlay.className = 'absolute inset-0 flex items-center justify-center bg-black/80 z-30';
          processingOverlay.innerHTML = `
            <div class="text-center text-white">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
              <p>Analizando DNI...</p>
            </div>
          `;
          videoRef.current?.parentElement?.appendChild(processingOverlay);
          console.log('✅ [capturePhoto] Overlay temporal creado');
        }

        setDetectionError(null);
        console.log('🔄 [capturePhoto] Error de detección limpiado');

        try {
          console.log('📤 [capturePhoto] Enviando imagen a YOLO...');
          const resp = await processWithYolo(croppedFile);

          // Remover overlay temporal
          if (processingOverlay && processingOverlay.parentElement) {
            processingOverlay.parentElement.removeChild(processingOverlay);
            console.log('🗑️ [capturePhoto] Overlay temporal eliminado');
          }

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
            console.log('❌ [capturePhoto] detectionError establecido');
          }
        } catch (err) {
          // Remover overlay temporal en caso de error
          if (processingOverlay && processingOverlay.parentElement) {
            processingOverlay.parentElement.removeChild(processingOverlay);
            console.log('🗑️ [capturePhoto] Overlay temporal eliminado (error)');
          }
          
          console.error('[CameraCapture] Error inesperado:', err);
          
          setDetectionError({
            type: 'unexpected_error',
            message: 'Error inesperado al procesar la imagen',
            suggestion: 'Intenta nuevamente o reinicia la aplicación.'
          });
          console.log('❌ [capturePhoto] Error inesperado capturado');
        }
      },
      'image/jpeg',
      0.95
    );
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

  // Componente de guía DNI reutilizable
  const DNIGuide = () => (
    <>
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>
      
      {/* Contenedor centrado */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Rectángulo guía - REF AQUÍ */}
        <div
          ref={guideRef}
          className="relative border-2 border-white rounded-xl shadow-2xl bg-transparent"
          style={{
            width: isMobile ? '80%' : '60%',
            aspectRatio: '1.586',
            maxWidth: '600px',
            maxHeight: '70vh',
          }}
        >
          {/* Sombra exterior */}
          <div className="absolute inset-0 rounded-xl" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }}></div>

          {/* Esquinas decorativas */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl"></div>
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl"></div>
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl"></div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl"></div>

          {/* Icono y texto */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <i className="bi bi-credit-card text-white text-4xl mb-2 block opacity-90"></i>
            <p className="text-white text-sm font-semibold drop-shadow-lg">
              Alinea tu DNI aquí
            </p>
          </div>
        </div>
      </div>
    </>
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

              {!isLoading && !detectionError && <DNIGuide />}

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
                    <button onClick={handleClose} className="bg-white/20 text-white w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors">
                      <i className="bi bi-x"></i>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute top-20 left-0 right-0 text-center px-4 pointer-events-none z-10">
                <div className="inline-block bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-xl">
                  <p className="text-white text-sm font-semibold">
                    Coloca el DNI dentro del recuadro
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20">
              <button onClick={capturePhoto} disabled={isLoading} className="w-full btn-primary py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50">
                <i className="bi bi-camera-fill text-2xl"></i>
                Capturar Foto
              </button>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
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
            <span className="text-center">Coloca el DNI dentro del recuadro y captura cuando esté alineado</span>
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

                {!isLoading && !detectionError && <DNIGuide />}

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
                    <div className="flex gap-3 w-full max-w-md">
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
                  </div>
                )}
              </div>

              <button onClick={capturePhoto} disabled={isLoading} className="btn-primary w-full py-4 px-8 text-base sm:text-lg font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2">
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
      </div>
    </div>
  );
}

export default CameraCapture;