import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Aviso from './Aviso';
import { cajaDeLasEsquinas, enderezar, invertir3x3, transformacionPerspectiva } from '../utils/enderezarRecorte';

// Móvil tumbado, con la misma consulta que la cámara y la censura manual. La cabecera, las instrucciones y los
// botones se comían casi todo el alto y la foto se quedaba en una tira en la que no se veía nada, así que en ese
// caso pasan a una columna a la derecha y la foto se queda con todo el alto de la pantalla
const CONSULTA_TUMBADO = '(orientation: landscape) and (max-height: 500px)';

// Grosor del borde del lienzo (clase border-2), que no cuenta como sitio para la foto
const BORDE_LIENZO = 2;

// Lado mínimo del recorte. En la pantalla, dos esquinas a menos de 20 píxeles se tocan, y en la foto el servidor
// tampoco recorta nada de menos de 50 píxeles
const LADO_MINIMO_PANTALLA = 20;
const LADO_MINIMO_FOTO = 50;

const AVISO_RECORTE_FALLIDO = { tipo: 'recorte-fallido', texto: 'No se ha podido recortar la foto. Vuelve a intentarlo.' };

// Esquinas de partida en píxeles de la foto. Solo valen si son de una foto del mismo tamaño que la cargada,
// porque si no, por ejemplo con la foto girada, caerían fuera del DNI
function esquinasDePartida(corners, image) {
  if (!corners?.puntos || corners.puntos.length !== 4) return null;
  const mismoTamano = Math.abs(corners.ancho - image.width) <= 1 && Math.abs(corners.alto - image.height) <= 1;
  if (!mismoTamano) return null;
  return corners.puntos.map((p) => ({
    x: Math.min(Math.max(p.x, 0), image.width),
    y: Math.min(Math.max(p.y, 0), image.height),
  }));
}

// Rectángulo de partida cuando no llegan esquinas, centrado y con la proporción del DNI, en píxeles de la foto
function rectanguloDePartida(image) {
  const proporcion = 85.6 / 53.98;
  const ancho = Math.min(image.width * 0.7, image.height * proporcion * 0.7);
  const alto = ancho / proporcion;
  const cx = image.width / 2;
  const cy = image.height / 2;
  return [
    { x: cx - ancho / 2, y: cy - alto / 2 },
    { x: cx + ancho / 2, y: cy - alto / 2 },
    { x: cx + ancho / 2, y: cy + alto / 2 },
    { x: cx - ancho / 2, y: cy + alto / 2 },
  ];
}

// Al encuadrar el DNI se deja alrededor de las esquinas este margen, en fracción de su ancho y de su alto, para poder
// abrirlas si el recorte se quedó corto
const MARGEN_ENCUADRE = 0.3;

const fotoEntera = (image) => ({ x: 0, y: 0, w: image.width, h: image.height });

