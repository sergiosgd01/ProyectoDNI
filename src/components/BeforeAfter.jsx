// src/components/BeforeAfter.jsx
import React, { useState } from 'react';

function BeforeAfter({ originalImage, processedImage }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Título */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Antes y Después</h2>
        <p className="text-gray-600">Desliza para ver la diferencia entre la imagen original y el resultado final</p>
      </div>

      {/* Contenedor principal */}
      <div 
        className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden shadow-xl cursor-ew-resize"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Imagen original (fondo) */}
        <div className="absolute inset-0">
          <img 
            src={originalImage} 
            alt="Imagen original" 
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Imagen procesada (overlay) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={processedImage} 
            alt="Imagen procesada" 
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Etiquetas fijas - fuera del clipPath */}
        <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-30">
          ANTES
        </div>
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-30">
          DESPUÉS
        </div>

        {/* Línea divisoria */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Handle del slider */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-300 cursor-ew-resize flex items-center justify-center"
            onMouseDown={handleMouseDown}
          >
            <div className="flex space-x-0.5">
              <div className="w-0.5 h-4 bg-gray-400"></div>
              <div className="w-0.5 h-4 bg-gray-400"></div>
            </div>
          </div>
        </div>

        {/* Overlay para capturar eventos de mouse */}
        <div 
          className="absolute inset-0 z-20"
          onMouseDown={handleMouseDown}
        ></div>
      </div>

      {/* Indicadores de porcentaje */}
      <div className="flex justify-between mt-4 text-sm text-gray-500">
        <span>Original</span>
        <span className="font-medium">{Math.round(sliderPosition)}% - {Math.round(100 - sliderPosition)}%</span>
        <span>Procesado</span>
      </div>

      {/* Instrucciones */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-500">
          💡 Arrastra el control deslizante para comparar las imágenes
        </p>
      </div>
    </div>
  );
}

export default BeforeAfter;
