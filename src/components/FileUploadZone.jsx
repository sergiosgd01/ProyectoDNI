import React, { useState, useId, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import ManualCropModal from './ManualCropModal';
import { processWithYolo } from '../services/processWithYolo';

function FileUploadZone({ onFileSelect }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showManualCrop, setShowManualCrop] = useState(false);
  const [originalFileForCrop, setOriginalFileForCrop] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [processingError, setProcessingError] = useState(null); 
  const fileInputId = useId();

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleDragOver = (event) => {
    event.preventDefault(); 
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // ✅ Función para procesar archivo con YOLO
  const processAndSelectFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);

    try {
      console.log('📤 [FileUploadZone] Enviando archivo a YOLO:', file.name);
      
      const result = await processWithYolo(file);

      setIsProcessing(false);

      if (result.ok && result.blob) {
        // ✅ Archivo procesado exitosamente
        console.log('✅ [FileUploadZone] Procesamiento exitoso');
        
        const processedFile = new File([result.blob], file.name.replace(/\.\w+$/, '-processed.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        onFileSelect(processedFile, { 
          yolo: { 
            ok: true, 
            confidence: result.confidence 
          } 
        });
      } else {
        // ❌ Error en el procesamiento - Mostrar opción de recorte manual
        console.warn('⚠️ [FileUploadZone] Error de procesamiento:', result);
        
        // Guardar archivo original para recorte manual
        setOriginalFileForCrop(file);
        
        setProcessingError({
          type: result.errorType || 'unknown_error',
          message: result.message || 'No se pudo procesar la imagen',
          suggestion: result.suggestion || 'Intenta con otra imagen.',
          confidence: result.confidence,
          minRequired: result.minRequired
        });
      }
    } catch (err) {
      console.error('❌ [FileUploadZone] Error inesperado:', err);
      setIsProcessing(false);
      
      setProcessingError({
        type: 'unexpected_error',
        message: 'Error inesperado al procesar la imagen',
        suggestion: 'Intenta nuevamente o reinicia la aplicación.'
      });
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    processAndSelectFile(file); // ✅ Procesar con YOLO
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    processAndSelectFile(file); // ✅ Procesar con YOLO
  };

  const handleCameraCapture = (file, metadata) => {
    // La cámara ya procesa con YOLO, solo pasar el resultado
    onFileSelect(file, metadata);
    setShowCamera(false);
  };

  // ✅ Función para obtener el icono según el tipo de error
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

  return (
    <>
      <div
        className={`
          w-full flex flex-col items-center justify-center p-8 md:p-16 border-2 rounded-2xl
          transition-all duration-300 ease-in-out min-h-[400px] relative
          ${!isMobile ? 'border-dashed cursor-pointer group' : 'border-solid'}
          ${isDragOver && !isMobile
            ? 'border-primary-400 bg-gradient-to-br from-primary-50 to-secondary-100 scale-[1.02] shadow-xl' 
            : 'border-gray-300 bg-gradient-to-br from-gray-50 to-white'
          }
          ${!isMobile ? 'hover:border-primary-300 hover:shadow-lg hover:bg-gradient-to-br hover:from-primary-50 hover:to-secondary-50' : ''}
          ${isProcessing ? 'pointer-events-none opacity-75' : ''}
        `}
        onDragOver={!isMobile ? handleDragOver : undefined}
        onDragLeave={!isMobile ? handleDragLeave : undefined}
        onDrop={!isMobile ? handleDrop : undefined}
        onClick={!isMobile && !isProcessing ? () => document.getElementById(fileInputId).click() : undefined}
      >
        <input
          type="file"
          id={fileInputId}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        
        {/* ✅ Overlay de procesamiento */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20 rounded-2xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mb-4"></div>
            <p className="text-lg font-semibold text-primary-700 mb-1">Procesando imagen...</p>
            <p className="text-sm text-gray-600">Detectando y corrigiendo DNI...</p>
          </div>
        )}

        {/* ✅ Overlay de error */}
        {processingError && !isProcessing && (
          <div className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center z-20 rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-100 mb-4">
              <i className={`bi ${getErrorIcon(processingError.type)} text-3xl text-red-600`}></i>
            </div>
            <p className="text-xl font-bold text-red-700 mb-2">{getErrorTitle(processingError.type)}</p>
            <p className="text-sm text-red-600 text-center mb-4 max-w-md">{processingError.message}</p>
            {processingError.suggestion && (
              <div className="bg-white/80 rounded-lg p-3 mb-4 max-w-md">
                <p className="text-xs text-gray-700 whitespace-pre-line">{processingError.suggestion}</p>
              </div>
            )}
            {processingError.confidence !== undefined && (
              <p className="text-xs text-red-500 mb-4">
                Confianza: {(processingError.confidence * 100).toFixed(1)}%
                {processingError.minRequired && ` (mínimo: ${(processingError.minRequired * 100).toFixed(0)}%)`}
              </p>
            )}
            
            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Botón para recorte manual */}
              {originalFileForCrop && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowManualCrop(true);
                  }}
                  className="px-6 py-2 bg-primary-400 text-black rounded-lg hover:bg-primary-500 transition-colors flex items-center justify-center space-x-2"
                >
                  <i className="bi bi-crop"></i>
                  <span>Recortar manualmente</span>
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProcessingError(null);
                  setOriginalFileForCrop(null);
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Intentar con otra imagen
              </button>
            </div>
          </div>
        )}
        
        <div className={`
          p-4 rounded-full mb-6 transition-all duration-300
          ${isDragOver 
            ? 'bg-primary-500 scale-110' 
            : 'bg-gradient-to-br from-primary-500 to-secondary-600 group-hover:scale-105 group-hover:shadow-lg'
          }
        `}>
          <i className="bi bi-cloud-arrow-up text-white text-5xl"></i>
        </div>
        
        <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${
          isDragOver ? 'text-primary-700' : 'text-gray-800 group-hover:text-primary-600'
        }`}>
          {isMobile 
            ? 'Selecciona tu DNI' 
            : (isDragOver ? '¡Suelta tu imagen aquí!' : 'Arrastra tu DNI aquí')
          }
        </h3>
        
        <p className={`text-lg font-medium mb-6 transition-colors duration-300 ${
          isDragOver ? 'text-primary-600' : 'text-gray-600 group-hover:text-primary-500'
        }`}>
          {isMobile ? 'Elige una de estas opciones' : 'o elige una de estas opciones'}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button  
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById(fileInputId).click();
            }}
            disabled={isProcessing}
            className={`
              px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform flex items-center justify-center space-x-2
              ${isDragOver 
                ? 'bg-primary-600 text-white shadow-lg scale-105' 
                : 'bg-white text-primary-600 border-2 border-primary-600 hover:bg-primary-600 hover:text-white hover:scale-105 hover:shadow-lg'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <i className="bi bi-folder text-lg"></i>
            <span>Seleccionar Archivo</span>
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowCamera(true);
            }}
            disabled={isProcessing}
            className={`
              px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform flex items-center justify-center space-x-2
              ${isDragOver 
                ? 'bg-secondary-600 text-white shadow-lg scale-105' 
                : 'bg-white text-secondary-600 border-2 border-secondary-600 hover:bg-secondary-600 hover:text-white hover:scale-105 hover:shadow-lg'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <i className="bi bi-camera text-lg"></i>
            <span>Usar Cámara</span>
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Formatos: JPG, PNG, WEBP
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
            Máximo 10MB
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-secondary-500 rounded-full mr-2"></span>
            Detección automática
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Modal de recorte manual */}
      {showManualCrop && originalFileForCrop && (
        <ManualCropModal
          file={originalFileForCrop}
          errorInfo={processingError}
          onCrop={(croppedFile) => {
            console.log('✂️ [FileUploadZone] Imagen recortada manualmente');
            setShowManualCrop(false);
            setProcessingError(null);
            setOriginalFileForCrop(null);
            
            // Enviar imagen recortada al siguiente paso directamente (sin YOLO)
            onFileSelect(croppedFile, { 
              yolo: { ok: true, manualCrop: true },
              manualCrop: true 
            });
          }}
          onCancel={() => {
            setShowManualCrop(false);
          }}
        />
      )}
    </>
  );
}

export default FileUploadZone;