import React from 'react';
import FileUploadZone from './FileUploadZone';

const MainSection = ({
  selectedFile,
  onFileSelect,
  onClearImage,
  stepInfo,
  onContinue
}) => {
  return (
    <div className="w-full">
      {!selectedFile ? (
        <FileUploadZone onFileSelect={onFileSelect} />
      ) : (
        <div className="space-y-4">
          {/* Vista previa de la imagen */}
          <div className="w-full bg-gray-50 rounded-lg overflow-hidden border-2 border-primary-200">
            <div className="relative">
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Previsualización del DNI" 
                className="w-full h-64 object-contain bg-white" 
              />
              
              {/* Botón para eliminar imagen */}
              <button
                onClick={onClearImage}
                className="absolute top-3 right-3 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 shadow-lg rounded-full p-2 transition-all duration-200 hover:scale-110"
                title="Eliminar imagen"
              >
                <i className="bi bi-x-lg text-white"></i>
              </button>
            </div>
          </div>

          {/* Información de confirmación */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center justify-center text-primary-700 mb-3">
              <i className="bi bi-check-circle-fill mr-2 text-lg"></i>
              <span className="font-semibold">
                ¡Parte {stepInfo?.side || ''} seleccionada!
              </span>
            </div>
            
            <p className="text-primary-600 text-sm text-center mb-3">
              {stepInfo?.current === 1 ? 
                'Perfecto. Ahora procederemos a cargar la parte trasera de tu DNI.' :
                'Excelente. Tienes ambas partes cargadas. Procederás al editor para seleccionar los campos.'
              }
            </p>
            
            {stepInfo && (
              <div className="flex items-center justify-center">
                <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium mr-2">
                  {stepInfo.current}/{stepInfo.total}
                </span>
                <span className="text-primary-600 text-sm">
                  {stepInfo.current === 1 ? 'Continuarás con la parte trasera' : 'Listo para el editor'}
                </span>
              </div>
            )}

            {/* Botón para continuar manualmente */}
            {onContinue && (
              <div className="mt-4 text-center">
                <button
                  onClick={onContinue}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium text-sm rounded-lg hover:bg-primary-700 transition-colors duration-200"
                >
                  <i className="bi bi-arrow-right mr-2"></i>
                  {stepInfo?.current === 1 ? 'Continuar con parte trasera' : 'Ir al editor'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainSection;
