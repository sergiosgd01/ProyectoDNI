import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Modal para censura manual de campos del DNI
 * Permite elegir qué cara censurar (Anverso, Reverso o Ambas)
 */
function ManualCensorModal({ fieldsToCensor, onComplete, onCancel }) {

  // Archivos
  const frontFile = fieldsToCensor?.front || null;
  const backFile  = fieldsToCensor?.back || null;

  // Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Estado de imagen
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [scale, setScale] = useState(1);

  // Lado actual
  const [currentSide, setCurrentSide] = useState('front');

  // Rectángulos por lado
  const [frontRectangles, setFrontRectangles] = useState([]);
  const [backRectangles, setBackRectangles] = useState([]);

  // Estado de dibujo
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);

  // Bloquear scroll
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalStyle; };
  }, []);

  // Ajustar lado inicial según archivos disponibles
  useEffect(() => {
    if (!frontFile && backFile) setCurrentSide('back');
    else setCurrentSide('front');
  }, [frontFile, backFile]);

  // Helpers de rectángulos y archivos
  const getCurrentFile = useCallback(() => {
    if (currentSide === 'front') return frontFile;
    if (currentSide === 'back') return backFile;
    return null;
  }, [currentSide, frontFile, backFile]);

  const getCurrentRectangles = useCallback(
    () => currentSide === 'front' ? frontRectangles : backRectangles,
    [currentSide, frontRectangles, backRectangles]
  );

  const setCurrentRectangles = useCallback((rects) => {
    if (currentSide === 'front') setFrontRectangles(rects);
    else setBackRectangles(rects);
  }, [currentSide]);

  // Carga de imagen
  useEffect(() => {
    const file = getCurrentFile();
    if (!file) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    setImageLoaded(false);

    const img = new Image();
    objectUrlRef.current = URL.createObjectURL(file);
    img.onload = () => {
      setOriginalImage(img);
      setImageLoaded(true);
    };
    img.src = objectUrlRef.current;
  }, [currentSide, getCurrentFile]);

  // Configuración del Canvas
  useEffect(() => {
    if (!imageLoaded || !originalImage || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32;
    const containerHeight = window.innerHeight * 0.55;

    const newScale = Math.min(containerWidth / originalImage.width, containerHeight / originalImage.height, 1);
    setScale(newScale);

    canvas.width = originalImage.width * newScale;
    canvas.height = originalImage.height * newScale;

    redrawCanvas();
  }, [imageLoaded, originalImage]);

  // Redibujar canvas
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !originalImage) return;
    const ctx = canvasRef.current.getContext('2d');
    const rectangles = getCurrentRectangles();

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(originalImage, 0, 0, canvasRef.current.width, canvasRef.current.height);

    ctx.fillStyle = 'black';
    rectangles.forEach(rect => ctx.fillRect(rect.x, rect.y, rect.width, rect.height));

    if (currentRect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }
  }, [originalImage, getCurrentRectangles, currentRect]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas, frontRectangles, backRectangles, currentRect]);

  // Lógica de dibujo
  const getCanvasPosition = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasPosition(e);
    setIsDrawing(true);
    setStartPoint(pos);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPoint) return;
    const pos = getCanvasPosition(e);
    setCurrentRect({
      x: Math.min(startPoint.x, pos.x),
      y: Math.min(startPoint.y, pos.y),
      width: Math.abs(pos.x - startPoint.x),
      height: Math.abs(pos.y - startPoint.y)
    });
  };

  const commitCurrentRect = () => {
    if (currentRect && currentRect.width > 5) {
      setCurrentRectangles([...getCurrentRectangles(), currentRect]);
      setCurrentRect(null);
    }
  };

  const handleMouseUp = () => {
    commitCurrentRect();
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Generar imagen censurada
  const generateCensoredImage = async (file, rectangles) => {
    if (!file) return null;
    if (rectangles.length === 0) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(new Blob([reader.result], { type: file.type }));
        reader.readAsArrayBuffer(file);
      });
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = 'black';
        rectangles.forEach(rect => {
          ctx.fillRect(rect.x / scale, rect.y / scale, rect.width / scale, rect.height / scale);
        });
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        }, 'image/jpeg', 0.95);
      };
      img.src = url;
    });
  };

  // Procesar y completar
  const processAndComplete = async () => {
    try {
      commitCurrentRect(); // Guardar rectángulo en curso antes de finalizar

      const result = { success: true, manualCensor: true };

      if (frontFile) {
        const blob = await generateCensoredImage(frontFile, frontRectangles);
        result.frontImageUrl = URL.createObjectURL(blob);
      }

      if (backFile) {
        const blob = await generateCensoredImage(backFile, backRectangles);
        result.backImageUrl = URL.createObjectURL(blob);
      }

      onComplete(result);
    } catch (e) {
      console.error('Error en censura manual:', e);
    }
  };

  // Habilitar botón Finalizar si hay alguna censura
  const hasAnyCensorship =
    frontRectangles.length > 0 ||
    backRectangles.length > 0 ||
    (currentRect && currentRect.width > 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <button onClick={onCancel} className="p-2 hover:bg-gray-700 rounded-lg">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <h2 className="font-semibold">Censura de Documento</h2>
        </div>
        <div className="text-sm bg-gray-700 px-3 py-1 rounded-full">
          Total: {frontRectangles.length + backRectangles.length} áreas
        </div>
      </div>

      {/* Side Selector */}
      <div className="bg-gray-800 p-3 flex justify-center gap-4">
        {frontFile && (
          <button
            onClick={() => setCurrentSide('front')}
            className={`px-6 py-2 rounded-lg flex items-center gap-2 ${currentSide === 'front' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            <i className="bi bi-credit-card-front"></i> Anverso {frontRectangles.length > 0 && `(${frontRectangles.length})`}
          </button>
        )}
        {backFile && (
          <button
            onClick={() => setCurrentSide('back')}
            className={`px-6 py-2 rounded-lg flex items-center gap-2 ${currentSide === 'back' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            <i className="bi bi-credit-card-back"></i> Reverso {backRectangles.length > 0 && `(${backRectangles.length})`}
          </button>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-auto bg-black">
        {imageLoaded && (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="border-2 border-dashed border-gray-500 rounded-lg cursor-crosshair"
          />
        )}
      </div>

      {/* Toolbar & Actions */}
      <div className="bg-gray-900 p-4 border-t border-gray-700 flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={() => setCurrentRectangles(getCurrentRectangles().slice(0, -1))} className="p-2 bg-gray-700 text-white rounded">
            <i className="bi bi-arrow-counterclockwise"></i>
          </button>
          <button onClick={() => setCurrentRectangles([])} className="p-2 bg-red-900/50 text-red-200 rounded">
            <i className="bi bi-trash"></i>
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-gray-400">Cancelar</button>
          <button
            onClick={processAndComplete}
            disabled={!hasAnyCensorship}
            className={`px-8 py-2 rounded-lg font-bold ${hasAnyCensorship ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          >
            Finalizar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManualCensorModal;