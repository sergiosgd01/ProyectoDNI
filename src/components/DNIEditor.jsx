import React, { useState } from 'react';
import ProfileSelector from './ProfileSelector';
import { DNI_PROFILES, getProfileById, getFieldsCount } from '../constants/dniProfiles';
import { useColors } from '../theme/useColors';
import { useScrollToTop } from '../hooks/useScrollToTop';
import { dniProcessor } from '../services/dniProcessor';

export default function DNIEditor({ frontFile, backFile, onBack, onProcessed }) {
  const colors = useColors();
  
  // Scroll inicial al principio de la página
  useScrollToTop();
  
  // Campos disponibles para configuración front
  const frontfields = [
    'nombre',
    'apellidos', 
    'dni',
    'fechaNacimiento',
    'sexo',
    'nacionalidad',
    'fechaExpedicion',
    'fechaCaducidad',
    'numeroSoporte',
    'can'
  ];

  // Campos disponibles para configuración back
  const backfields = [
    'mrz',
    'domicilio',
    'municipio',
    'provincia',
    'equipoExpedidor'
  ];

  // Combinar todos los campos
  const availableFields = [...frontfields, ...backfields];
  const totalFields = availableFields.length;

  const [selectedProfile, setSelectedProfile] = useState('hotel');
  const [selectedFrontFields, setSelectedFrontFields] = useState({
    nombre: true,
    apellidos: true,
    dni: true,
    fechaNacimiento: true,
    sexo: false,
    nacionalidad: false,
    fechaExpedicion: true,
    fechaCaducidad: true,
    numeroSoporte: false,
    can: false
  });

  const [selectedBackFields, setSelectedBackFields] = useState({
    mrz: true,
    domicilio: true,
    municipio: false,
    provincia: false,
    equipoExpedidor: false
  });
  
  // ESTADOS para integración
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState(null);
  const [processingError, setProcessingError] = useState(null);

  // Calcular campos seleccionados
  const selectedFrontCount = Object.values(selectedFrontFields).filter(Boolean).length;
  const selectedBackCount = Object.values(selectedBackFields).filter(Boolean).length;
  const selectedCount = selectedFrontCount + selectedBackCount;

  // Actualizar campos cuando se selecciona un perfil
  const handleProfileSelect = (profileId) => {
    const profile = getProfileById(profileId);
    if (profile) {
      setSelectedProfile(profileId);
      setSelectedFrontFields(profile.frontFields || profile.fields || {});
      setSelectedBackFields(profile.backFields || {});
    }
  };

  // Update the handleFieldToggle function to handle both front and back fields
  const handleFieldToggle = (fieldName) => {
    if (frontfields.includes(fieldName)) {
      setSelectedFrontFields(prev => ({
        ...prev,
        [fieldName]: !prev[fieldName]
      }));
    } else if (backfields.includes(fieldName)) {
      setSelectedBackFields(prev => ({
        ...prev,
        [fieldName]: !prev[fieldName]
      }));
    }
    // Resetear perfil seleccionado ya que es personalizado
    setSelectedProfile(null);
  };

  // Update handleSelectAll and handleDeselectAll
  const handleSelectAll = () => {
    setSelectedFrontFields(frontfields.reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {}));
    
    setSelectedBackFields(backfields.reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {}));
    
    setSelectedProfile('complete');
  };

  const handleDeselectAll = () => {
    setSelectedFrontFields(frontfields.reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {}));
    
    setSelectedBackFields(backfields.reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {}));
    
    setSelectedProfile(null);
  };


  const handleProcessDNI = async () => {
    try {
      setIsProcessing(true);
      setProcessingError(null);

      console.log('Procesando DNI con configuración front:', selectedFrontFields);
      console.log('Procesando DNI con configuración back:', selectedBackFields);

      // DATOS para el componente externo
      const dniData = {
        frontFile,
        backFile,
        frontFields: selectedFrontFields,
        backFields: selectedBackFields
      };

      // LLAMAR al servicio
      const result = await dniProcessor.processeDNI(dniData);
      
      setProcessedResult(result);
      
      if (onProcessed) {
        onProcessed(result);
      }

    } catch (error) {
      console.error('Error procesando DNI:', error);
      setProcessingError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFieldName = (fieldName) => {
    const fieldNames = {
      nombre: 'Nombre',
      apellidos: 'Apellidos',
      dni: 'DNI',
      fechaNacimiento: 'Fecha de Nacimiento',
      sexo: 'Sexo',
      nacionalidad: 'Nacionalidad',
      fechaExpedicion: 'Fecha de Expedición',
      fechaCaducidad: 'Fecha de Caducidad',
      numeroSoporte: 'Número de Soporte',
      can: 'CAN',
      mrz: 'MRZ',
      domicilio: 'Domicilio',
      municipio: 'Municipio',
      provincia: 'Provincia',
      equipoExpedidor: 'Equipo Expedidor'
    };
    
    return fieldNames[fieldName] || fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  // Obtener el estado del campo (front o back)
  const isFieldSelected = (fieldName) => {
    if (frontfields.includes(fieldName)) {
      return selectedFrontFields[fieldName] || false;
    } else if (backfields.includes(fieldName)) {
      return selectedBackFields[fieldName] || false;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
            ✏️ Configurar DNI
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-4xl mx-auto leading-tight">
            Elige un perfil predefinido o personaliza qué campos mostrar
          </p>
        </div>

        <div className="max-w-none mx-auto space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-stretch">
          
          {/* Vista previa */}
          <div className="order-2 lg:order-1 bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col">
            <div className="flex items-center mb-4 flex-shrink-0">
              <i className="bi bi-eye text-gray-600 text-lg sm:text-xl mr-2"></i>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Vista previa</h3>
              {isProcessing && (
                <div className="ml-auto flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm">Procesando...</span>
                </div>
              )}
            </div>
            
            {/* MOSTRAR resultado procesado si existe */}
            {processedResult ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center text-green-800 text-sm">
                    <i className="bi bi-check-circle-fill mr-2"></i>
                    DNI procesado correctamente
                  </div>
                </div>

                {/* Mostrar imágenes procesadas */}
                <div className="mb-4">
                  <div className="bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium px-2 py-1 rounded mb-2 inline-block">
                    DELANTE - PROCESADO
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                    <img
                      src={processedResult.frontImageUrl}
                      alt="DNI delante procesado"
                      className="w-full h-auto rounded-lg shadow-md"
                    />
                  </div>
                </div>

                {processedResult.backImageUrl && (
                  <div className="mb-4">
                    <div className="bg-green-100 text-green-800 text-xs sm:text-sm font-medium px-2 py-1 rounded mb-2 inline-block">
                      DETRÁS - PROCESADO
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                      <img
                        src={processedResult.backImageUrl}
                        alt="DNI detrás procesado"
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  </div>
                )}

                {/* Botones de descarga */}
                <div className="flex gap-2">
                  <a
                    href={processedResult.frontImageUrl}
                    download="dni-front-processed.jpg"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-center hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <i className="bi bi-download mr-1"></i>
                    Descargar Delante
                  </a>
                  {processedResult.backImageUrl && (
                    <a
                      href={processedResult.backImageUrl}
                      download="dni-back-processed.jpg"
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-center hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <i className="bi bi-download mr-1"></i>
                      Descargar Detrás
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Mostrar imágenes originales */}
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
              </>
            )}

            {/* Mostrar error si existe */}
            {processingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center text-red-800 text-sm">
                  <i className="bi bi-exclamation-triangle-fill mr-2"></i>
                  Error: {processingError}
                </div>
              </div>
            )}

            {/* Información del perfil seleccionado */}
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
                <div>
                  <strong>Estado:</strong> 
                  <span className={processedResult ? "text-green-600" : "text-blue-600"}>
                    {processedResult ? ' Procesado' : ' Listo para procesar'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuración */}
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
                selectedFrontFields={selectedFrontFields}
                selectedBackFields={selectedBackFields}
              />
            </div>

            {/* Indicador de campos extraídos */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex-shrink-0">
              <div className="flex items-center text-green-800 text-xs sm:text-sm">
                <i className="bi bi-check-circle-fill mr-2"></i>
                {totalFields} campos disponibles para configuración
              </div>
            </div>

            {/* Lista de campos con checkboxes */}
            <div className="mb-4 flex-1 flex flex-col">
              <h4 className="font-medium text-gray-700 mb-3 text-sm sm:text-base flex-shrink-0">Campos individuales</h4>
              
              {/* Campos Front */}
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-gray-600 mb-2">ANVERSO (DELANTE)</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {frontfields.map((fieldName) => (
                    <div key={fieldName} className="border border-gray-200 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors h-fit">
                      <label className="flex items-center cursor-pointer">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isFieldSelected(fieldName)}
                            onChange={() => handleFieldToggle(fieldName)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                             isFieldSelected(fieldName) ? 'shadow-md' : ''
                           }`}
                               style={{
                                 backgroundColor: isFieldSelected(fieldName) ? colors.primary : 'white',
                                 borderColor: isFieldSelected(fieldName) ? colors.primary : colors.border.default
                               }}
                               onMouseEnter={(e) => {
                                 if (!isFieldSelected(fieldName)) {
                                   e.target.style.borderColor = colors.primary;
                                 }
                               }}
                               onMouseLeave={(e) => {
                                 if (!isFieldSelected(fieldName)) {
                                   e.target.style.borderColor = colors.border.default;
                                 }
                               }}
                          >
                            {isFieldSelected(fieldName) && (
                              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="ml-3 sm:ml-4 flex-1">
                          <div className="font-medium text-gray-800 text-xs sm:text-sm">
                            {formatFieldName(fieldName)}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campos Back */}
              <div>
                <h5 className="text-xs font-semibold text-gray-600 mb-2">REVERSO (DETRÁS)</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {backfields.map((fieldName) => (
                    <div key={fieldName} className="border border-gray-200 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors h-fit">
                      <label className="flex items-center cursor-pointer">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isFieldSelected(fieldName)}
                            onChange={() => handleFieldToggle(fieldName)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                             isFieldSelected(fieldName) ? 'shadow-md' : ''
                           }`}
                               style={{
                                 backgroundColor: isFieldSelected(fieldName) ? colors.primary : 'white',
                                 borderColor: isFieldSelected(fieldName) ? colors.primary : colors.border.default
                               }}
                               onMouseEnter={(e) => {
                                 if (!isFieldSelected(fieldName)) {
                                   e.target.style.borderColor = colors.primary;
                                 }
                               }}
                               onMouseLeave={(e) => {
                                 if (!isFieldSelected(fieldName)) {
                                   e.target.style.borderColor = colors.border.default;
                                 }
                               }}
                          >
                            {isFieldSelected(fieldName) && (
                              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="ml-3 sm:ml-4 flex-1">
                          <div className="font-medium text-gray-800 text-xs sm:text-sm">
                            {formatFieldName(fieldName)}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
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
              {!processedResult ? (
                <button
                  onClick={handleProcessDNI}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 text-white py-4 px-8 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-gear-fill text-xl mr-3"></i>
                      Procesar DNI
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setProcessedResult(null);
                    setProcessingError(null);
                  }}
                  className="w-full bg-orange-600 text-white py-4 px-8 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
                >
                  <i className="bi bi-arrow-repeat text-xl mr-3"></i>
                  Procesar de nuevo
                </button>
              )}

              <div className="text-center text-xs sm:text-sm text-gray-600 my-3">
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