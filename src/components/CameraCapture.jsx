// src/components/CameraCapture.jsx
import React, { useRef, useState, useEffect } from 'react';

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' para frontal, 'environment' para trasera
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  
  // Detectar si es un dispositivo móvil
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    initializeCamera();
    getAvailableDevices();
    
    return () => {
      stopCamera();
    };
  }, [facingMode, selectedDeviceId]);

  const getAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
    } catch (err) {
      console.error('Error getting devices:', err);
    }
  };

  const initializeCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Configuración de la cámara
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16/9 }
        }
      };

      // Si hay un dispositivo específico seleccionado, usarlo
      if (selectedDeviceId) {
        constraints.video.deviceId = { exact: selectedDeviceId };
        delete constraints.video.facingMode;
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        setStream(newStream);
        
        // Detectar qué cámara se está usando realmente
        if (!selectedDeviceId && newStream.getVideoTracks().length > 0) {
          const activeTrack = newStream.getVideoTracks()[0];
          const activeDeviceId = activeTrack.getSettings().deviceId;
          if (activeDeviceId) {
            setSelectedDeviceId(activeDeviceId);
          }
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      
      // Obtener las dimensiones del video
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Calcular las dimensiones del recuadro del DNI en relación al video
      // El recuadro es de 384x240px (w-96 h-60) pero necesitamos calcularlo en proporción al video real
      const frameWidth = 384;
      const frameHeight = 240;
      
      // Obtener las dimensiones reales del elemento video en la pantalla
      const videoElement = video.getBoundingClientRect();
      const scaleX = videoWidth / videoElement.width;
      const scaleY = videoHeight / videoElement.height;
      
      // Calcular las dimensiones del recuadro en las coordenadas del video real
      const cropWidth = frameWidth * scaleX;
      const cropHeight = frameHeight * scaleY;
      
      // Calcular la posición del centro (donde está el recuadro)
      const startX = (videoWidth - cropWidth) / 2;
      const startY = (videoHeight - cropHeight) / 2;
      
      // Configurar el canvas con las dimensiones del recuadro únicamente
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      // Dibujar solo la parte del video que está dentro del recuadro
      context.drawImage(
        video, 
        startX, startY, cropWidth, cropHeight, // Área de origen (recuadro en el video)
        0, 0, cropWidth, cropHeight // Área de destino (todo el canvas)
      );
      
      // Convertir a blob
      canvas.toBlob((blob) => {
        const file = new File([blob], 'dni-camera-capture.jpg', { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        onCapture(file);
        stopCamera();
        onClose();
      }, 'image/jpeg', 0.95);
    }
  };

  const switchCamera = () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
  };

  const handleDeviceChange = (deviceId) => {
    setSelectedDeviceId(deviceId);
  };

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 className="text-xl font-bold mb-4 text-center text-red-600">
            <i className="bi bi-exclamation-triangle mr-2"></i>
            Cámara no disponible
          </h3>
          <p className="text-gray-600 text-center mb-4">
            Tu dispositivo no soporta el acceso a la cámara o estás usando una conexión no segura (HTTP).
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            <i className="bi bi-camera text-primary-600 mr-2"></i>
            Capturar DNI
          </h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        {/* Instrucciones */}
        <div className="p-4 bg-primary-50 border-b border-primary-200">
          <div className="flex items-center justify-center space-x-4 text-sm text-primary-700">
            <div className="flex items-center">
              <i className="bi bi-info-circle text-primary-600 mr-2"></i>
              <span>Coloca tu DNI dentro del marco y asegúrate de que esté bien iluminado</span>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="p-6">
          {error ? (
            <div className="text-center p-8">
              <i className="bi bi-exclamation-triangle text-red-500 text-4xl mb-4"></i>
              <p className="text-red-600 mb-6">{error}</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={initializeCamera}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <i className="bi bi-arrow-clockwise mr-2"></i>
                  Intentar de nuevo
                </button>
                <button
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <i className="bi bi-arrow-left mr-2"></i>
                  Volver atrás
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Video container */}
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

                {/* Overlay con guías para el DNI */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-white border-dashed w-96 h-60 rounded-lg flex items-center justify-center">
                    <div className="text-white text-center">
                      <i className="bi bi-credit-card text-4xl mb-2"></i>
                      <p className="text-base font-semibold">Coloca tu DNI aquí</p>
                      <p className="text-sm opacity-75">Asegúrate de que esté centrado</p>
                    </div>
                  </div>
                </div>

                {/* Corners del marco */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-60 pointer-events-none">
                  {/* Esquina superior izquierda */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary-400"></div>
                  {/* Esquina superior derecha */}
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary-400"></div>
                  {/* Esquina inferior izquierda */}
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary-400"></div>
                  {/* Esquina inferior derecha */}
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary-400"></div>
                </div>
              </div>

              {/* Controles */}
              <div className="flex flex-col space-y-4">
                {/* Botones principales */}
                <div className="flex justify-center space-x-4">
                  {/* Botón de captura */}
                  <button
                    onClick={capturePhoto}
                    disabled={isLoading}
                    className="px-8 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
                  >
                    <i className="bi bi-camera text-xl"></i>
                    <span>Capturar Foto</span>
                  </button>
                </div>

                {/* Selector de dispositivos (si hay múltiples cámaras en PC) */}
                {!isMobile && devices.length > 1 && (
                  <div className="flex justify-center">
                    <select
                      value={selectedDeviceId || ''}
                      onChange={(e) => handleDeviceChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {devices.map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Cámara ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tips */}
                <div className="text-center text-sm text-gray-600">
                  <p>
                    <i className="bi bi-lightbulb text-yellow-500 mr-1"></i>
                    Asegúrate de tener buena iluminación y que el DNI esté completamente dentro del marco
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

export default CameraCapture;
