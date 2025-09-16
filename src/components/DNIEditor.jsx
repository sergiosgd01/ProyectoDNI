import React, { useState } from 'react';

export default function DNIEditor({ selectedFile, extractedData, onBack }) {
  const [selectedFields, setSelectedFields] = useState(() => {
    // Por defecto, todos los campos están seleccionados
    const initialFields = {};
    if (extractedData) {
      Object.keys(extractedData).forEach(key => {
        initialFields[key] = true;
      });
    }
    return initialFields;
  });

  const handleDownload = () => {
    // Aquí implementarás la lógica de descarga de la imagen
    console.log('Descargando DNI con campos seleccionados:', selectedFields);
    console.log('Datos disponibles:', extractedData);
    
    // Por ahora simulamos la descarga de la imagen
    // En el futuro aquí procesarás la imagen con los campos seleccionados
    const link = document.createElement('a');
    link.href = selectedFile instanceof File ? URL.createObjectURL(selectedFile) : selectedFile;
    link.download = 'dni_editado.png';
    link.click();
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
            Personaliza los datos de tu DNI antes de descargarlo
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Panel izquierdo - Preview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <i className="bi bi-eye mr-2"></i>
              Vista previa
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <img
                src={selectedFile instanceof File ? URL.createObjectURL(selectedFile) : selectedFile}
                alt="DNI preview"
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>

            {/* Información del archivo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Información del archivo</h4>
              <div className="text-blue-700 text-sm space-y-1">
                <p><strong>Campos extraídos:</strong> {Object.keys(extractedData || {}).length} campos</p>
                <p><strong>Campos seleccionados:</strong> {Object.values(selectedFields).filter(Boolean).length}</p>
                <p><strong>Estado:</strong> Listo para descargar</p>
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
                  {Object.keys(extractedData || {}).length} campos extraídos correctamente
                </span>
              </div>
            </div>
            
            {/* Lista de campos con checkboxes */}
            <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
              {extractedData && Object.entries(extractedData).map(([key, value]) => (
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
                    Object.keys(extractedData || {}).forEach(key => {
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
                    Object.keys(extractedData || {}).forEach(key => {
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
