import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

/**
 * Modal para censura manual de campos del DNI
 * Permite dibujar rectángulos para ocultar información sensible
 *
 * Solo recibe las caras en las que ha fallado la detección automática.
 * La cara que no llega (frontFile o backFile vacío) no se pide ni se genera.
 * onComplete la devuelve a null y el editor conserva su resultado automático.
 *
 * Los rectángulos se guardan en fracciones del ancho y del alto de la imagen original, de 0 a 1.
 * Así no dependen del tamaño con el que se ve el lienzo, que cambia de una cara a otra,
 * al cambiar el tamaño de la ventana y al girar el móvil, y cada cara se tapa justo donde se dibujó.
 */

// Tamaño mínimo en pantalla, en píxeles, para enseñar el rectángulo mientras se arrastra y para guardarlo
const MIN_PREVIEW_SIZE = 5;
const MIN_RECT_SIZE = 10;

// Cómo se nombra cada cara en los textos de la ventana
const NOMBRE_CARA = { anverso: 'parte delantera', reverso: 'parte trasera' };

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// Caja del contenido del lienzo en pantalla, sin su borde (clase border-2)
// Su tamaño es el que le da el CSS en ese momento, que puede ser menor que canvas.width si max-w-full lo encoge
const getContentBox = (canvas) => {
  const rect = canvas.getBoundingClientRect();
  const style = window.getComputedStyle(canvas);
  const px = (value) => parseFloat(value) || 0;
  const left = rect.left + px(style.borderLeftWidth) + px(style.paddingLeft);
  const top = rect.top + px(style.borderTopWidth) + px(style.paddingTop);
  const right = rect.right - px(style.borderRightWidth) - px(style.paddingRight);
  const bottom = rect.bottom - px(style.borderBottomWidth) - px(style.paddingBottom);
  return { left, top, width: right - left, height: bottom - top };
};

// Dedo con ese identificador dentro de una lista de toques. touches tiene los dedos que siguen en la pantalla
// y changedTouches los que se acaban de mover, levantar o cancelar
const findTouch = (list, id) => Array.from(list || []).find((touch) => touch.identifier === id) || null;

// Rectángulo entre el punto de partida y el actual, en fracciones de la imagen
const rectBetween = (start, end) => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y)
});

