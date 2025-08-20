// src/components/DataSelectionModal.jsx
import React, { useState } from 'react';

function DataSelectionModal({ isOpen, onClose, onApply, imageUrl }) {
  const [checkedItems, setCheckedItems] = useState({
    nombre: true,
    apellidos: true,
    dni: true,
    fechaNacimiento: true,
    lugarNacimiento: true,
    sexo: true,
    nacionalidad: true,
    fechaExpedicion: true,
    fechaCaducidad: true,
    equipo: true,
    numeroSoporte: true,
  });

  const handleCheckboxChange = (field) => {
    setCheckedItems(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleApply = () => {
    onApply(checkedItems);
    
    // Descargar la imagen
    handleDownloadImage();
    
    onClose();
  };

  const handleDownloadImage = () => {
    try {
      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `dni-editado-${Date.now()}.jpg`;
      
      // Simular clic para iniciar descarga
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mostrar mensaje de confirmación
      alert('✅ ¡DNI descargado exitosamente!\n\nTu DNI editado se ha guardado en tu dispositivo.');
      
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('❌ Error al descargar el archivo.\n\nPor favor, inténtalo de nuevo.');
    }
  };

  const dataFields = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'dni', label: 'DNI' },
    { key: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
    { key: 'lugarNacimiento', label: 'Lugar de Nacimiento' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'nacionalidad', label: 'Nacionalidad' },
    { key: 'fechaExpedicion', label: 'Fecha de Expedición' },
    { key: 'fechaCaducidad', label: 'Fecha de Caducidad' },
    { key: 'equipo', label: 'Equipo' },
    { key: 'numeroSoporte', label: 'Número de Soporte' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Layout responsivo: vertical en móvil, horizontal en desktop */}
        <div className="flex flex-col lg:flex-row">
          {/* Sección de imagen - arriba en móvil, izquierda en desktop */}
          <div className="w-full lg:flex-1 p-4 md:p-6 bg-gray-50 lg:bg-gray-50">
            <div className="lg:sticky lg:top-0">
              <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm">
                <img 
                  src={imageUrl} 
                  alt="Previsualización del DNI" 
                  className="w-full h-auto object-contain rounded-lg max-h-48 md:max-h-64 lg:max-h-none mx-auto" 
                />
              </div>
            </div>
          </div>

          {/* Sección de controles - debajo en móvil, derecha en desktop */}
          <div className="w-full lg:flex-1 p-4 md:p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-1 md:mb-2">
                  Personaliza tu protección
                </h3>
                <p className="text-sm md:text-base text-gray-600">
                  Selecciona qué datos quieres mantener visibles en tu DNI
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl md:text-2xl font-bold ml-2 md:ml-4 flex-shrink-0"
              >
                ×
              </button>
            </div>
            
            {/* Grid de checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
              {dataFields.map((field) => (
                <label 
                  key={field.key}
                  className={`
                    group flex items-center cursor-pointer p-3 md:p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02]
                    ${checkedItems[field.key] 
                      ? 'border-primary-400 bg-gradient-to-r from-primary-50 to-secondary-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Checkbox personalizado */}
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={checkedItems[field.key]}
                      onChange={() => handleCheckboxChange(field.key)}
                      className="sr-only"
                    />
                    <div className={`
                      w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                      ${checkedItems[field.key] 
                        ? 'border-primary-500 bg-primary-500 shadow-lg' 
                        : 'border-gray-300 bg-white group-hover:border-primary-400'
                      }
                    `}>
                      {checkedItems[field.key] && (
                        <i className="bi bi-check text-white text-sm md:text-base"></i>
                      )}
                    </div>
                  </div>
                  
                  {/* Texto del campo */}
                  <span className={`
                    ml-3 md:ml-4 font-medium transition-colors duration-300 text-sm md:text-base
                    ${checkedItems[field.key] ? 'text-primary-800' : 'text-gray-700 group-hover:text-primary-600'}
                  `}>
                    {field.label}
                  </span>
                </label>
              ))}
            </div>
            
            {/* Botones de marcar/desmarcar */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4 md:mb-6">
              <button
                onClick={() => setCheckedItems(Object.fromEntries(dataFields.map(field => [field.key, true])))}
                className="flex-1 px-3 md:px-4 py-2 md:py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
              >
                <i className="bi bi-check-all"></i>
                <span>Marcar todos</span>
              </button>
              <button
                onClick={() => setCheckedItems(Object.fromEntries(dataFields.map(field => [field.key, false])))}
                className="flex-1 px-3 md:px-4 py-2 md:py-2 bg-white text-gray-700 font-semibold border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
              >
                <i className="bi bi-x-lg"></i>
                <span>Desmarcar todos</span>
              </button>
            </div>

            {/* Botón final */}
            <button
              onClick={handleApply}
              className="w-full px-4 md:px-6 py-3 md:py-4 bg-secondary-600 text-white font-bold rounded-xl text-base md:text-lg hover:bg-secondary-700 transition-colors shadow-lg"
            >
              Descargar DNI Editado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataSelectionModal;
