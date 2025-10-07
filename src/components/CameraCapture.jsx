import React, { useRef, useState, useEffect, useCallback } from 'react';

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const isInitializing = useRef(false);
  const hasInitialized = useRef(false); 
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const getAvailableDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('Error getting devices:', err);
      return [];
    }
  }, []);

  const initializeCamera = useCallback(async () => {
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
          height: { ideal: 720, max: 1080 }
        }
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
  }, [selectedDeviceId, isMobile, stopCamera]);

  useEffect(() => {
    const initialize = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      await initializeCamera();
      const videoDevices = await getAvailableDevices();
      
      if (!selectedDeviceId && videoDevices.length > 0) {
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('trasera')
        );
        
        if (backCamera && isMobile) {
          setSelectedDeviceId(backCamera.deviceId);
        }
      }
    };

    initialize();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (selectedDeviceId === null || !hasInitialized.current) {
      return;
    }
    
    initializeCamera();
  }, [selectedDeviceId, initializeCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !streamRef.current) {
      console.error('Video o canvas no disponibles');
      return;
    }
    
    const context = canvas.getContext('2d');
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    if (videoWidth === 0 || videoHeight === 0) {
      console.error('Video no tiene dimensiones válidas');
      return;
    }
    
    const frameWidth = 384;
    const frameHeight = 240;
    const videoElement = video.getBoundingClientRect();
    const scaleX = videoWidth / videoElement.width;
    const scaleY = videoHeight / videoElement.height;
    const cropWidth = frameWidth * scaleX;
    const cropHeight = frameHeight * scaleY;
    const startX = (videoWidth - cropWidth) / 2;
    const startY = (videoHeight - cropHeight) / 2;
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    context.drawImage(
      video, 
      startX, startY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
    
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Error al crear el blob de la imagen');
        return;
      }

      const file = new File([blob], 'dni-camera-capture.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      onCapture(file);
      stopCamera();
      onClose();
    }, 'image/jpeg', 0.95);
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
    initializeCamera();
  };

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
          <h3 className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--color-error)' }}>
            <i className="bi bi-exclamation-triangle mr-2"></i>
            Cámara no disponible
          </h3>
          <p className="text-center mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Tu dispositivo no soporta el acceso a la cámara o estás usando una conexión no segura (HTTP).
          </p>
          <button onClick={handleClose} className="btn-primary w-full py-3">
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // Vista móvil fullscreen
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header flotante */}
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
            <p className="text-white text-center font-medium px-4">
              {error}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-sm px-4">
              <button 
                onClick={handleRetry} 
                className="btn-primary w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <i className="bi bi-arrow-clockwise"></i>
                Intentar de nuevo
              </button>
              <button 
                onClick={handleClose} 
                className="bg-white/20 text-white w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
              >
                <i className="bi bi-arrow-left"></i>
                Volver atrás
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Video fullscreen */}
            <div className="flex-1 relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                    <p>Iniciando cámara...</p>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Frame guía centrado */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white border-dashed rounded-lg" 
                     style={{ width: '85%', maxWidth: '340px', aspectRatio: '384/240' }}>
                  {/* Esquinas decorativas */}
                  <div className="relative w-full h-full">
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white"></div>
                  </div>
                </div>
              </div>

              {/* Texto instructivo */}
              <div className="absolute top-20 left-0 right-0 text-center px-4 pointer-events-none">
                <div className="inline-block bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                  <p className="text-white text-sm font-medium">
                    <i className="bi bi-credit-card mr-2"></i>
                    Coloca tu DNI dentro del marco
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de captura flotante */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <button
                onClick={capturePhoto}
                disabled={isLoading}
                className="w-full btn-primary py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
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

  // Vista desktop (sin cambios)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0" style={{ borderColor: 'var(--color-border-default)' }}>
          <h3 className="text-lg sm:text-xl font-bold flex items-center" style={{ color: 'var(--color-text-primary)' }}>
            <i className="bi bi-camera mr-2 text-xl sm:text-2xl" style={{ color: 'var(--color-primary)' }}></i>
            Capturar DNI
          </h3>
          <button
            onClick={handleClose}
            className="text-2xl hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        {/* Instrucciones */}
        <div className="p-3 sm:p-4 border-b flex-shrink-0" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border-default)' 
        }}>
          <div className="flex items-center justify-center text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <i className="bi bi-info-circle mr-2 flex-shrink-0" style={{ color: 'var(--color-primary)' }}></i>
            <span className="text-center">Coloca tu DNI dentro del marco y asegúrate de que esté bien iluminado</span>
          </div>
        </div>

        {/* Contenido principal */}
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
                <button 
                  onClick={handleRetry} 
                  className="btn-primary flex-1 py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                  Intentar de nuevo
                </button>
                <button 
                  onClick={handleClose} 
                  className="btn-secondary flex-1 py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <i className="bi bi-arrow-left"></i>
                  Volver atrás
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video container */}
              <div className="relative bg-black rounded-xl overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                      <p className="text-sm">Iniciando cámara...</p>
                    </div>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-[60vh] min-h-[300px] sm:min-h-[400px] object-cover"
                />

                {/* Frame guía */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-white border-dashed rounded-lg flex items-center justify-center" 
                       style={{ width: '90%', maxWidth: '384px', aspectRatio: '384/240' }}>
                    <div className="text-white text-center px-4">
                      <i className="bi bi-credit-card text-3xl sm:text-4xl mb-2"></i>
                      <p className="text-sm sm:text-base font-semibold">Coloca tu DNI aquí</p>
                      <p className="text-xs sm:text-sm opacity-75">Asegúrate de que esté centrado</p>
                    </div>
                  </div>
                </div>

                {/* Esquinas del frame */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                     style={{ width: '90%', maxWidth: '384px', aspectRatio: '384/240' }}>
                  <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-l-4 border-t-4" style={{ borderColor: 'var(--color-primary)' }}></div>
                  <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-r-4 border-t-4" style={{ borderColor: 'var(--color-primary)' }}></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-l-4 border-b-4" style={{ borderColor: 'var(--color-primary)' }}></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-r-4 border-b-4" style={{ borderColor: 'var(--color-primary)' }}></div>
                </div>
              </div>

              {/* Botón de captura */}
              <button
                onClick={capturePhoto}
                disabled={isLoading}
                className="btn-primary w-full py-4 px-8 text-base sm:text-lg font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                <i className="bi bi-camera text-xl"></i>
                Capturar Foto
              </button>

              {/* Selector de cámara (solo desktop con múltiples cámaras) */}
              {!isMobile && devices.length > 1 && (
                <div className="flex justify-center">
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm"
                    style={{ 
                      borderColor: 'var(--color-border-default)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Cámara ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Consejo */}
              <div className="text-center text-xs sm:text-sm px-4" style={{ color: 'var(--color-text-secondary)' }}>
                <p className="flex items-center justify-center gap-1">
                  <i className="bi bi-lightbulb flex-shrink-0" style={{ color: 'var(--color-warning)' }}></i>
                  <span>Asegúrate de tener buena iluminación y que el DNI esté completamente dentro del marco</span>
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