// src/components/FileUploadZone.jsx
import React, { useState } from 'react';

function FileUploadZone({ onFileSelect }) {
  const [isDragOver, setIsDragOver] = useState(false);

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

  return (
    <div
      className={`
        w-full flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-2xl
        transition-all duration-300 ease-in-out cursor-pointer group min-h-[400px]
        ${isDragOver 
          ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-100 scale-[1.02] shadow-xl' 
          : 'border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-blue-300 hover:shadow-lg hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50'
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
          ? 'bg-blue-500 scale-110' 
          : 'bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-105 group-hover:shadow-lg'
        }
      `}>
        <img
          src="/upload-icon.svg"
          alt="Subir archivo"
          className="w-12 h-12 filter brightness-0 invert"
        />
      </div>
      
      {/* Texto principal */}
      <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${
        isDragOver ? 'text-blue-700' : 'text-gray-800 group-hover:text-blue-600'
      }`}>
        {isDragOver ? '¡Suelta tu imagen aquí!' : 'Arrastra tu DNI aquí'}
      </h3>
      
      {/* Texto secundario */}
      <p className={`text-lg font-medium mb-4 transition-colors duration-300 ${
        isDragOver ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-500'
      }`}>
        o haz clic para seleccionar un archivo
      </p>
      
      {/* Información adicional */}
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        <div className="flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Formatos: JPG, PNG, WEBP
        </div>
        <div className="flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Máximo 10MB
        </div>
      </div>
      
      {/* Botón de acción */}
      <button className={`
        mt-6 px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform
        ${isDragOver 
          ? 'bg-blue-600 text-white shadow-lg scale-105' 
          : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-lg'
        }
      `}>
        Seleccionar Archivo
      </button>
    </div>
  );
}

export default FileUploadZone;