// Parte de la foto que se ve al encuadrar unas esquinas, en píxeles de la foto, con margen y sin salirse de ella.
// Si casi no se acerca (deja más del 60 % de la foto), no merece la pena y devuelve null
function encuadreDe(puntos, image) {
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const ancho = Math.max(...xs) - Math.min(...xs);
  const alto = Math.max(...ys) - Math.min(...ys);
  if (ancho <= 0 || alto <= 0) return null;
  const x0 = Math.max(0, Math.min(...xs) - ancho * MARGEN_ENCUADRE);
  const y0 = Math.max(0, Math.min(...ys) - alto * MARGEN_ENCUADRE);
  const x1 = Math.min(image.width, Math.max(...xs) + ancho * MARGEN_ENCUADRE);
  const y1 = Math.min(image.height, Math.max(...ys) + alto * MARGEN_ENCUADRE);
  if ((x1 - x0) * (y1 - y0) > 0.6 * image.width * image.height) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Modal para recorte manual de imagen cuando YOLO falla o para corregir su recorte
 * Sistema de 4 puntos ajustables para recortar DNI en perspectiva
 * initialCorners son las esquinas de partida ({ ancho, alto, puntos }), por ejemplo las que usó el servidor.
 * Al recortar, onCrop recibe el archivo y las esquinas elegidas con esa misma forma
 */
function ManualCropModal({
  file,
  onCrop,
  onCancel,
  errorInfo = null,
  initialCorners = null,
  titulo = 'Recorte manual',
  subtitulo = 'Selecciona el área del DNI'
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  // Escala de la parte de la foto que se ve en el lienzo. null hasta medir el hueco que queda para ella
  const [scale, setScale] = useState(null);
  const objectUrlRef = useRef(null);

  // Estado de los 4 puntos del polígono (esquinas del DNI), en píxeles de la foto. Así siguen en el mismo sitio al
  // girar el móvil y al acercar o alejar la vista
  const [points, setPoints] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);

  // Parte de la foto que se ve en el lienzo, en píxeles de la foto ({ x, y, w, h }). Con las esquinas del servidor se
  // empieza con el DNI encuadrado, porque en una foto hecha de lejos el DNI salía pequeño y costaba afinar las
  // esquinas, sobre todo con el móvil tumbado. encuadrado es true con el DNI encuadrado, false con la foto entera
  // después de alejarse y null si no hay encuadre
  const [vista, setVista] = useState(null);
  const [encuadrado, setEncuadrado] = useState(null);

  // Si el móvil está tumbado (ver CONSULTA_TUMBADO). Cambia al girarlo con la ventana abierta
  const [tumbado, setTumbado] = useState(() => window.matchMedia(CONSULTA_TUMBADO).matches);
  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_TUMBADO);
    const alCambiar = (e) => setTumbado(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  // Aviso si no se puede recortar ({ tipo, texto }), en vez de alert()
  const [aviso, setAviso] = useState(null);

  // Cargar imagen cuando cambia el archivo
  useEffect(() => {
    if (!file) {
      console.error('❌ No file provided to ManualCropModal');
      return;
    }

    if (!(file instanceof File) && !(file instanceof Blob)) {
      console.error('❌ Invalid file type:', typeof file);
      return;
    }

    const img = new Image();
    objectUrlRef.current = URL.createObjectURL(file);
    
    img.onload = () => {
      console.log('✅ Imagen cargada correctamente para recorte');
      setOriginalImage(img);
      setImageLoaded(true);
    };
    
    img.onerror = (err) => {
      console.error('❌ Error cargando imagen para recorte:', err);
    };
    
    img.src = objectUrlRef.current;
  }, [file]);

  // Limpiar URL cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Escala de la foto según el hueco libre entre la cabecera y los botones, al cargarla y cada vez que cambia ese
  // hueco, por ejemplo al girar el móvil o cuando el navegador enseña o esconde sus barras. Antes el alto era el 65 %
  // de la ventana, sin mirar el hueco. Con el móvil tumbado el lienzo salía mucho más alto que su hueco, solo se veía
  // una tira, y como arrastrar sobre el lienzo mueve las esquinas, tampoco se podía bajar para ver el resto
  useLayoutEffect(() => {
    if (!imageLoaded || !originalImage || !vista) return;

    const ajustar = () => {
      const container = containerRef.current;
      if (!container) return;
      const px = (value) => parseFloat(value) || 0;
      const estilo = window.getComputedStyle(container);
      const ancho = container.clientWidth - px(estilo.paddingLeft) - px(estilo.paddingRight) - 2 * BORDE_LIENZO;
      const alto = container.clientHeight - px(estilo.paddingTop) - px(estilo.paddingBottom) - 2 * BORDE_LIENZO;
      if (ancho <= 0 || alto <= 0) return;
      const nueva = Math.min(ancho / vista.w, alto / vista.h, 1);
      setScale((anterior) => (anterior !== null && Math.abs(anterior - nueva) < 1e-4 ? anterior : nueva));
    };

    ajustar();
    // El hueco cambia también sin cambiar la ventana (el aviso de abajo puede aparecer), así que se mira el propio
    // contenedor. Cambiar el lienzo no lo cambia a él, porque tiene overflow-auto
    const container = containerRef.current;
    if (typeof ResizeObserver !== 'undefined' && container) {
      const observer = new ResizeObserver(() => ajustar());
      observer.observe(container);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [imageLoaded, originalImage, vista]);

  // Esquinas y vista de partida, al cargar la foto y al pulsar «Reiniciar». Si llegan esquinas de esta misma foto se
  // empieza en ellas y con el DNI encuadrado. Si no, en un rectángulo centrado y con la foto entera
  useEffect(() => {
    if (!imageLoaded || !originalImage || points) return;
    const esquinas = esquinasDePartida(initialCorners, originalImage);
    const encuadre = esquinas ? encuadreDe(esquinas, originalImage) : null;
    setPoints(esquinas || rectanguloDePartida(originalImage));
    setVista(encuadre || fotoEntera(originalImage));
    setEncuadrado(encuadre ? true : null);
  }, [imageLoaded, originalImage, points, initialCorners]);

  // De píxeles de la foto a píxeles del lienzo y al revés, según la parte de la foto que se ve
  const aLienzo = useCallback((p) => ({ x: (p.x - vista.x) * scale, y: (p.y - vista.y) * scale }), [vista, scale]);
  const aFoto = useCallback((p) => ({ x: vista.x + p.x / scale, y: vista.y + p.y / scale }), [vista, scale]);

  // Redibujar canvas con polígono
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !originalImage || !points || !vista || scale === null) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // El lienzo mide lo que mide en pantalla la parte de la foto que se ve
    const ancho = Math.max(1, Math.floor(vista.w * scale));
    const alto = Math.max(1, Math.floor(vista.h * scale));
    if (canvas.width !== ancho || canvas.height !== alto) {
      canvas.width = ancho;
      canvas.height = alto;
    }
    const dibujarFoto = () => ctx.drawImage(
      originalImage, vista.x, vista.y, vista.w, vista.h, 0, 0, vista.w * scale, vista.h * scale
    );
    const enLienzo = points.map(aLienzo);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dibujarFoto();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(enLienzo[0].x, enLienzo[0].y);
    enLienzo.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.clip();

    dibujarFoto();
    ctx.restore();

    ctx.strokeStyle = '#dd9ea0ff';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(enLienzo[0].x, enLienzo[0].y);
    enLienzo.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = '#E53338';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(enLienzo[0].x, enLienzo[0].y);
    enLienzo.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.stroke();

    // Los puntos se dibujan algo más pequeños que antes (10 px de radio en vez de 12) para tapar menos el borde del
    // DNI. Se pueden seguir cogiendo a 20 px de distancia (isNearPoint)
    ctx.setLineDash([]);
    enLienzo.forEach((point, index) => {
      ctx.fillStyle = '#E53338';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#E53338';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), point.x, point.y);
    });
  }, [originalImage, points, vista, scale, aLienzo]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Obtener posición del mouse/touch relativa al canvas
  const getCanvasPosition = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    // Sin el borde del lienzo, que si no desplaza 2 px cada esquina
    return {
      x: clientX - rect.left - canvas.clientLeft,
      y: clientY - rect.top - canvas.clientTop
    };
  };

  // Verificar si un punto está cerca de una posición
  const isNearPoint = (pos, point, threshold = 20) => {
    const dx = pos.x - point.x;
    const dy = pos.y - point.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  };

  // Iniciar arrastre de punto
  const handleMouseDown = useCallback((event) => {
    if (!points || !vista || scale === null) return;

    const pos = getCanvasPosition(event);
    if (!pos) return;

    const pointIndex = points.map(aLienzo).findIndex(point => isNearPoint(pos, point));

    if (pointIndex !== -1) {
      setDraggingPoint(pointIndex);
      event.preventDefault();
    }
  }, [points, vista, scale, aLienzo]);

  // Durante el arrastre. La esquina no sale de la parte de la foto que se ve, y se guarda en píxeles de la foto
  const handleMouseMove = useCallback((event) => {
    if (draggingPoint === null || !points || !vista || scale === null) return;

    event.preventDefault();

    const pos = getCanvasPosition(event);
    if (!pos) return;

    const clampedX = Math.max(0, Math.min(vista.w * scale, pos.x));
    const clampedY = Math.max(0, Math.min(vista.h * scale, pos.y));

    const newPoints = [...points];
    newPoints[draggingPoint] = aFoto({ x: clampedX, y: clampedY });
    setPoints(newPoints);
  }, [draggingPoint, points, vista, scale, aFoto]);

  // Finalizar arrastre
  const handleMouseUp = useCallback(() => {
    setDraggingPoint(null);
  }, []);

  // Event listeners con passive: false para touch events
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

  // Recortar imagen con corrección de perspectiva
  const handleCrop = async () => {
    setAviso(null);
    if (!points || !originalImage) {
      setAviso({ tipo: 'esquinas', texto: 'Coloca las cuatro esquinas sobre el DNI antes de recortar.' });
      return;
    }

    // Los puntos ya están en píxeles de la foto
    const originalPoints = points.map(p => ({ x: p.x, y: p.y }));

    // Calcular dimensiones del rectángulo de salida
    const topWidth = Math.sqrt(
      Math.pow(originalPoints[1].x - originalPoints[0].x, 2) +
      Math.pow(originalPoints[1].y - originalPoints[0].y, 2)
    );
    const bottomWidth = Math.sqrt(
      Math.pow(originalPoints[2].x - originalPoints[3].x, 2) +
      Math.pow(originalPoints[2].y - originalPoints[3].y, 2)
    );
    const leftHeight = Math.sqrt(
      Math.pow(originalPoints[3].x - originalPoints[0].x, 2) +
      Math.pow(originalPoints[3].y - originalPoints[0].y, 2)
    );
    const rightHeight = Math.sqrt(
      Math.pow(originalPoints[2].x - originalPoints[1].x, 2) +
      Math.pow(originalPoints[2].y - originalPoints[1].y, 2)
    );

    const outputWidth = Math.round(Math.max(topWidth, bottomWidth));
    const outputHeight = Math.round(Math.max(leftHeight, rightHeight));

    // Con las esquinas juntas el recorte sería una tira sin el DNI
    const ladoMenor = Math.min(outputWidth, outputHeight);
    if (ladoMenor * scale < LADO_MINIMO_PANTALLA || ladoMenor < LADO_MINIMO_FOTO) {
      setAviso({ tipo: 'esquinas', texto: 'Separa las esquinas y pon cada una en una esquina del DNI.' });
      return;
    }

    // Crear canvas temporal para el resultado
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = outputWidth;
    tempCanvas.height = outputHeight;

    // Puntos origen (cuadrilátero en la imagen original)
    const src = originalPoints;
    
    // Puntos destino (rectángulo perfecto en el canvas de salida)
    const dst = [
      { x: 0, y: 0 },
      { x: outputWidth, y: 0 },
      { x: outputWidth, y: outputHeight },
      { x: 0, y: outputHeight }
    ];

    // La homografía de la foto al rectángulo, y su inversa, que lleva cada píxel del resultado a la foto
    const inversa = invertir3x3(transformacionPerspectiva(src, dst));

    // Solo se lee la parte de la foto que cubren las esquinas (UX-2, ver utils/enderezarRecorte.js). Se dibuja a
    // tamaño real, así que sus píxeles son los mismos que los de la foto entera
    const { x0, y0, x1, y1 } = cajaDeLasEsquinas(src, originalImage.width, originalImage.height);
    const anchoTrozo = x1 - x0 + 1;
    const altoTrozo = y1 - y0 + 1;
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = anchoTrozo;
    sourceCanvas.height = altoTrozo;
    sourceCtx.drawImage(originalImage, x0, y0, anchoTrozo, altoTrozo, 0, 0, anchoTrozo, altoTrozo);
    const trozo = sourceCtx.getImageData(0, 0, anchoTrozo, altoTrozo);
    // Libera la memoria del lienzo sin esperar al recolector
    sourceCanvas.width = 0;
    sourceCanvas.height = 0;

    const imageData = ctx.createImageData(outputWidth, outputHeight);
    enderezar({ data: trozo.data, width: anchoTrozo, x0, y0 }, inversa, imageData.data, outputWidth, outputHeight,
      originalImage.width, originalImage.height);
    ctx.putImageData(imageData, 0, 0);

    // Convertir a blob
    tempCanvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File(
            [blob],
            file.name.replace(/\.\w+$/, '-manual-crop.jpg'),
            { type: 'image/jpeg', lastModified: Date.now() }
          );
          onCrop(croppedFile, {
            ancho: originalImage.width,
            alto: originalImage.height,
            puntos: originalPoints
          });
        } else {
          setAviso(AVISO_RECORTE_FALLIDO);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // Si el recorte falla, por ejemplo por falta de memoria con una foto enorme, se avisa en vez de no hacer nada
  const recortar = () => {
    handleCrop().catch((error) => {
      console.error('❌ Error al recortar:', error);
      setAviso(AVISO_RECORTE_FALLIDO);
    });
  };

  // Reset puntos. Vuelven las esquinas y la vista de partida
  const handleReset = () => {
    setPoints(null);
    setAviso(null);
  };

  // Ver la foto entera o volver a encuadrar las esquinas como estén en ese momento
  const verFotoEntera = () => {
    setVista(fotoEntera(originalImage));
    setEncuadrado(false);
  };
  const encuadreDisponible = encuadrado !== true && points && originalImage ? encuadreDe(points, originalImage) : null;
  const acercar = () => {
    if (!encuadreDisponible) return;
    setVista(encuadreDisponible);
    setEncuadrado(true);
  };
  const botonVista = encuadrado === true
    ? { texto: 'Foto entera', icono: 'bi-arrows-angle-expand', alPulsar: verFotoEntera, nombre: 'Ver la foto entera' }
    : encuadreDisponible
      ? { texto: 'Acercar', icono: 'bi-zoom-in', alPulsar: acercar, nombre: 'Acercar a las esquinas' }
      : null;
  const renderBotonVista = () => botonVista && (
    <button
      type="button"
      onClick={botonVista.alPulsar}
      aria-label={botonVista.nombre}
      className={`btn btn-sm btn-oscuro ${tumbado ? 'w-full mt-2' : 'flex-none px-3'}`}
    >
      <i className={`bi ${botonVista.icono}`}></i>
      <span>{botonVista.texto}</span>
    </button>
  );

  return (
    // Fondo opaco. Con bg-black/95 se veía la página de detrás y su texto se mezclaba con las instrucciones.
    // Con el móvil tumbado es una rejilla de dos columnas, como la censura manual. La foto ocupa toda la de la
    // izquierda y la cabecera, las instrucciones y los botones van apilados en la de la derecha, en el mismo orden.
    // Solo cambian las clases, así que al girar el móvil el lienzo no se vuelve a crear
    <div
      className={`fixed inset-0 z-50 bg-black ${tumbado
        ? 'grid grid-cols-[minmax(0,1fr)_15rem] grid-rows-[auto_auto_minmax(0,1fr)_auto]'
        : 'flex flex-col'}`}
    >
      {/* Header */}
      <div className={`bg-gray-900 text-white flex items-center justify-between border-b border-gray-700 ${tumbado
        ? 'col-start-2 row-start-1 border-l px-2 py-1.5'
        : 'p-3 md:p-4'}`}
      >
        <div className={`flex items-center ${tumbado ? 'gap-2' : 'space-x-3'}`}>
          <button
            onClick={onCancel}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-700 rounded-xl transition-colors"
            aria-label="Volver"
          >
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h2 className={`font-semibold ${tumbado ? 'text-base' : 'text-base md:text-lg'}`}>{titulo}</h2>
            <p className={`text-gray-400 ${tumbado ? 'text-xs' : 'text-xs md:text-sm'}`}>{subtitulo}</p>
          </div>
        </div>

        {/* Acercar a las esquinas o ver la foto entera. Con el móvil tumbado va bajo las instrucciones */}
        {!tumbado && renderBotonVista()}
      </div>

      {/* Instrucciones mejoradas. Con el móvil tumbado solo la primera frase, en pequeño */}
      <div className={`bg-gray-800 border-b border-gray-700 ${tumbado ? 'col-start-2 row-start-2 border-l p-2' : 'p-3 md:p-4'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 bg-primary-500 rounded-full items-center justify-center mt-0.5 ${tumbado ? 'hidden' : 'flex'}`}>
              <i className="bi bi-info-lg text-gray-900 text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-white font-medium ${tumbado ? 'text-xs' : 'text-sm md:text-base mb-1'}`}>
                Ajusta las cuatro esquinas del DNI moviendo los puntos rojos
              </p>
              <p className={tumbado ? 'hidden' : 'text-gray-300 text-xs md:text-sm'}>
                La imagen se corregirá automáticamente aunque esté inclinada o en perspectiva
              </p>
              {tumbado && renderBotonVista()}
            </div>
          </div>
        </div>
      </div>

      {/* Con el móvil tumbado rellena la columna de la derecha entre las instrucciones y el pie */}
      {tumbado && <div aria-hidden="true" className="col-start-2 row-start-3 bg-gray-900 border-l border-gray-700" />}

      {/* Canvas container. Con el móvil tumbado ocupa la columna de la izquierda de arriba abajo */}
      <div
        ref={containerRef}
        className={`flex items-center justify-center overflow-auto ${tumbado
          ? 'col-start-1 row-start-1 row-span-4 min-h-0 p-2'
          : 'flex-1 p-2 md:p-4'}`}
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
              className="border-2 border-gray-600 rounded-lg cursor-move touch-none shadow-2xl max-w-full max-h-full"
              style={{ cursor: draggingPoint !== null ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        )}
      </div>

      {/* Footer con acciones. Con el móvil tumbado, al pie de la columna, con Reiniciar y Cancelar en una fila y
          Recortar en otra */}
      <div className={`bg-gray-900 border-t border-gray-700 ${tumbado ? 'col-start-2 row-start-4 border-l p-2' : 'p-3 md:p-4'}`}>
        {aviso && (
          <Aviso tipo={aviso.tipo} oscuro onCerrar={() => setAviso(null)} className={`max-w-4xl mx-auto ${tumbado ? 'mb-2' : 'mb-3'}`}>
            {aviso.texto}
          </Aviso>
        )}
        <div className={`flex flex-col max-w-4xl mx-auto ${tumbado ? 'gap-2' : 'gap-3 sm:flex-row items-center justify-between'}`}>
          {/* Info de selección */}
          <div className={tumbado ? 'text-gray-400 text-xs' : 'text-gray-400 text-xs md:text-sm order-2 sm:order-1'}>
            {points ? (
              <span className="text-success-400 flex items-center">
                <i className="bi bi-check-circle mr-1.5"></i>
                <span className="hidden sm:inline">Listo para recortar</span>
                <span className="sm:hidden">Listo</span>
              </span>
            ) : (
              <span className="flex items-center">
                <i className="bi bi-hourglass-split mr-1.5 animate-pulse"></i>
                Cargando...
              </span>
            )}
          </div>

          {/* Botones - Responsive */}
          <div className={tumbado
            ? 'grid grid-cols-2 gap-2'
            : 'flex items-center gap-2 md:gap-3 w-full sm:w-auto order-1 sm:order-2'}
          >
            {points && (
              <button
                onClick={handleReset}
                className={`btn btn-oscuro text-sm ${tumbado ? 'px-2' : 'px-3 flex-1 sm:flex-initial md:px-6 md:text-base'}`}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                <span>Reiniciar</span>
              </button>
            )}

            <button
              onClick={onCancel}
              className={`btn btn-oscuro text-sm ${tumbado ? 'px-2' : 'px-3 flex-1 sm:flex-initial md:px-6 md:text-base'}`}
            >
              Cancelar
            </button>

            <button
              onClick={recortar}
              disabled={!points}
              className={`btn btn-principal text-sm ${tumbado ? 'col-span-2 px-3' : 'px-3 flex-1 sm:flex-initial md:px-6 md:text-base'}`}
            >
              <i className="bi bi-crop"></i>
              <span>Recortar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManualCropModal;