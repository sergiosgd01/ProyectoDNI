import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Modal para censura manual de campos del DNI
 * Permite dibujar rectángulos para ocultar información sensible
 */
function ManualCensorModal({
  frontFile,
  backFile,
  onComplete,
  onCancel
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [scale, setScale] = useState(1);
  const objectUrlRef = useRef(null);

  // Estado para controlar qué cara se está editando
  const [currentSide, setCurrentSide] = useState('front'); // 'front' o 'back'

  // Rectángulos dibujados para cada cara
  const [frontRectangles, setFrontRectangles] = useState([]);
  const [backRectangles, setBackRectangles] = useState([]);

  // Estado del dibujo
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);

  // Modal de confirmación cuando falta censurar alguna cara
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [missingSides, setMissingSides] = useState([]);

  // Estado para destacar el botón que falta por editar
  const [highlightSide, setHighlightSide] = useState(null);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Obtener el archivo actual según el lado
  const getCurrentFile = useCallback(() => {
    return currentSide === 'front' ? frontFile : backFile;
  }, [currentSide, frontFile, backFile]);

  // Obtener rectángulos actuales según el lado
  const getCurrentRectangles = useCallback(() => {
    return currentSide === 'front' ? frontRectangles : backRectangles;
  }, [currentSide, frontRectangles, backRectangles]);

  // Establecer rectángulos según el lado
  const setCurrentRectangles = useCallback((rects) => {
    if (currentSide === 'front') {
      setFrontRectangles(rects);
    } else {
      setBackRectangles(rects);
    }
  }, [currentSide]);

  // Cargar imagen cuando cambia el archivo o el lado
  useEffect(() => {
    const file = getCurrentFile();

    if (!file) {
      console.error('❌ No file provided for', currentSide);
      return;
    }

    if (!(file instanceof File) && !(file instanceof Blob)) {
      console.error('❌ Invalid file type:', typeof file);
      return;
    }

    // Limpiar URL anterior si existe
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setImageLoaded(false);
    setOriginalImage(null);

    const img = new Image();
    objectUrlRef.current = URL.createObjectURL(file);

    img.onload = () => {
      console.log(`✅ Imagen ${currentSide} cargada correctamente`);
      setOriginalImage(img);
      setImageLoaded(true);
    };

    img.onerror = (err) => {
      console.error('❌ Error cargando imagen:', err);
    };

    img.src = objectUrlRef.current;
  }, [currentSide, getCurrentFile]);

  // Limpiar URL cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Configurar canvas cuando la imagen está lista
  useEffect(() => {
    if (!imageLoaded || !originalImage || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const containerWidth = container.clientWidth - 32;
    const containerHeight = window.innerHeight * 0.55;

    const scaleX = containerWidth / originalImage.width;
    const scaleY = containerHeight / originalImage.height;
    const newScale = Math.min(scaleX, scaleY, 1);

    setScale(newScale);

    canvas.width = originalImage.width * newScale;
    canvas.height = originalImage.height * newScale;

    redrawCanvas();
  }, [imageLoaded, originalImage]);

  // Redibujar canvas
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !originalImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rectangles = getCurrentRectangles();

    // Limpiar y dibujar imagen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    // Dibujar rectángulos de censura existentes
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    rectangles.forEach(rect => {
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    });

    // Dibujar rectángulo actual si está dibujando
    if (currentRect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);

      // Borde del rectángulo actual
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.setLineDash([]);
    }
  }, [originalImage, getCurrentRectangles, currentRect]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, frontRectangles, backRectangles, currentRect]);

  // Obtener posición del mouse/touch relativa al canvas
  const getCanvasPosition = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Iniciar dibujo
  const handleMouseDown = useCallback((event) => {
    const pos = getCanvasPosition(event);
    if (!pos) return;

    setIsDrawing(true);
    setStartPoint(pos);
    setCurrentRect(null);
    event.preventDefault();
  }, []);

  // Durante el dibujo
  const handleMouseMove = useCallback((event) => {
    if (!isDrawing || !startPoint) return;
    event.preventDefault();

    const pos = getCanvasPosition(event);
    if (!pos) return;

    const canvas = canvasRef.current;

    // Calcular rectángulo normalizado
    let x = Math.min(startPoint.x, pos.x);
    let y = Math.min(startPoint.y, pos.y);
    let width = Math.abs(pos.x - startPoint.x);
    let height = Math.abs(pos.y - startPoint.y);

    // Limitar al canvas
    x = Math.max(0, x);
    y = Math.max(0, y);
    width = Math.min(width, canvas.width - x);
    height = Math.min(height, canvas.height - y);

    if (width > 5 && height > 5) {
      setCurrentRect({ x, y, width, height });
    }
  }, [isDrawing, startPoint]);

  // Finalizar dibujo
  const handleMouseUp = useCallback(() => {
    if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
      const rectangles = getCurrentRectangles();
      setCurrentRectangles([...rectangles, currentRect]);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  }, [currentRect, getCurrentRectangles, setCurrentRectangles]);

  // Touch events con passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touchStartHandler = (e) => handleMouseDown(e);
    const touchMoveHandler = (e) => handleMouseMove(e);
    const touchEndHandler = () => handleMouseUp();

    canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
    canvas.addEventListener('touchend', touchEndHandler, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', touchStartHandler);
      canvas.removeEventListener('touchmove', touchMoveHandler);
      canvas.removeEventListener('touchend', touchEndHandler);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  // Deshacer último rectángulo
  const handleUndo = () => {
    const rectangles = getCurrentRectangles();
    if (rectangles.length > 0) {
      setCurrentRectangles(rectangles.slice(0, -1));
    }
  };

  // Limpiar todos los rectángulos del lado actual
  const handleClearAll = () => {
    setCurrentRectangles([]);
  };

  // Cambiar de lado
  const handleSwitchSide = (side) => {
    if (side === 'back' && !backFile) return;
    setCurrentSide(side);
  };

  // Generar imagen censurada
  const generateCensoredImage = async (file, rectangles) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;

        // Dibujar imagen original
        ctx.drawImage(img, 0, 0);

        // Aplicar censura (convertir coordenadas de escala)
        ctx.fillStyle = 'black';
        rectangles.forEach(rect => {
          const originalX = rect.x / scale;
          const originalY = rect.y / scale;
          const originalWidth = rect.width / scale;
          const originalHeight = rect.height / scale;
          ctx.fillRect(originalX, originalY, originalWidth, originalHeight);
        });

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        }, 'image/jpeg', 0.95);
      };

      img.src = url;
    });
  };

  // Verificar si faltan censuras y mostrar aviso
  const handleComplete = () => {
    const missing = [];

    if (frontRectangles.length === 0) {
      missing.push('anverso');
    }
    if (backFile && backRectangles.length === 0) {
      missing.push('reverso');
    }

    if (missing.length > 0) {
      setMissingSides(missing);
      setShowConfirmModal(true);
    } else {
      processAndComplete();
    }
  };

  // Volver a editar con highlight en el lado que falta
  const handleBackToEdit = () => {
    setShowConfirmModal(false);

    // Determinar qué lado destacar y cambiar a él
    if (missingSides.includes('anverso')) {
      setHighlightSide('front');
      setCurrentSide('front');
    } else if (missingSides.includes('reverso')) {
      setHighlightSide('back');
      setCurrentSide('back');
    }

    // Quitar el highlight después de 3 segundos
    setTimeout(() => {
      setHighlightSide(null);
    }, 3000);
  };

  // Procesar y completar (sin validación)
  const processAndComplete = async () => {
    setShowConfirmModal(false);
    try {
      // Generar imágenes censuradas
      const frontBlob = await generateCensoredImage(frontFile, frontRectangles);
      const frontUrl = URL.createObjectURL(frontBlob);

      let backUrl = null;
      if (backFile) {
        const backBlob = await generateCensoredImage(backFile, backRectangles);
        backUrl = URL.createObjectURL(backBlob);
      }

      onComplete({
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
        success: true,
        manualCensor: true
      });
    } catch (error) {
      console.error('Error generando imágenes censuradas:', error);
    }
  };

  const totalRectangles = frontRectangles.length + backRectangles.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-3 md:p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Volver"
          >
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h2 className="font-semibold text-base md:text-lg">Censura manual</h2>
            <p className="text-gray-400 text-xs md:text-sm">Dibuja rectángulos para ocultar datos</p>
          </div>
        </div>

        {/* Contador de censuras */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="bg-gray-700 px-3 py-1 rounded-full">
            <i className="bi bi-square-fill mr-1.5 text-red-500"></i>
            {totalRectangles} censuras
          </span>
        </div>
      </div>

      {/* Mensaje de advertencia cuando falla la detección automática */}
      <div className="bg-yellow-900/40 border-b border-yellow-700/50 p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
              <i className="bi bi-exclamation-triangle-fill text-white text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-yellow-100 text-sm md:text-base font-medium mb-1">
                Detección automática no disponible
              </p>
              <p className="text-yellow-200/80 text-xs md:text-sm leading-relaxed">
                No hemos podido detectar automáticamente los campos del DNI. Por favor, dibuja rectángulos manualmente sobre los datos que deseas ocultar en ambas caras del documento.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de cara */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 md:p-3">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          <button
            onClick={() => {
              handleSwitchSide('front');
              setHighlightSide(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${currentSide === 'front'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${highlightSide === 'front'
                ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-800 animate-pulse scale-110'
                : ''
              }`}
          >
            <i className="bi bi-credit-card-front"></i>
            <span>Anverso</span>
            {frontRectangles.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {frontRectangles.length}
              </span>
            )}
            {highlightSide === 'front' && (
              <i className="bi bi-arrow-left-circle-fill text-yellow-400 ml-1 animate-bounce"></i>
            )}
          </button>

          <button
            onClick={() => {
              handleSwitchSide('back');
              setHighlightSide(null);
            }}
            disabled={!backFile}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${currentSide === 'back'
                ? 'bg-blue-600 text-white'
                : backFile
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              } ${highlightSide === 'back'
                ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-800 animate-pulse scale-110'
                : ''
              }`}
          >
            <i className="bi bi-credit-card-back"></i>
            <span>Reverso</span>
            {highlightSide === 'back' && (
              <i className="bi bi-arrow-left-circle-fill text-yellow-400 ml-1 animate-bounce"></i>
            )}
            {backRectangles.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {backRectangles.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-2 md:p-4 overflow-auto"
      >
        {!imageLoaded ? (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
            <p className="text-sm md:text-base">Cargando imagen...</p>
          </div>
        ) : (
          <div className="relative max-w-full max-h-full">
            <canvas
              ref={canvasRef}
              className="border-2 border-gray-600 rounded-lg shadow-2xl max-w-full max-h-full"
              style={{ cursor: 'crosshair' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        )}
      </div>

      {/* Footer con acciones unificadas */}
      <div className="bg-gray-900 p-3 md:p-4 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto">
          {/* Info */}
          <div className="text-gray-400 text-xs md:text-sm order-2 sm:order-1">
            {totalRectangles > 0 ? (
              <span className="text-green-400 flex items-center">
                <i className="bi bi-check-circle mr-1.5"></i>
                {totalRectangles} área(s) censurada(s)
              </span>
            ) : (
              <span className="flex items-center">
                <i className="bi bi-info-circle mr-1.5"></i>
                Dibuja rectángulos para censurar
              </span>
            )}
          </div>

          {/* Botones unificados */}
          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto order-1 sm:order-2">
            {/* Deshacer */}
            <button
              onClick={handleUndo}
              disabled={getCurrentRectangles().length === 0}
              className={`p-2 rounded-lg transition-colors ${getCurrentRectangles().length > 0
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              title="Deshacer última"
            >
              <i className="bi bi-arrow-counterclockwise text-lg"></i>
            </button>

            {/* Limpiar todo */}
            <button
              onClick={handleClearAll}
              disabled={getCurrentRectangles().length === 0}
              className={`p-2 rounded-lg transition-colors ${getCurrentRectangles().length > 0
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              title="Limpiar todo"
            >
              <i className="bi bi-trash text-lg"></i>
            </button>

            {/* Cancelar */}
            <button
              onClick={onCancel}
              className="px-3 md:px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs md:text-sm"
            >
              Cancelar
            </button>

            {/* Finalizar */}
            <button
              onClick={handleComplete}
              disabled={totalRectangles === 0}
              className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-colors text-xs md:text-sm flex items-center justify-center gap-1.5 ${totalRectangles > 0
                  ? 'bg-green-600 text-white hover:bg-green-500 shadow-lg'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
            >
              <i className="bi bi-check-lg"></i>
              <span>Finalizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación cuando faltan censuras */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-5 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <i className="bi bi-exclamation-triangle text-yellow-400 text-xl"></i>
              </div>
              <h3 className="text-white font-semibold text-lg">¿Continuar sin censurar?</h3>
            </div>

            <p className="text-gray-300 mb-4">
              No has censurado ningún campo en el <strong className="text-yellow-400">{missingSides.join(' ni en el ')}</strong>.
            </p>

            <p className="text-gray-400 text-sm mb-5">
              ¿Estás seguro de que quieres continuar? Los datos de {missingSides.length > 1 ? 'esas caras' : 'esa cara'} permanecerán visibles.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleBackToEdit}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                <i className="bi bi-pencil mr-2"></i>
                Volver a editar
              </button>
              <button
                onClick={processAndComplete}
                className="flex-1 px-4 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors font-medium"
              >
                <i className="bi bi-check-lg mr-2"></i>
                Continuar así
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManualCensorModal;