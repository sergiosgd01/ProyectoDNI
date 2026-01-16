import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Modal para recorte manual de imagen cuando YOLO falla
 * Sistema de 4 puntos ajustables para recortar DNI en perspectiva
 */
function ManualCropModal({ 
  file, 
  onCrop, 
  onCancel,
  errorInfo = null 
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [scale, setScale] = useState(1);
  const objectUrlRef = useRef(null);
  
  // Estado de los 4 puntos del polígono (esquinas del DNI)
  const [points, setPoints] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);

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

  // Dibujar canvas cuando la imagen está lista
  useEffect(() => {
    if (!imageLoaded || !originalImage || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;

    const containerWidth = container.clientWidth - 32;
    const containerHeight = window.innerHeight * 0.65;

    const scaleX = containerWidth / originalImage.width;
    const scaleY = containerHeight / originalImage.height;
    const newScale = Math.min(scaleX, scaleY, 1);

    setScale(newScale);

    canvas.width = originalImage.width * newScale;
    canvas.height = originalImage.height * newScale;

    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    if (!points) {
      const dniAspectRatio = 85.6 / 53.98;
      const estimatedWidth = Math.min(canvas.width * 0.7, canvas.height * dniAspectRatio * 0.7);
      const estimatedHeight = estimatedWidth / dniAspectRatio;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      setPoints([
        { x: centerX - estimatedWidth / 2, y: centerY - estimatedHeight / 2 },
        { x: centerX + estimatedWidth / 2, y: centerY - estimatedHeight / 2 },
        { x: centerX + estimatedWidth / 2, y: centerY + estimatedHeight / 2 },
        { x: centerX - estimatedWidth / 2, y: centerY + estimatedHeight / 2 },
      ]);
    }
  }, [imageLoaded, originalImage, points]);

  // Redibujar canvas con polígono
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !originalImage || !points) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.strokeStyle = '#dd9ea0ff';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = '#E53338';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.stroke();

    ctx.setLineDash([]);
    points.forEach((point, index) => {
      ctx.fillStyle = '#E53338';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#E53338';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), point.x, point.y);
    });
  }, [originalImage, points]);

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

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
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
    if (!points) return;
    
    const pos = getCanvasPosition(event);
    if (!pos) return;

    const pointIndex = points.findIndex(point => isNearPoint(pos, point));
    
    if (pointIndex !== -1) {
      setDraggingPoint(pointIndex);
      event.preventDefault();
    }
  }, [points]);

  // Durante el arrastre
  const handleMouseMove = useCallback((event) => {
    if (draggingPoint === null || !points) return;
    
    event.preventDefault();

    const pos = getCanvasPosition(event);
    if (!pos) return;

    const canvas = canvasRef.current;
    
    const clampedX = Math.max(0, Math.min(canvas.width, pos.x));
    const clampedY = Math.max(0, Math.min(canvas.height, pos.y));

    const newPoints = [...points];
    newPoints[draggingPoint] = { x: clampedX, y: clampedY };
    setPoints(newPoints);
  }, [draggingPoint, points]);

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

  // Calcular matriz de transformación de perspectiva (homografía)
  const getPerspectiveTransform = (src, dst) => {
    const A = [];
    const b = [];
    
    for (let i = 0; i < 4; i++) {
      const sx = src[i].x;
      const sy = src[i].y;
      const dx = dst[i].x;
      const dy = dst[i].y;
      
      A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
      A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
      
      b.push(dx);
      b.push(dy);
    }
    
    const h = gaussianElimination(A, b);
    
    return [
      [h[0], h[1], h[2]],
      [h[3], h[4], h[5]],
      [h[6], h[7], 1]
    ];
  };

  // Eliminación de Gauss para resolver sistema lineal
  const gaussianElimination = (A, b) => {
    const n = b.length;
    const Ab = A.map((row, i) => [...row, b[i]]);
    
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(Ab[k][i]) > Math.abs(Ab[maxRow][i])) {
          maxRow = k;
        }
      }
      [Ab[i], Ab[maxRow]] = [Ab[maxRow], Ab[i]];
      
      for (let k = i + 1; k < n; k++) {
        const factor = Ab[k][i] / Ab[i][i];
        for (let j = i; j < n + 1; j++) {
          Ab[k][j] -= factor * Ab[i][j];
        }
      }
    }
    
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = Ab[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= Ab[i][j] * x[j];
      }
      x[i] /= Ab[i][i];
    }
    
    return x;
  };

  // Invertir matriz 3x3
  const invertMatrix = (m) => {
    const det = 
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    
    if (Math.abs(det) < 1e-10) {
      throw new Error('Matriz singular, no se puede invertir');
    }
    
    const inv = [
      [
        (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det,
        (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det,
        (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det
      ],
      [
        (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det,
        (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det,
        (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det
      ],
      [
        (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det,
        (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det,
        (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det
      ]
    ];
    
    return inv;
  };

  // Aplicar transformación de perspectiva a un punto
  const applyPerspectiveTransform = (point, matrix, inverse = false) => {
    if (inverse) {
      matrix = invertMatrix(matrix);
    }
    
    const x = point.x;
    const y = point.y;
    
    const w = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2];
    
    return {
      x: (matrix[0][0] * x + matrix[0][1] * y + matrix[0][2]) / w,
      y: (matrix[1][0] * x + matrix[1][1] * y + matrix[1][2]) / w
    };
  };

  // Interpolación bilineal para mejor calidad de imagen
  const bilinearInterpolation = (imageData, x, y) => {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.min(x1 + 1, imageData.width - 1);
    const y2 = Math.min(y1 + 1, imageData.height - 1);
    
    const dx = x - x1;
    const dy = y - y1;
    
    const getPixel = (px, py) => {
      const idx = (py * imageData.width + px) * 4;
      return {
        r: imageData.data[idx],
        g: imageData.data[idx + 1],
        b: imageData.data[idx + 2]
      };
    };
    
    const c1 = getPixel(x1, y1);
    const c2 = getPixel(x2, y1);
    const c3 = getPixel(x1, y2);
    const c4 = getPixel(x2, y2);
    
    return {
      r: Math.round(
        c1.r * (1 - dx) * (1 - dy) +
        c2.r * dx * (1 - dy) +
        c3.r * (1 - dx) * dy +
        c4.r * dx * dy
      ),
      g: Math.round(
        c1.g * (1 - dx) * (1 - dy) +
        c2.g * dx * (1 - dy) +
        c3.g * (1 - dx) * dy +
        c4.g * dx * dy
      ),
      b: Math.round(
        c1.b * (1 - dx) * (1 - dy) +
        c2.b * dx * (1 - dy) +
        c3.b * (1 - dx) * dy +
        c4.b * dx * dy
      )
    };
  };

  // Recortar imagen con corrección de perspectiva
  const handleCrop = async () => {
    if (!points || !originalImage) {
      alert('Por favor, ajusta las 4 esquinas del DNI');
      return;
    }

    // Convertir puntos a escala original
    const originalPoints = points.map(p => ({
      x: p.x / scale,
      y: p.y / scale
    }));

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

    // Calcular matriz de transformación de perspectiva
    const matrix = getPerspectiveTransform(src, dst);

    // Aplicar transformación píxel por píxel
    const imageData = ctx.createImageData(outputWidth, outputHeight);
    
    // Crear un canvas temporal con la imagen original
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = originalImage.width;
    sourceCanvas.height = originalImage.height;
    sourceCtx.drawImage(originalImage, 0, 0);
    const sourceData = sourceCtx.getImageData(0, 0, originalImage.width, originalImage.height);

    // Transformación inversa para cada píxel del destino
    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        // Aplicar transformación inversa
        const srcPoint = applyPerspectiveTransform({ x, y }, matrix, true);
        
        // Si el punto está dentro de la imagen original
        if (srcPoint.x >= 0 && srcPoint.x < originalImage.width &&
            srcPoint.y >= 0 && srcPoint.y < originalImage.height) {
          
          // Interpolación bilineal para mejor calidad
          const color = bilinearInterpolation(sourceData, srcPoint.x, srcPoint.y);
          
          const dstIdx = (y * outputWidth + x) * 4;
          imageData.data[dstIdx] = color.r;
          imageData.data[dstIdx + 1] = color.g;
          imageData.data[dstIdx + 2] = color.b;
          imageData.data[dstIdx + 3] = 255;
        }
      }
    }

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
          onCrop(croppedFile);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // Reset puntos
  const handleReset = () => {
    setPoints(null);
  };

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
            <h2 className="font-semibold text-base md:text-lg">Recorte manual</h2>
            <p className="text-gray-400 text-xs md:text-sm">Selecciona el área del DNI</p>
          </div>
        </div>
      </div>

      {/* Instrucciones mejoradas */}
      <div className="bg-primary-900/40 border-b border-primary-700/50 p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center mt-0.5">
              <i className="bi bi-info-lg text-white text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-primary-100 text-sm md:text-base font-medium mb-1">
                Ajusta las 4 esquinas del DNI moviendo los puntos azules
              </p>
              <p className="text-primary-200/70 text-xs md:text-sm">
                La imagen se corregirá automáticamente aunque esté inclinada o en perspectiva
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas container - Responsive */}
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

      {/* Footer con acciones - Responsive */}
      <div className="bg-gray-900 p-3 md:p-4 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto">
          {/* Info de selección */}
          <div className="text-gray-400 text-xs md:text-sm order-2 sm:order-1">
            {points ? (
              <span className="text-secondary-400 flex items-center">
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
          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto order-1 sm:order-2">
            {points && (
              <button
                onClick={handleReset}
                className="px-3 md:px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs md:text-sm flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                <span className="hidden sm:inline">Reiniciar</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
            
            <button
              onClick={onCancel}
              className="px-3 md:px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs md:text-sm flex-1 sm:flex-initial"
            >
              Cancelar
            </button>

            <button
              onClick={handleCrop}
              disabled={!points}
              className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-colors text-xs md:text-sm flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                points
                  ? 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
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