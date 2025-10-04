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

  // Función para obtener dispositivos SIN seleccionar ninguno automáticamente
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
      setIsLoading(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Acceso a la cámara denegado. Por favor, permite el acceso a la cámara.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en tu dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('La cámara está siendo usada por otra aplicación.');
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

      // Primero inicializar la cámara
      await initializeCamera();
      
      // Después obtener la lista de dispositivos
      const videoDevices = await getAvailableDevices();
      
      // Si hay dispositivos y no hay uno seleccionado, seleccionar el mejor
      if (!selectedDeviceId && videoDevices.length > 0) {
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('trasera')
        );
        
        // Solo establecer si encontramos una cámara trasera
        // Si no, dejamos que use la que el navegador eligió por defecto
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

  // Effect para cambios manuales de dispositivo
  useEffect(() => {
    if (selectedDeviceId === null || !hasInitialized.current) {
      return;
    }
    
    // Solo reinicializar si el usuario cambió manualmente el dispositivo
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
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--color-error)' }}>
            <i className="bi bi-exclamation-triangle mr-2"></i>
            Cámara no disponible
          </h3>
          <p className="text-center mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Tu dispositivo no soporta el acceso a la cámara o estás usando una conexión no segura (HTTP).
          </p>
          <button onClick={handleClose} className="btn-primary w-full">
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border-default)' }}>
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <i className="bi bi-camera mr-2" style={{ color: 'var(--color-primary)' }}></i>
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

        <div className="p-4 border-b" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border-default)' 
        }}>
          <div className="flex items-center justify-center space-x-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="flex items-center">
              <i className="bi bi-info-circle mr-2" style={{ color: 'var(--color-primary)' }}></i>
              <span>Coloca tu DNI dentro del marco y asegúrate de que esté bien iluminado</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error ? (
            <div className="text-center p-8">
              <i className="bi bi-exclamation-triangle text-4xl mb-4" style={{ color: 'var(--color-error)' }}></i>
              <p className="mb-6" style={{ color: 'var(--color-error)' }}>{error}</p>
              <div className="flex justify-center space-x-4">
                <button onClick={handleRetry} className="btn-primary">
                  <i className="bi bi-arrow-clockwise mr-2"></i>
                  Intentar de nuevo
                </button>
                <button onClick={handleClose} className="btn-secondary">
                  <i className="bi bi-arrow-left mr-2"></i>
                  Volver atrás
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Iniciando cámara...</p>
                    </div>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-[70vh] min-h-[400px] object-cover"
                />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-white border-dashed w-96 h-60 rounded-lg flex items-center justify-center">
                    <div className="text-white text-center">
                      <i className="bi bi-credit-card text-4xl mb-2"></i>
                      <p className="text-base font-semibold">Coloca tu DNI aquí</p>
                      <p className="text-sm opacity-75">Asegúrate de que esté centrado</p>
                    </div>
                  </div>
                </div>

                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-60 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4" style={{ borderColor: 'var(--color-primary)' }}></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4" style={{ borderColor: 'var(--color-primary)' }}></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4" style={{ borderColor: 'var(--color-primary)' }}></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4" style={{ borderColor: 'var(--color-primary)' }}></div>
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={capturePhoto}
                    disabled={isLoading}
                    className="btn-primary px-8 py-4 text-lg font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <i className="bi bi-camera text-xl mr-2"></i>
                    Capturar Foto
                  </button>
                </div>

                {!isMobile && devices.length > 1 && (
                  <div className="flex justify-center">
                    <select
                      value={selectedDeviceId || ''}
                      onChange={(e) => handleDeviceChange(e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
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

                <div className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <p>
                    <i className="bi bi-lightbulb mr-1" style={{ color: 'var(--color-warning)' }}></i>
                    Asegúrate de tener buena iluminación y que el DNI esté completamente dentro del marco
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

export default CameraCapture;