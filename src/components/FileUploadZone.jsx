import React, { useState, useId, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import ManualCropModal from './ManualCropModal';
import Aviso from './Aviso';
import { processWithYolo } from '../services/processWithYolo';
import { validateFileComplete, sanitizeFileName, MAX_UPLOAD_SIZE } from '../utils/fileValidation';
import { prepareImageForUpload } from '../utils/imageResize';
import { fileUploadLimiter } from '../utils/rateLimiter';
import logger from '../utils/logger';
import { useUploadSlotRegistration } from '../hooks/useUploadSlots';
import { useCloseOnBack } from '../hooks/useNavigation';

// Por qué no se puede usar un archivo, según el motivo que da fileValidation.js
const TEXTO_RECHAZO = {
  formato: 'Solo se admiten fotos JPG, PNG o WEBP.',
  heic: 'Las fotos HEIC todavía no se admiten. Guárdala como JPG o elige otra foto.',
  peso: 'La foto pesa más de 30 MB. Elige otra más ligera.',
  dimensiones: 'La foto es demasiado grande. Elige otra más pequeña.',
  contenido: 'No se ha podido abrir la foto. Prueba con otra.'
};

const esHeic = (file) => /hei[cf]/i.test(file?.type || '') || /\.hei[cf]$/i.test(file?.name || '');

// Ordenador con ratón o trackpad. Ahí se puede arrastrar o pegar la foto y no se ofrece la webcam,
// que saca el DNI poco nítido. En móvil y tablet se ofrece primero la cámara del dispositivo
const CONSULTA_RATON = '(hover: hover) and (pointer: fine)';

// Errores en los que el servidor no encuentra el DNI en la foto. Para ellos la web pone su propio texto,
// porque el del servidor habla de segmentación y de confianza, que no dicen nada a quien sube la foto
const ERRORES_SIN_DNI = ['no_detection', 'no_mask', 'low_confidence', 'extraction_failed'];
const MENSAJE_SIN_DNI = 'No hemos encontrado el DNI en la foto.';
const SUGERENCIA_SIN_DNI = 'Prueba con otra foto en la que se vea el DNI entero, con buena luz y sin reflejos, o recórtalo tú a mano.';
const ATAJO_PEGAR = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform || '') ? '⌘V' : 'Ctrl+V';

