import React, { useState, useEffect } from 'react';
import ProfileSelector from './ProfileSelector';
import { DNI_PROFILES, getProfileById, getFieldsCount } from '../constants/dniProfiles';
import { useColors } from '../theme/useColors';
import { useScrollToTop } from '../hooks/useScrollToTop';

export default function DNIEditor({ frontFile, backFile, onBack }) {
  const colors = useColors();
  
  // Scroll inicial al principio de la página
  useScrollToTop();
  
  // Datos mock que simularían lo que extraería el OCR
  const mockExtractedData = {
    nombre: 'JUAN CARLOS',
    apellidos: 'GARCÍA LÓPEZ',
    dni: '12345678A',
    fechaNacimiento: '01/01/1990',
    sexo: 'M',
    nacionalidad: 'ESP',
    fechaExpedicion: '01/01/2020',
    fechaCaducidad: '01/01/2030',
    equipoExpedidor: 'MADRID',
    numeroSoporte: 'MAD123456789'
  };

  const [selectedProfile, setSelectedProfile] = useState('hotel');
  const [selectedFields, setSelectedFields] = useState(
    DNI_PROFILES.HOTEL.fields
  );

  const selectedCount = getFieldsCount(selectedFields);
  const totalFields = Object.keys(mockExtractedData).length;

  // Actualizar campos cuando se selecciona un perfil
  const handleProfileSelect = (profileId) => {
    const profile = getProfileById(profileId);
    if (profile) {
      setSelectedProfile(profileId);
      setSelectedFields(profile.fields);
    }
  };

  const handleFieldToggle = (fieldName) => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
    // Resetear perfil seleccionado ya que es personalizado
    setSelectedProfile(null);
  };

  const handleSelectAll = () => {
    setSelectedFields(Object.keys(mockExtractedData).reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {}));
    setSelectedProfile('complete');
  };

  const handleDeselectAll = () => {
    setSelectedFields(Object.keys(mockExtractedData).reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {}));
    setSelectedProfile(null);
  };

  const handleProcessDNI = async () => {
    try {
      // Aquí llamarás a tu WebAssembly
      console.log('Procesando DNI con configuración:', selectedFields);
      console.log('Foto delantera:', frontFile);
      console.log('Foto trasera:', backFile);
      
      // TODO: Implementar llamada al WebAssembly
      // const processedImages = await processWithWebAssembly(frontFile, backFile, selectedFields);
      
    } catch (error) {
      console.error('Error procesando DNI:', error);
    }
  };

  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header - más compacto en móvil */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
            ✏️ Configurar DNI
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-4xl mx-auto leading-tight">
            Elige un perfil predefinido o personaliza qué campos mostrar
          </p>
        </div>

        {/* Layout responsive: stack en móvil, lado a lado en desktop */}
        <div className="max-w-none mx-auto space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-stretch">
          {/* Vista previa - En móvil aparece primero */}
          <div className="order-2 lg:order-1 bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col">
            <div className="flex items-center mb-4 flex-shrink-0">
              <i className="bi bi-eye text-gray-600 text-lg sm:text-xl mr-2"></i>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Vista previa</h3>
            </div>
            
            {/* Frente del DNI */}
            <div className="mb-4 flex-shrink-0">
              <div className="bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium px-2 py-1 rounded mb-2 inline-block">
                DELANTE
              </div>
              <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                <img
                  src={URL.createObjectURL(frontFile)}
                  alt="DNI delante"
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>
            </div>

            {/* Detrás del DNI */}
            {backFile && (
              <div className="mb-4 flex-shrink-0">
                <div className="bg-green-100 text-green-800 text-xs sm:text-sm font-medium px-2 py-1 rounded mb-2 inline-block">
                  DETRÁS
                </div>
                <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                  <img
                    src={URL.createObjectURL(backFile)}
                    alt="DNI detrás"
                    className="w-full h-auto rounded-lg shadow-md"
                  />
                </div>
              </div>
            )}

            {/* Información del perfil seleccionado - se expande para llenar el espacio restante */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex-1 flex flex-col justify-center">
              <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Configuración actual</h4>
              <div className="space-y-1 text-xs sm:text-sm text-blue-700">
                <div>
                  <strong>Perfil:</strong> {
                    selectedProfile 
                      ? getProfileById(selectedProfile)?.name 
                      : 'Personalizado'
                  }
                </div>
                <div><strong>Campos seleccionados:</strong> {selectedCount} de {totalFields}</div>
                <div><strong>Estado:</strong> <span className="text-green-600">Listo para descargar</span></div>
              </div>
            </div>
          </div>

          {/* Configuración - En móvil aparece segundo */}
          <div className="order-1 lg:order-2 bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col">
            <div className="flex items-center mb-4 flex-shrink-0">
              <i className="bi bi-sliders text-gray-600 text-lg sm:text-xl mr-2"></i>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Configuración</h3>
            </div>

            {/* Selector de perfiles */}
            <div className="flex-shrink-0">
              <ProfileSelector
                selectedProfile={selectedProfile}
                onProfileSelect={handleProfileSelect}
                selectedFields={selectedFields}
              />
            </div>

            {/* Indicador de campos extraídos */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex-shrink-0">
              <div className="flex items-center text-green-800 text-xs sm:text-sm">
                <i className="bi bi-check-circle-fill mr-2"></i>
                {totalFields} campos disponibles para configuración
              </div>
            </div>

            {/* Lista de campos con checkboxes - se expande para usar el espacio disponible */}
            <div className="mb-4 flex-1 flex flex-col">
              <h4 className="font-medium text-gray-700 mb-3 text-sm sm:text-base flex-shrink-0">Campos individuales</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 content-start">
                {Object.entries(mockExtractedData).map(([fieldName, value]) => (
                  <div key={fieldName} className="border border-gray-200 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors h-fit">
                    <label className="flex items-start cursor-pointer">
                      <div className="relative flex items-center justify-center mt-1">
                        <input
                          type="checkbox"
                          checked={selectedFields[fieldName]}
                          onChange={() => handleFieldToggle(fieldName)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                           selectedFields[fieldName] ? 'shadow-md' : ''
                         }`}
                             style={{
                               backgroundColor: selectedFields[fieldName] ? colors.primary : 'white',
                               borderColor: selectedFields[fieldName] ? colors.primary : colors.border.default
                             }}
                             onMouseEnter={(e) => {
                               if (!selectedFields[fieldName]) {
                                 e.target.style.borderColor = colors.primary;
                               }
                             }}
                             onMouseLeave={(e) => {
                               if (!selectedFields[fieldName]) {
                                 e.target.style.borderColor = colors.border.default;
                               }
                             }}
                        >
                          {selectedFields[fieldName] && (
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">
                          {formatFieldName(fieldName)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          {value}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="mb-4 sm:mb-6 flex-shrink-0">
              <h4 className="font-medium text-gray-700 mb-3 text-sm sm:text-base">Acciones rápidas</h4>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-2 py-1 sm:px-3 sm:py-2 bg-blue-100 text-blue-700 text-xs sm:text-sm rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Todos
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-2 py-1 sm:px-3 sm:py-2 bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Ninguno
                </button>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex-shrink-0">
              <button
                onClick={handleProcessDNI}  // Nueva función
                className="w-full bg-blue-600 text-white py-4 px-8 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <i className="bi bi-gear-fill text-xl mr-3"></i>
                Procesar DNI
              </button>

              <div className="text-center text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                {selectedProfile 
                  ? `Configuración: ${getProfileById(selectedProfile)?.name}`
                  : 'Configuración personalizada'
                }
              </div>

              {/* Botón de regreso */}
              <button
                onClick={onBack}
                className="w-full inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 bg-gray-600 text-white font-semibold text-sm sm:text-base rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                <i className="bi bi-arrow-left mr-1 sm:mr-2 text-sm sm:text-base"></i>
                Cambiar fotos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}