function ManualCensorModal({
  frontFile,
  backFile,
  onComplete,
  onCancel
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  // Imagen cargada junto con la cara a la que pertenece
  const [loadedImage, setLoadedImage] = useState(null);
  // Tamaño del lienzo calculado para esa imagen y el tamaño actual de la ventana
  const [canvasSize, setCanvasSize] = useState(null);
  const objectUrlRef = useRef(null);

  // Estado para controlar qué cara se está editando
  // Inicializar con el primer archivo disponible
  const [currentSide, setCurrentSide] = useState(frontFile ? 'front' : 'back'); // 'front' o 'back'

  // La imagen solo vale si es de la cara que está en pantalla. Mientras carga la otra se ve el aviso de carga
  const originalImage = loadedImage && loadedImage.side === currentSide ? loadedImage.image : null;
  const imageLoaded = originalImage !== null;

  // Rectángulos dibujados para cada cara
  const [frontRectangles, setFrontRectangles] = useState([]);
  const [backRectangles, setBackRectangles] = useState([]);

  // Estado del dibujo. El arrastre en curso va en una referencia para que los oyentes del ratón
  // y del dedo lean siempre su punto de partida, aunque React todavía no haya vuelto a pintar
  const dragRef = useRef(null);
  const [currentRect, setCurrentRect] = useState(null);

  // Modal de confirmación cuando falta censurar alguna cara
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [missingSides, setMissingSides] = useState([]);

  // Estado para destacar el botón que falta por editar
  const [highlightSide, setHighlightSide] = useState(null);

  // Generación de las imágenes al pulsar «Finalizar»
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // Se marca al cancelar o al cerrar el modal. Si la generación termina después,
  // su resultado se descarta para no sustituir lo que ya muestra el editor
  const closedRef = useRef(false);
  useEffect(() => {
    closedRef.current = false;
    return () => {
      closedRef.current = true;
    };
  }, []);

  const handleCancel = () => {
    closedRef.current = true;
    onCancel();
  };

  // Detectar si es móvil y si ya ha tocado el canvas
  const [isMobile, setIsMobile] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Detectar dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Resetear interacción cuando cambia de lado (Anverso/Reverso)
  // Un arrastre sin terminar se descarta para que no aparezca en la otra cara
  useEffect(() => {
    setHasInteracted(false);
    dragRef.current = null;
    setCurrentRect(null);
  }, [currentSide]);

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

    // Si se cambia de cara antes de que termine de cargar, esta imagen ya no se usa
    let cancelled = false;
    const side = currentSide;
    const img = new Image();
    objectUrlRef.current = URL.createObjectURL(file);

    img.onload = () => {
      if (cancelled) return;
      console.log(`✅ Imagen ${side} cargada correctamente`);
      setLoadedImage({ side, image: img });
    };

    img.onerror = (err) => {
      if (cancelled) return;
      console.error('❌ Error cargando imagen:', err);
    };

    img.src = objectUrlRef.current;

    return () => {
      cancelled = true;
    };
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

  // Ajustar el lienzo al espacio libre al cargar la cara y cada vez que cambia el tamaño de la ventana,
  // por ejemplo al girar el móvil
  useLayoutEffect(() => {
    if (!originalImage) return;

    const fitCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Ancho libre del contenedor sin su relleno ni el borde del lienzo, para que max-w-full no tenga que encogerlo
      const px = (value) => parseFloat(value) || 0;
      const containerStyle = window.getComputedStyle(container);
      const canvasStyle = window.getComputedStyle(canvas);
      const containerWidth = container.clientWidth
        - px(containerStyle.paddingLeft) - px(containerStyle.paddingRight)
        - px(canvasStyle.borderLeftWidth) - px(canvasStyle.borderRightWidth);
      const containerHeight = window.innerHeight * 0.55;

      const scaleX = containerWidth / originalImage.width;
      const scaleY = containerHeight / originalImage.height;
      const scale = Math.min(scaleX, scaleY, 1);
      const width = Math.max(1, Math.floor(originalImage.width * scale));
      const height = Math.max(1, Math.floor(originalImage.height * scale));

      setCanvasSize((prev) => (
        prev && prev.image === originalImage && prev.width === width && prev.height === height
          ? prev
          : { image: originalImage, width, height }
      ));
    };

    fitCanvas();
    window.addEventListener('resize', fitCanvas);
    return () => window.removeEventListener('resize', fitCanvas);
  }, [originalImage]);

  // Redibujar canvas. Los rectángulos pasan de fracciones de la imagen a píxeles del lienzo con el tamaño
  // que tiene ahora, así siguen sobre la misma zona de la foto aunque el lienzo cambie de tamaño
  const currentRectangles = getCurrentRectangles();
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage || !canvasSize || canvasSize.image !== originalImage) return;

    // Cambiar el tamaño borra el lienzo, por eso se hace justo antes de pintar
    if (canvas.width !== canvasSize.width) canvas.width = canvasSize.width;
    if (canvas.height !== canvasSize.height) canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const toCanvas = (rect) => [
      rect.x * canvas.width,
      rect.y * canvas.height,
      rect.width * canvas.width,
      rect.height * canvas.height
    ];

    // Limpiar y dibujar imagen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    // Dibujar rectángulos de censura existentes
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    currentRectangles.forEach(rect => {
      ctx.fillRect(...toCanvas(rect));
    });

    // Dibujar rectángulo actual si está dibujando
    if (currentRect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(...toCanvas(currentRect));

      // Borde del rectángulo actual
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(...toCanvas(currentRect));
      ctx.setLineDash([]);
    }
  }, [originalImage, canvasSize, currentRectangles, currentRect]);

  // Posición de un punto de la pantalla en fracciones de la imagen, de 0 a 1 y sin salirse de ella
  // Se mide sobre la caja de contenido del lienzo, sin el borde, y con el tamaño con el que se ve en ese momento.
  // Los píxeles de pantalla no son píxeles del lienzo en cuanto el CSS lo encoge
  const getImagePoint = (point) => {
    const canvas = canvasRef.current;
    if (!canvas || !point) return null;

    const box = getContentBox(canvas);
    if (box.width <= 0 || box.height <= 0) return null;

    return {
      x: clamp01((point.clientX - box.left) / box.width),
      y: clamp01((point.clientY - box.top) / box.height),
      box
    };
  };

  // Descarta el arrastre en curso sin guardar nada
  const discardDrag = useCallback(() => {
    dragRef.current = null;
    setCurrentRect(null);
  }, []);

  // Iniciar dibujo, con el botón principal del ratón o con un solo dedo
  // El arrastre apunta qué dedo lo empezó (touchId), o null si es el ratón, para seguir solo a ese puntero
  const handleMouseDown = useCallback((event) => {
    const isTouch = Boolean(event.touches);
    let point = event;

    if (isTouch) {
      // Un arrastre cuyo dedo ya no está en la pantalla se perdió y no cuenta
      const drag = dragRef.current;
      if (drag && (drag.touchId === null || !findTouch(event.touches, drag.touchId))) {
        dragRef.current = null;
      }
      // Un segundo dedo, por ejemplo el pulgar que sujeta el móvil, no empieza otro rectángulo
      if (dragRef.current || event.touches.length > 1) {
        event.preventDefault();
        return;
      }
      point = event.changedTouches[0];
    } else if (event.button !== 0) {
      // Solo el botón principal. Con el derecho se abre el menú y el navegador no avisa al soltarlo
      return;
    }

    const pos = getImagePoint(point);
    if (!pos) return;

    // Marcar que el usuario ha interactuado (para ocultar mensaje en móviles)
    if (isMobile && !hasInteracted) {
      setHasInteracted(true);
    }

    dragRef.current = { side: currentSide, start: pos, touchId: isTouch ? point.identifier : null };
    setCurrentRect(null);
    event.preventDefault();
  }, [isMobile, hasInteracted, currentSide]);

  // Durante el dibujo. Solo sigue al ratón o al dedo que empezó el arrastre
  const handleMouseMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;

    let point = event;
    if (event.touches) {
      point = drag.touchId === null ? null : findTouch(event.touches, drag.touchId);
      if (!point) return;
    } else {
      if (drag.touchId !== null) return;
      // Si el botón se soltó fuera de la ventana no llega mouseup. Ese arrastre ya terminó y se descarta
      if (event.buttons === 0) {
        discardDrag();
        return;
      }
    }
    event.preventDefault();

    const pos = getImagePoint(point);
    if (!pos) return;

    // Se enseña cuando ya mide unos píxeles en pantalla
    const rect = rectBetween(drag.start, pos);
    if (rect.width * pos.box.width > MIN_PREVIEW_SIZE && rect.height * pos.box.height > MIN_PREVIEW_SIZE) {
      setCurrentRect(rect);
    }
  }, [discardDrag]);

  // Finalizar dibujo. El rectángulo llega hasta donde se suelta, o hasta el borde si el ratón sale del lienzo,
  // y se guarda en la cara en la que empezó el arrastre
  const handleMouseUp = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;

    let point = event;
    if (event.changedTouches) {
      // Al levantar el dedo ya no está en touches, solo en changedTouches
      point = drag.touchId === null ? null : findTouch(event.changedTouches, drag.touchId);
      if (!point) return;
    } else {
      // Un evento del ratón no termina un arrastre con el dedo. Algunos navegadores lo mandan al tocar otro botón
      if (drag.touchId !== null) return;
      // Salir del lienzo sin ningún botón pulsado quiere decir que se soltó fuera de la ventana sin avisar
      if (event.type === 'mouseleave' && event.buttons === 0) {
        discardDrag();
        return;
      }
    }

    dragRef.current = null;
    setCurrentRect(null);

    const pos = getImagePoint(point);
    if (!pos) return;

    const rect = rectBetween(drag.start, pos);
    if (rect.width * pos.box.width > MIN_RECT_SIZE && rect.height * pos.box.height > MIN_RECT_SIZE) {
      const setRectangles = drag.side === 'front' ? setFrontRectangles : setBackRectangles;
      setRectangles((rectangles) => [...rectangles, rect]);
    }
  }, [discardDrag]);

  // Si el sistema cancela el toque, por ejemplo con el gesto de volver o un aviso, el arrastre se descarta
  const handleTouchCancel = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.touchId === null) return;
    if (findTouch(event.changedTouches, drag.touchId)) discardDrag();
  }, [discardDrag]);

  // Eventos táctiles sin modo pasivo, para que el dedo dibuje en vez de desplazar la página
  // El lienzo se crea de nuevo cada vez que se carga una cara, por eso se vuelven a poner al cambiar la imagen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('touchstart', handleMouseDown, { passive: false });
    canvas.addEventListener('touchmove', handleMouseMove, { passive: false });
    canvas.addEventListener('touchend', handleMouseUp, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      canvas.removeEventListener('touchstart', handleMouseDown);
      canvas.removeEventListener('touchmove', handleMouseMove);
      canvas.removeEventListener('touchend', handleMouseUp);
      canvas.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [originalImage, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchCancel]);

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

  // Cambiar de lado. Solo a una cara que necesite censura manual
  const handleSwitchSide = (side) => {
    if (side === 'front' && !frontFile) return;
    if (side === 'back' && !backFile) return;
    setCurrentSide(side);
  };

  // Generar imagen censurada. La promesa termina siempre, también si falla,
  // para que «Finalizar» no se quede esperando sin avisar
  const generateCensoredImage = async (file, rectangles) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          // Safari en iPhone devuelve null cuando se queda sin memoria para lienzos
          if (!ctx) throw new Error('No hay memoria para preparar la imagen censurada');

          canvas.width = img.width;
          canvas.height = img.height;

          // Dibujar imagen original
          ctx.drawImage(img, 0, 0);

          // Aplicar censura. Los rectángulos están en fracciones de esta misma imagen, así que no dependen
          // de la cara que haya en pantalla al finalizar. Se redondea hacia fuera para tapar entero
          // cualquier píxel que toque el rectángulo
          ctx.fillStyle = 'black';
          rectangles.forEach(rect => {
            const left = Math.floor(rect.x * canvas.width);
            const top = Math.floor(rect.y * canvas.height);
            const right = Math.ceil((rect.x + rect.width) * canvas.width);
            const bottom = Math.ceil((rect.y + rect.height) * canvas.height);
            ctx.fillRect(left, top, right - left, bottom - top);
          });

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('No se ha podido codificar la imagen censurada'));
            }
          }, 'image/jpeg', 0.95);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se ha podido cargar la imagen'));
      };

      img.src = url;
    });
  };

  // Verificar si faltan censuras y mostrar aviso
  // Solo cuentan las caras que están en el modal
  const handleComplete = () => {
    const missing = [];

    if (frontFile && frontRectangles.length === 0) {
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
  // Solo se generan las caras que están en el modal. La otra se devuelve a null
  const processAndComplete = async () => {
    setShowConfirmModal(false);
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      let frontUrl = null;
      if (frontFile) {
        const frontBlob = await generateCensoredImage(frontFile, frontRectangles);
        frontUrl = URL.createObjectURL(frontBlob);
      }

      let backUrl = null;
      if (backFile) {
        const backBlob = await generateCensoredImage(backFile, backRectangles);
        backUrl = URL.createObjectURL(backBlob);
      }

      if (closedRef.current) {
        if (frontUrl) URL.revokeObjectURL(frontUrl);
        if (backUrl) URL.revokeObjectURL(backUrl);
        return;
      }

      onComplete({
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
        success: true,
        manualCensor: true
      });
    } catch (error) {
      console.error('Error generando imágenes censuradas:', error);
      setGenerationError('No se ha podido generar la imagen censurada. Vuelve a pulsar «Finalizar».');
    } finally {
      setIsGenerating(false);
    }
  };

  // Nombre de la única cara que hay que censurar a mano, o null si son las dos
  const singleSideName = frontFile && backFile ? null : (frontFile ? 'parte delantera' : 'parte trasera');

  const totalRectangles = frontRectangles.length + backRectangles.length;

  return (
    // Fondo opaco. Con bg-black/95 se veía la página de detrás y su texto se mezclaba con el aviso
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-3 md:p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCancel}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-700 rounded-xl transition-colors"
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
            {totalRectangles} {totalRectangles === 1 ? 'censura' : 'censuras'}
          </span>
        </div>
      </div>

      {/* Mensaje de advertencia cuando falla la detección automática */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
              <i className="bi bi-exclamation-triangle-fill text-gray-900 text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm md:text-base font-medium mb-1">
                Detección automática no disponible
              </p>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                {singleSideName
                  ? `No hemos podido detectar automáticamente los campos de la ${singleSideName}. Por favor, dibuja rectángulos manualmente sobre los datos que deseas ocultar. Solo hace falta en esta cara.`
                  : 'No hemos podido detectar automáticamente los campos del DNI. Por favor, dibuja rectángulos manualmente sobre los datos que deseas ocultar en ambas caras del documento.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de cara - Solo mostrar opciones disponibles */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 md:p-3">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          {frontFile && (
            <button
              onClick={() => {
                handleSwitchSide('front');
                setHighlightSide(null);
              }}
              className={`btn btn-sm ${currentSide === 'front'
                ? 'bg-white text-gray-900'
                : 'btn-oscuro'
                } ${highlightSide === 'front'
                  ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-800 animate-pulse scale-110'
                  : ''
                }`}
            >
              <i className="bi bi-credit-card-front"></i>
              <span>Parte delantera</span>
              {frontRectangles.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {frontRectangles.length}
                </span>
              )}
              {highlightSide === 'front' && (
                <i className="bi bi-arrow-left-circle-fill text-yellow-400 ml-1 animate-bounce"></i>
              )}
            </button>
          )}

          {backFile && (
            <button
              onClick={() => {
                handleSwitchSide('back');
                setHighlightSide(null);
              }}
              className={`btn btn-sm ${currentSide === 'back'
                ? 'bg-white text-gray-900'
                : 'btn-oscuro'
                } ${highlightSide === 'back'
                  ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-800 animate-pulse scale-110'
                  : ''
                }`}
            >
              <i className="bi bi-credit-card-back"></i>
              <span>Parte trasera</span>
              {highlightSide === 'back' && (
                <i className="bi bi-arrow-left-circle-fill text-yellow-400 ml-1 animate-bounce"></i>
              )}
              {backRectangles.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {backRectangles.length}
                </span>
              )}
            </button>
          )}
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

            {/* Mensaje instructivo para móviles */}
            {isMobile && !hasInteracted && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-blue-600/90 text-white px-4 py-3 rounded-lg shadow-2xl max-w-xs mx-4 text-center animate-pulse">
                  <i className="bi bi-hand-index-thumb text-3xl mb-2 block"></i>
                  <p className="font-medium text-sm">
                    Pulsa sobre la imagen para empezar a censurar el documento
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer con acciones unificadas */}
      <div className="bg-gray-900 p-3 md:p-4 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto">
          {/* Info */}
          <div className="text-gray-400 text-xs md:text-sm order-2 sm:order-1">
            {generationError ? (
              <span className="text-red-400 flex items-center" role="alert">
                <i className="bi bi-exclamation-triangle mr-1.5"></i>
                {generationError}
              </span>
            ) : totalRectangles > 0 ? (
              <span className="text-green-400 flex items-center">
                <i className="bi bi-check-circle mr-1.5"></i>
                {totalRectangles} {totalRectangles === 1 ? 'área censurada' : 'áreas censuradas'}
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
              className="btn btn-oscuro w-12 px-0 flex-shrink-0"
              title="Deshacer última"
            >
              <i className="bi bi-arrow-counterclockwise text-lg"></i>
            </button>

            {/* Limpiar todo */}
            <button
              onClick={handleClearAll}
              disabled={getCurrentRectangles().length === 0}
              className="btn btn-oscuro w-12 px-0 flex-shrink-0 text-red-300"
              title="Limpiar todo"
            >
              <i className="bi bi-trash text-lg"></i>
            </button>

            {/* Cancelar */}
            <button
              onClick={handleCancel}
              className="btn btn-oscuro flex-1 sm:flex-initial px-3 text-sm md:px-6 md:text-base"
            >
              Cancelar
            </button>

            {/* Finalizar */}
            <button
              onClick={handleComplete}
              disabled={totalRectangles === 0 || isGenerating}
              className="btn btn-principal flex-1 sm:flex-initial px-3 text-sm md:px-6 md:text-base"
            >
              {isGenerating ? (
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></span>
              ) : (
                <i className="bi bi-check-lg"></i>
              )}
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
              No has censurado ningún campo en la <strong className="text-yellow-400">{missingSides.map((cara) => NOMBRE_CARA[cara]).join(' ni en la ')}</strong>.
            </p>

            <p className="text-gray-400 text-sm mb-5">
              ¿Estás seguro de que quieres continuar? Los datos de {missingSides.length > 1 ? 'esas caras' : 'esa cara'} permanecerán visibles.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleBackToEdit}
                className="btn btn-oscuro flex-1 px-4"
              >
                <i className="bi bi-pencil"></i>
                Volver a editar
              </button>
              <button
                onClick={processAndComplete}
                className="btn btn-principal flex-1 px-4"
              >
                <i className="bi bi-check-lg"></i>
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