import React, { useState } from 'react';

export default function DNIEditor({ frontFile, backFile, onBack, onBackToStep }) {
  // Datos mock que simularían lo que extraería el OCR de ambas partes
  const mockExtractedData = {
    // Datos de la parte delantera
    nombre: 'JUAN CARLOS',
    apellidos: 'GARCÍA LÓPEZ',
    dni: '12345678A',
    fechaNacimiento: '01/01/1990',
    sexo: 'M',
    nacionalidad: 'ESP',
    // Datos de la parte trasera
    fechaExpedicion: '01/01/2020',
    fechaCaducidad: '01/01/2030',
    equipoExpedidor: 'MADRID',
    numeroSoporte: 'MAD123456789',
    direccion: 'CALLE EJEMPLO 123, MADRID',
    codigoPostal: '28001'
  };

  const [selectedFields, setSelectedFields] = useState(() => {
    // Por defecto, todos los campos están seleccionados
    const initialFields = {};
    Object.keys(mockExtractedData).forEach(key => {
      initialFields[key] = true;
    });
    return initialFields;
  });

  const handleDownload = () => {
    // Obtener solo los campos seleccionados
    const selectedData = Object.entries(mockExtractedData)
      .filter(([key]) => selectedFields[key])
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    console.log('Descargando DNI con campos seleccionados:', selectedData);
    console.log('Archivos disponibles:', { frontFile, backFile });
    
    // Crear un ZIP con ambas imágenes procesadas (simulado)
    const link = document.createElement('a');
    
    // Por ahora descargamos la imagen frontal (en el futuro procesarás ambas)
    link.href = frontFile instanceof File ? URL.createObjectURL(frontFile) : frontFile;
    link.download = `dni_completo_${Object.values(selectedFields).filter(Boolean).length}_campos.jpg`;
    link.click();
    
    // En el futuro aquí procesarías ambas imágenes con los campos seleccionados
  };

  const handleFieldToggle = (fieldName) => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const formatFieldName = (fieldName) => {
    return fieldName
      .charAt(0).toUpperCase() + 
      fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            ✏️ Editor de DNI
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Selecciona qué campos quieres mostrar en tu DNI editado
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Panel izquierdo - Preview de ambas partes */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <i className="bi bi-eye mr-2"></i>
              Vista previa - DNI completo
            </h3>
            
            {/* Parte delantera */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs mr-2">DELANTE</span>
                Parte delantera del DNI
              </h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <img
                  src={frontFile instanceof File ? URL.createObjectURL(frontFile) : frontFile}
                  alt="DNI parte delantera"
                  className="w-full h-auto rounded-lg shadow-md"
                  style={{ maxHeight: '200px', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Parte trasera */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                <span className="bg-green-500 text-white px-2 py-1 rounded text-xs mr-2">DETRÁS</span>
                Parte trasera del DNI
              </h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <img
                  src={backFile instanceof File ? URL.createObjectURL(backFile) : backFile}
                  alt="DNI parte trasera"
                  className="w-full h-auto rounded-lg shadow-md"
                  style={{ maxHeight: '200px', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Información del archivo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Información de archivos</h4>
              <div className="text-blue-700 text-sm space-y-1">
                <p><strong>Campos disponibles:</strong> {Object.keys(mockExtractedData).length} campos</p>
                <p><strong>Campos seleccionados:</strong> {Object.values(selectedFields).filter(Boolean).length}</p>
                <p><strong>Partes cargadas:</strong> <span className="text-green-600">Delantera + Trasera</span></p>
                <p><strong>Estado:</strong> <span className="text-green-600">Listo para descargar</span></p>
              </div>
            </div>
          </div>

          {/* Panel derecho - Selección de campos */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <i className="bi bi-check2-square mr-2"></i>
              Seleccionar campos a mostrar
            </h3>
            
            {/* Verificación de datos */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
              <div className="flex items-center">
                <i className="bi bi-check-circle text-green-600 mr-2"></i>
                <span className="text-green-800 text-sm font-medium">
                  {Object.keys(mockExtractedData).length} campos disponibles para selección
                </span>
              </div>
            </div>
            
            {/* Lista de campos con checkboxes */}
            <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
              {Object.entries(mockExtractedData).map(([key, value]) => (
                <label key={key} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedFields[key] || false}
                    onChange={() => handleFieldToggle(key)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {formatFieldName(key)}
                    </div>
                    <div className="text-gray-600 text-xs truncate">
                      {value}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Acciones rápidas */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-3 text-sm">Acciones rápidas</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const allSelected = {};
                    Object.keys(mockExtractedData).forEach(key => {
                      allSelected[key] = true;
                    });
                    setSelectedFields(allSelected);
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                >
                  Seleccionar todo
                </button>
                <button
                  onClick={() => {
                    const noneSelected = {};
                    Object.keys(mockExtractedData).forEach(key => {
                      noneSelected[key] = false;
                    });
                    setSelectedFields(noneSelected);
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  Deseleccionar todo
                </button>
              </div>
            </div>

            {/* Botón de descarga */}
            <div className="text-center mb-4">
              <button
                onClick={handleDownload}
                disabled={Object.values(selectedFields).filter(Boolean).length === 0}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-lg"
              >
                <i className="bi bi-download mr-2"></i>
                Descargar DNI ({Object.values(selectedFields).filter(Boolean).length} campos)
              </button>
              <p className="text-gray-600 text-xs mt-2">
                Solo se mostrarán los campos seleccionados
              </p>
            </div>
            
            {/* Botón de regreso */}
            <button
              onClick={onBack}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <i className="bi bi-arrow-left mr-2"></i>
              Volver al inicio
            </button>
          </div>
        </div>

        {/* Información adicional simplificada */}
        <div className="max-w-6xl mx-auto mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
              <i className="bi bi-info-circle mr-2"></i>
              Información importante
            </h4>
            <div className="text-blue-700 text-sm">
              <p className="mb-2">
                <strong>• Campos seleccionados:</strong> Solo los campos marcados aparecerán en el DNI final.
              </p>
              <p className="mb-2">
                <strong>• Descarga:</strong> Se descargará la imagen del DNI con los campos elegidos.
              </p>
              <p>
                <strong>• Personalización:</strong> Puedes cambiar la selección cuantas veces quieras antes de descargar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
