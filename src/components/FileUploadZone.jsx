// src/components/FileUploadZone.jsx
import React, { useState } from 'react';
import CameraCapture from './CameraCapture';

function FileUploadZone({ onFileSelect }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleDragOver = (event) => {
    event.preventDefault(); // Necesario para permitir el 'drop'
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    } else {
      alert('Por favor, suelta un archivo de imagen válido.');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    } else {
      alert('Por favor, selecciona un archivo de imagen válido.');
    }
  };

  const handleCameraCapture = (file) => {
    onFileSelect(file);
    setShowCamera(false);
  };

  return (
    <>
      <div
      className={`
        w-full flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-2xl
        transition-all duration-300 ease-in-out cursor-pointer group min-h-[400px]
        ${isDragOver 
          ? 'border-primary-400 bg-gradient-to-br from-primary-50 to-secondary-100 scale-[1.02] shadow-xl' 
          : 'border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-primary-300 hover:shadow-lg hover:bg-gradient-to-br hover:from-primary-50 hover:to-secondary-50'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileInput').click()}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      
      {/* Icono mejorado */}
      <div className={`
        p-4 rounded-full mb-6 transition-all duration-300
        ${isDragOver 
          ? 'bg-primary-500 scale-110' 
          : 'bg-gradient-to-br from-primary-500 to-secondary-600 group-hover:scale-105 group-hover:shadow-lg'
        }
      `}>
        <i className="bi bi-cloud-arrow-up text-white text-5xl"></i>
      </div>
      
      {/* Texto principal */}
      <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${
        isDragOver ? 'text-primary-700' : 'text-gray-800 group-hover:text-primary-600'
      }`}>
        {isDragOver ? '¡Suelta tu imagen aquí!' : 'Arrastra tu DNI aquí'}
      </h3>
      
      {/* Texto secundario */}
      <p className={`text-lg font-medium mb-6 transition-colors duration-300 ${
        isDragOver ? 'text-primary-600' : 'text-gray-600 group-hover:text-primary-500'
      }`}>
        o elige una de estas opciones
      </p>
      
      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Botón de archivo */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            document.getElementById('fileInput').click();
          }}
          className={`
            px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform flex items-center justify-center space-x-2
            ${isDragOver 
              ? 'bg-primary-600 text-white shadow-lg scale-105' 
              : 'bg-white text-primary-600 border-2 border-primary-600 hover:bg-primary-600 hover:text-white hover:scale-105 hover:shadow-lg'
            }
          `}
        >
          <i className="bi bi-folder text-lg"></i>
          <span>Seleccionar Archivo</span>
        </button>

        {/* Botón de cámara */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowCamera(true);
          }}
          className={`
            px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform flex items-center justify-center space-x-2
            ${isDragOver 
              ? 'bg-secondary-600 text-white shadow-lg scale-105' 
              : 'bg-white text-secondary-600 border-2 border-secondary-600 hover:bg-secondary-600 hover:text-white hover:scale-105 hover:shadow-lg'
            }
          `}
        >
          <i className="bi bi-camera text-lg"></i>
          <span>Usar Cámara</span>
        </button>
      </div>
      
      {/* Información adicional */}
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
          Cámara compatible
        </div>
      </div>
    </div>

    {/* Modal de cámara */}
    {showCamera && (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    )}
  </>
);
}

export default FileUploadZone;