// expectedSide es la cara que pide esta zona ('anverso' o 'reverso'). La cámara avisa si se le enseña la otra
function FileUploadZone({ onFileSelect, expectedSide = null }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showManualCrop, setShowManualCrop] = useState(false);
  const [originalFileForCrop, setOriginalFileForCrop] = useState(null);
  const [conRaton, setConRaton] = useState(() => window.matchMedia(CONSULTA_RATON).matches);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  // Archivo rechazado antes de enviarlo ({ tipo, titulo, texto }). Se enseña encima del recuadro
  const [aviso, setAviso] = useState(null);
  const fileInputId = useId();

  // Atrás cierra la cámara o el recorte manual y se queda en la subida
  useCloseOnBack(showCamera, () => setShowCamera(false));
  useCloseOnBack(showManualCrop, () => setShowManualCrop(false));

  // Se vuelve a mirar si cambia, por ejemplo al conectar un ratón a una tablet
  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_RATON);
    const actualizar = () => setConRaton(consulta.matches);
    consulta.addEventListener('change', actualizar);
    return () => consulta.removeEventListener('change', actualizar);
  }, []);

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  // Pasar por encima de un botón del recuadro no cuenta como salir de él
  const handleDragLeave = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDragOver(false);
  };

  // ✅ Función para procesar archivo con YOLO
  const processAndSelectFile = async (file) => {
    setAviso(null);

    // 🔒 RATE LIMITING - Prevenir abuso
    if (!fileUploadLimiter.canMakeRequest()) {
      const segundos = Math.max(1, Math.ceil(fileUploadLimiter.getTimeUntilNextRequest() / 1000));
      setAviso({
        tipo: 'limite-subidas',
        titulo: 'Espera un momento',
        texto: `Has subido varias fotos seguidas. Vuelve a probar dentro de ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}.`
      });
      return;
    }

    // 🔒 VALIDACIÓN COMPLETA DEL ARCHIVO
    try {
      await validateFileComplete(file);
    } catch (error) {
      logger.error('❌ [FileUploadZone] Validación fallida:', error.message);
      setAviso({
        tipo: 'archivo-no-valido',
        titulo: 'No se puede usar este archivo',
        texto: error.motivo === 'formato' && esHeic(file) ? TEXTO_RECHAZO.heic : TEXTO_RECHAZO[error.motivo] || TEXTO_RECHAZO.contenido
      });
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);

    try {
      // Reducir la foto antes de subirla. Si falla, se sigue con la original
      let uploadFile = file;
      try {
        uploadFile = await prepareImageForUpload(file);
      } catch (resizeError) {
        logger.error('❌ [FileUploadZone] No se pudo reducir la imagen:', resizeError);
      }

      // El servidor no admite más de 10MB. Solo se llega aquí si una foto grande no se pudo reducir
      if (uploadFile.size > MAX_UPLOAD_SIZE) {
        setIsProcessing(false);
        setAviso({
          tipo: 'archivo-no-valido',
          titulo: 'No se puede usar este archivo',
          texto: 'No se ha podido reducir la foto para enviarla. Elige otra de menos de 10 MB.'
        });
        return;
      }

      console.log('📤 [FileUploadZone] Enviando archivo a YOLO:', file.name);

      const result = await processWithYolo(uploadFile);

      setIsProcessing(false);

      if (result.ok && result.blob) {
        // ✅ Archivo procesado exitosamente
        console.log('✅ [FileUploadZone] Procesamiento exitoso');

        // 🔒 Sanitizar nombre del archivo
        const safeName = sanitizeFileName(file.name).replace(/\.\w+$/, '-processed.jpg');

        const processedFile = new File([result.blob], safeName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        onFileSelect(processedFile, {
          yolo: {
            ok: true,
            confidence: result.confidence
          },
          // La foto enviada y las esquinas del recorte, para poder corregirlo a mano desde el editor
          original: uploadFile,
          esquinas: result.esquinas || null
        });
      } else {
        // ❌ Error en el procesamiento - Mostrar opción de recorte manual
        console.warn('⚠️ [FileUploadZone] Error de procesamiento:', result);

        // Guardar la foto para el recorte manual. Se usa la preparada para subir, que el navegador maneja mejor
        setOriginalFileForCrop(uploadFile);

        const sinDni = ERRORES_SIN_DNI.includes(result.errorType);
        setProcessingError({
          type: result.errorType || 'unknown_error',
          message: sinDni ? MENSAJE_SIN_DNI : (result.message || 'No se pudo procesar la imagen.'),
          suggestion: sinDni ? SUGERENCIA_SIN_DNI : (result.suggestion || '')
        });
      }
    } catch (error) {
      logger.error('❌ [FileUploadZone] Error en procesamiento:', error);
      // Mensaje genérico, sin exponer detalles del error
      setProcessingError({
        message: 'No se pudo procesar la imagen. Por favor, intenta con otra foto o usa el modo manual.',
        canRetry: true
      });
      setIsProcessing(false);
    }
  };

  // Dentro de la página de subida, lo que se suelta o se pega lo reparte ella entre las dos caras
  // (usePageFileDrop), así que se aceptan las dos fotos a la vez
  const enPaginaDeSubida = useUploadSlotRegistration(processAndSelectFile, isProcessing);

  const handleDrop = (event) => {
    setIsDragOver(false);
    if (enPaginaDeSubida) return;
    event.preventDefault();
    processAndSelectFile(event.dataTransfer.files[0]); // ✅ Procesar con YOLO
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    // Se vacía la selección para que, tras un aviso, se pueda volver a elegir la misma foto
    event.target.value = '';
    if (file) processAndSelectFile(file); // ✅ Procesar con YOLO
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

  const conError = Boolean(processingError) && !isProcessing;

  return (
    <>
      {/* Fuera del recuadro, porque con ratón un clic dentro abre el selector de archivos */}
      {aviso && (
        <Aviso tipo={aviso.tipo} titulo={aviso.titulo} onCerrar={() => setAviso(null)} className="mb-3">
          {aviso.texto}
        </Aviso>
      )}

      {/* Con el dedo el recuadro es compacto, para que «Hacer foto» se vea nada más entrar.
          Con un error, el mensaje ocupa el recuadro en lugar de su contenido y un clic ya no abre el selector */}
      <div
        className={`
          w-full flex flex-col items-center justify-center border-2 rounded-2xl
          transition-all duration-300 ease-in-out relative
          ${conRaton ? 'p-8 md:p-16 min-h-[400px] border-dashed' : 'p-4 border-solid'}
          ${conRaton && !conError ? 'cursor-pointer group' : ''}
          ${conError
            ? 'border-red-200 bg-red-50'
            : isDragOver && conRaton
              ? 'border-primary-400 bg-gradient-to-br from-primary-50 to-secondary-100 scale-[1.02] shadow-xl'
              : 'border-gray-300 bg-gradient-to-br from-gray-50 to-white group-data-[arrastrando=true]/subida:border-primary-300 group-data-[arrastrando=true]/subida:from-primary-50'
          }
          ${conRaton && !conError ? 'hover:border-primary-300 hover:shadow-lg hover:bg-gradient-to-br hover:from-primary-50 hover:to-secondary-50' : ''}
          ${isProcessing ? 'pointer-events-none opacity-75' : ''}
        `}
        onDragOver={conRaton ? handleDragOver : undefined}
        onDragLeave={conRaton ? handleDragLeave : undefined}
        onDrop={conRaton ? handleDrop : undefined}
        onClick={conRaton && !isProcessing && !conError ? () => document.getElementById(fileInputId).click() : undefined}
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
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-secondary-600 mb-4"></div>
            <p className="text-lg font-semibold text-gray-800 mb-1">Procesando imagen...</p>
            <p className="text-sm text-gray-600">Detectando y corrigiendo DNI...</p>
          </div>
        )}

        {conError ? (
          // data-error lleva el tipo de error (network_error, server_error...) para que el banco no dependa del texto.
          // El banco lee también el título (p.text-xl), el mensaje (p.text-sm.text-red-600) y los botones por su texto
          <div data-error={processingError.type} className="w-full flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-100 mb-3">
              <i className={`bi ${getErrorIcon(processingError.type)} text-2xl text-red-600`}></i>
            </div>
            <p className="text-xl font-bold text-red-700 mb-1">{getErrorTitle(processingError.type)}</p>
            <p className="text-sm text-red-600 max-w-md">{processingError.message}</p>
            {processingError.suggestion && (
              <p className="text-sm text-gray-700 max-w-md mt-2 whitespace-pre-line">{processingError.suggestion}</p>
            )}

            {/* En columna y con el principal arriba, porque en fila no caben en el recuadro */}
            <div className="w-full max-w-xs flex flex-col-reverse gap-3 mt-5">
              {originalFileForCrop && (
                <button
                  type="button"
                  onClick={() => setShowManualCrop(true)}
                  className="btn btn-secundario w-full"
                >
                  <i className="bi bi-crop"></i>
                  <span>Recortar manualmente</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setProcessingError(null);
                  setOriginalFileForCrop(null);
                }}
                className="btn btn-principal w-full"
              >
                Intentar con otra imagen
              </button>
            </div>
          </div>
        ) : conRaton ? (
          <>
            <div className={`
              p-4 rounded-full mb-6 transition-all duration-300
              ${isDragOver
                ? 'bg-primary-500 scale-110'
                : 'bg-gradient-to-br from-primary-500 to-secondary-600 group-hover:scale-105 group-hover:shadow-lg'
              }
            `}>
              <i className="bi bi-cloud-arrow-up text-white text-5xl"></i>
            </div>

            <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${isDragOver ? 'text-secondary-600' : 'text-gray-800 group-hover:text-secondary-600'
              }`}>
              {isDragOver ? '¡Suelta tu imagen aquí!' : 'Arrastra tu DNI aquí'}
            </h3>

            <p className={`text-lg font-medium mb-6 transition-colors duration-300 ${isDragOver ? 'text-secondary-600' : 'text-gray-600'
              }`}>
              o pégalo con {ATAJO_PEGAR}
            </p>

            <div className="mb-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById(fileInputId).click();
                }}
                disabled={isProcessing}
                className="btn btn-principal"
              >
                <i className="bi bi-folder text-lg"></i>
                <span>Seleccionar Archivo</span>
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col gap-3 mb-4">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              disabled={isProcessing}
              className="btn btn-principal w-full"
            >
              <i className="bi bi-camera-fill text-lg"></i>
              <span>Hacer foto</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById(fileInputId).click()}
              disabled={isProcessing}
              className="btn btn-secundario w-full"
            >
              <i className="bi bi-images text-lg"></i>
              <span>Elegir de la galería</span>
            </button>
          </div>
        )}

        <div className={`${conError ? 'hidden' : 'flex'} flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500`}>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Formatos: JPG, PNG, WEBP
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
            Máximo 30MB
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
          expectedSide={expectedSide}
        />
      )}

      {/* Modal de recorte manual */}
      {showManualCrop && originalFileForCrop && (
        <ManualCropModal
          file={originalFileForCrop}
          errorInfo={processingError}
          onCrop={(croppedFile, esquinas) => {
            console.log('✂️ [FileUploadZone] Imagen recortada manualmente');
            setShowManualCrop(false);
            setProcessingError(null);
            setOriginalFileForCrop(null);

            // Enviar imagen recortada al siguiente paso directamente (sin YOLO). Con la foto y las esquinas
            // elegidas se puede volver a ajustar desde el editor
            onFileSelect(croppedFile, {
              yolo: { ok: true, manualCrop: true },
              manualCrop: true,
              original: originalFileForCrop,
              esquinas: esquinas || null
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