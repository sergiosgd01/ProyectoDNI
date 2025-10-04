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

  // Eventos táctiles para móviles
  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
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
        className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden shadow-xl cursor-ew-resize touch-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
        <div className="absolute top-4 left-4 bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-30">
          ANTES
        </div>
        <div className="absolute top-4 right-4 bg-secondary-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-30">
          DESPUÉS
        </div>

        {/* Línea divisoria */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Handle del slider */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-300 cursor-ew-resize flex items-center justify-center touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <i className="bi bi-arrows-expand-vertical text-gray-400 text-sm"></i>
          </div>
        </div>

        {/* Overlay para capturar eventos de mouse y touch */}
        <div 
          className="absolute inset-0 z-20 touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
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
          <i className="bi bi-lightbulb text-gray-500 mr-1"></i>
          Arrastra el control deslizante para comparar las imágenes
        </p>
      </div>
    </div>
  );
}

export default BeforeAfter;
