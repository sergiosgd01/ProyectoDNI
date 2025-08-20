// src/components/ImageCropper.jsx
import React, { useState, useRef, useEffect } from 'react';

function ImageCropper({ imageUrl, onCropComplete, onCancel, onRetakePhoto }) {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [dragIndex, setDragIndex] = useState(-1);
  const [image, setImage] = useState(null);
  const [isTutorialExpanded, setIsTutorialExpanded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      drawCanvas(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const drawCanvas = (img, selectedPoints = []) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Calcular dimensiones para ajustar la imagen al canvas manteniendo proporción
    const maxWidth = 800;
    const maxHeight = 600;
    let { width, height } = img;
    
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Dibujar la imagen
    ctx.drawImage(img, 0, 0, width, height);
    
    // Dibujar puntos y líneas de selección
    if (selectedPoints.length > 0) {
      ctx.strokeStyle = '#3B82F6';
      ctx.fillStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      // Dibujar líneas entre puntos
      if (selectedPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(selectedPoints[0].x, selectedPoints[0].y);
        for (let i = 1; i < selectedPoints.length; i++) {
          ctx.lineTo(selectedPoints[i].x, selectedPoints[i].y);
        }
        if (selectedPoints.length === 4) {
          ctx.closePath();
        }
        ctx.stroke();
      }
      
      // Dibujar puntos
      selectedPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Número del punto
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText((index + 1).toString(), point.x, point.y + 4);
        ctx.fillStyle = '#3B82F6';
      });
      
      // Si tenemos 4 puntos, dibujar overlay
      if (selectedPoints.length === 4) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        
        // Crear máscara inversa
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-out';
        
        // Área seleccionada
        ctx.beginPath();
        ctx.moveTo(selectedPoints[0].x, selectedPoints[0].y);
        for (let i = 1; i < selectedPoints.length; i++) {
          ctx.lineTo(selectedPoints[i].x, selectedPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getPointDistance = (p1, p2) => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    
    // Verificar si hacemos clic cerca de un punto existente para arrastrarlo
    const nearPoint = points.findIndex(point => getPointDistance(pos, point) < 15);
    
    if (nearPoint !== -1) {
      setDragIndex(nearPoint);
    } else if (points.length < 4) {
      // Añadir nuevo punto
      const newPoints = [...points, pos];
      setPoints(newPoints);
      drawCanvas(image, newPoints);
    }
  };

  const handleMouseMove = (e) => {
    if (dragIndex === -1) return;
    
    const pos = getMousePos(e);
    const newPoints = [...points];
    newPoints[dragIndex] = pos;
    setPoints(newPoints);
    drawCanvas(image, newPoints);
  };

  const handleMouseUp = () => {
    setDragIndex(-1);
  };

  const handleCrop = () => {
    if (points.length !== 4 || !image) return;
    
    const canvas = canvasRef.current;
    const scaleX = image.width / canvas.width;
    const scaleY = image.height / canvas.height;
    
    // Coordenadas en la imagen original
    const originalPoints = points.map(point => ({
      x: point.x * scaleX,
      y: point.y * scaleY
    }));
    
    // Crear imagen recortada con corrección de perspectiva
    const croppedImageUrl = cropWithPerspectiveCorrection(image, originalPoints);
    onCropComplete(croppedImageUrl);
  };

  const cropWithPerspectiveCorrection = (img, fourPoints) => {
    // Calcular el tamaño del DNI corregido (proporción 1.586:1)
    const dniRatio = 1.586;
    const outputWidth = 800;
    const outputHeight = outputWidth / dniRatio;
    
    // Crear canvas para la imagen corregida
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    // Ordenar puntos en orden: top-left, top-right, bottom-right, bottom-left
    const orderedPoints = orderPoints(fourPoints);
    
    // Crear canvas temporal
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    tempCtx.drawImage(img, 0, 0);
    
    // Usar la API Canvas para transformación (más eficiente)
    try {
      // Calcular matriz de transformación
      const srcQuad = [
        orderedPoints[0].x, orderedPoints[0].y,  // top-left
        orderedPoints[1].x, orderedPoints[1].y,  // top-right
        orderedPoints[2].x, orderedPoints[2].y,  // bottom-right
        orderedPoints[3].x, orderedPoints[3].y   // bottom-left
      ];
      
      const dstQuad = [
        0, 0,                    // top-left
        outputWidth, 0,          // top-right
        outputWidth, outputHeight, // bottom-right
        0, outputHeight          // bottom-left
      ];
      
      // Aplicar transformación usando mapeo directo píxel por píxel
      const sourceData = tempCtx.getImageData(0, 0, img.width, img.height);
      const destData = ctx.createImageData(outputWidth, outputHeight);
      
      for (let y = 0; y < outputHeight; y++) {
        for (let x = 0; x < outputWidth; x++) {
          // Coordenadas normalizadas en el destino
          const u = x / outputWidth;
          const v = y / outputHeight;
          
          // Interpolación bilineal inversa para encontrar el punto fuente
          const srcPoint = bilinearInverse(orderedPoints, u, v);
          
          const srcX = Math.round(srcPoint.x);
          const srcY = Math.round(srcPoint.y);
          
          if (srcX >= 0 && srcX < img.width && srcY >= 0 && srcY < img.height) {
            const srcIndex = (srcY * img.width + srcX) * 4;
            const destIndex = (y * outputWidth + x) * 4;
            
            destData.data[destIndex] = sourceData.data[srcIndex];
            destData.data[destIndex + 1] = sourceData.data[srcIndex + 1];
            destData.data[destIndex + 2] = sourceData.data[srcIndex + 2];
            destData.data[destIndex + 3] = 255;
          }
        }
      }
      
      ctx.putImageData(destData, 0, 0);
      
    } catch (error) {
      console.error('Error en transformación:', error);
      // Fallback: recorte simple
      const bounds = getBoundingBox(fourPoints);
      ctx.drawImage(
        img,
        bounds.x, bounds.y, bounds.width, bounds.height,
        0, 0, outputWidth, outputHeight
      );
    }
    
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // Ordenar puntos en sentido horario empezando por arriba-izquierda
  const orderPoints = (points) => {
    // Encontrar el centroide
    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    
    // Ordenar por ángulo desde el centroide
    const sorted = points.slice().sort((a, b) => {
      const angleA = Math.atan2(a.y - cy, a.x - cx);
      const angleB = Math.atan2(b.y - cy, b.x - cx);
      return angleA - angleB;
    });
    
    // Encontrar el punto más arriba-izquierda como punto de inicio
    let startIndex = 0;
    let minSum = sorted[0].x + sorted[0].y;
    
    for (let i = 1; i < sorted.length; i++) {
      const sum = sorted[i].x + sorted[i].y;
      if (sum < minSum) {
        minSum = sum;
        startIndex = i;
      }
    }
    
    // Reordenar empezando desde el punto arriba-izquierda
    const ordered = [];
    for (let i = 0; i < 4; i++) {
      ordered.push(sorted[(startIndex + i) % 4]);
    }
    
    return ordered;
  };

  // Interpolación bilineal inversa
  const bilinearInverse = (corners, u, v) => {
    const [tl, tr, br, bl] = corners;
    
    // Interpolación en la dirección horizontal
    const top = {
      x: tl.x + u * (tr.x - tl.x),
      y: tl.y + u * (tr.y - tl.y)
    };
    
    const bottom = {
      x: bl.x + u * (br.x - bl.x),
      y: bl.y + u * (br.y - bl.y)
    };
    
    // Interpolación en la dirección vertical
    return {
      x: top.x + v * (bottom.x - top.x),
      y: top.y + v * (bottom.y - top.y)
    };
  };

  // Obtener bounding box
  const getBoundingBox = (points) => {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  };

  const handleReset = () => {
    setPoints([]);
    setDragIndex(-1);
    if (image) {
      drawCanvas(image);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg p-3 sm:p-6 w-full h-full sm:max-w-7xl sm:max-h-[95vh] overflow-y-auto relative flex flex-col">
        {/* Botón Cancelar en esquina superior derecha */}
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 text-2xl z-10 bg-white rounded-full p-1 shadow-lg hover:shadow-xl transition-all"
          title="Cancelar"
        >
          <i className="bi bi-x"></i>
        </button>
        
        {/* Contenido principal que crece */}
        <div className="flex-1 flex flex-col min-h-0">
          <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4 text-center">Recortar DNI</h3>
        
          {/* Tutorial con imagen de ejemplo */}
          <div className="mb-4 sm:mb-6 bg-primary-50 rounded-lg border border-primary-200 flex-shrink-0">
            {/* Header del tutorial - siempre visible en móvil */}
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between lg:hidden">
                <h4 className="font-semibold text-primary-800 text-sm sm:text-base">
                  <i className="bi bi-clipboard-check text-primary-800 mr-2"></i>
                  Tutorial de recorte
                </h4>
                <button
                  onClick={() => setIsTutorialExpanded(!isTutorialExpanded)}
                  className="text-primary-600 hover:text-primary-800 transition-colors"
                >
                  <i className={`bi ${isTutorialExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-lg`}></i>
                </button>
              </div>
              
              {/* Contenido del tutorial */}
              <div className={`${isTutorialExpanded ? 'block' : 'hidden'} lg:block`}>
                <div className="flex flex-col lg:flex-row gap-4 items-center pt-4 lg:pt-0">
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary-800 mb-2 hidden lg:block">
                      <i className="bi bi-clipboard-check text-primary-800 mr-2"></i>
                      Tutorial de recorte
                    </h4>
                    <p className="text-primary-700 text-sm mb-2">
                      Haz clic en las 4 esquinas del DNI siguiendo este orden:
                    </p>
                    <ol className="text-primary-700 text-sm space-y-1">
                      <li><span className="font-semibold">1.</span> Esquina superior izquierda</li>
                      <li><span className="font-semibold">2.</span> Esquina superior derecha</li>
                      <li><span className="font-semibold">3.</span> Esquina inferior derecha</li>
                      <li><span className="font-semibold">4.</span> Esquina inferior izquierda</li>
                    </ol>
                    <p className="text-primary-600 text-xs mt-2">
                      <i className="bi bi-lightbulb text-primary-600 mr-1"></i>
                      Puedes arrastrar los puntos para ajustarlos después de colocarlos
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <img 
                      src="/dni.png" 
                      alt="Ejemplo de DNI para recortar" 
                      className="w-32 sm:w-48 h-auto rounded-lg shadow-md border-2 border-primary-300"
                    />
                    <p className="text-xs text-primary-600 text-center mt-1">Ejemplo de DNI</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 mb-1 sm:mb-2 text-center text-sm sm:text-base">
            Selecciona las 4 esquinas de tu DNI en el orden indicado arriba
          </p>
          <p className="text-sm text-primary-600 mb-2 sm:mb-4 text-center font-medium">
            Puntos seleccionados: {points.length}/4
          </p>
          
          {/* Canvas que crece y se ajusta */}
          <div className="flex-1 flex justify-center items-center min-h-0 mb-4">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="border border-gray-300 cursor-crosshair max-w-full max-h-full rounded-lg shadow-sm"
              style={{ maxHeight: 'calc(100% - 2rem)' }}
            />
          </div>
        </div>
        
        {/* Botones fijos en la parte inferior */}
        <div className="flex-shrink-0 pt-2 sm:pt-4 border-t bg-white">
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
            <button
              onClick={handleReset}
              className="px-4 sm:px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 justify-center text-sm sm:text-base"
            >
              <i className="bi bi-arrow-clockwise text-white"></i>
              Reiniciar
            </button>
            <button
              onClick={onRetakePhoto}
              className="px-4 sm:px-6 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors flex items-center gap-2 justify-center text-sm sm:text-base"
            >
              <i className="bi bi-camera text-white"></i>
              Volver a hacer foto
            </button>
            <button
              onClick={handleCrop}
              disabled={points.length !== 4}
              className="px-4 sm:px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium justify-center text-sm sm:text-base"
            >
              <i className="bi bi-crop text-white"></i>
              Recortar DNI ({points.length}/4)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageCropper;