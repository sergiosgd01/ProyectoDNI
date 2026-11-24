import React from 'react';
import FileUploadZone from './FileUploadZone';
import { useUrlDeArchivo } from '../hooks/useUrlDeArchivo';

// onHacerFoto abre la cámara de la página de subida en esta cara (ver UploadPage)
const MainSection = ({
  selectedFile,
  onFileSelect,
  onClearImage,
  onHacerFoto,
  stepInfo,
  onContinue
}) => {
  const urlFoto = useUrlDeArchivo(selectedFile);
  return (
    <div className="w-full">
      {!selectedFile ? (
        <FileUploadZone onFileSelect={onFileSelect} onHacerFoto={onHacerFoto} />
      ) : (
        <div className="space-y-4">
          {/* Vista previa de la imagen */}
          <div className="w-full bg-gray-50 rounded-lg overflow-hidden border-2 border-primary-200">
            <div className="relative">
              <img 
                src={urlFoto ?? undefined}
                alt="Previsualización del DNI" 
                className="w-full h-64 object-contain bg-white" 
              />
              
              {/* Botón para eliminar imagen */}
              <button
                onClick={onClearImage}
                className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center bg-gray-800 bg-opacity-70 hover:bg-opacity-90 shadow-lg rounded-full transition-colors duration-200"
                title="Eliminar imagen"
              >
                <i className="bi bi-x-lg text-white"></i>
              </button>
            </div>
          </div>

          {/* Información de confirmación, en verde porque todo ha ido bien */}
          <div className="bg-success-50 border border-success-200 rounded-lg p-4">
            <div className="flex items-center justify-center text-success-800 mb-3">
              <i className="bi bi-check-circle-fill mr-2 text-lg"></i>
              <span className="font-semibold">
                ¡Parte {stepInfo?.side || ''} seleccionada!
              </span>
            </div>
            
            <p className="text-success-800 text-sm text-center mb-3">
              {stepInfo?.current === 1 ? 
                'Perfecto. Ahora procederemos a cargar la parte trasera de tu DNI.' :
                'Excelente. Tienes ambas partes cargadas. Procederás al editor para seleccionar los campos.'
              }
            </p>
            
            {stepInfo && (
              <div className="flex items-center justify-center">
                <span className="bg-success-700 text-white px-3 py-1 rounded-full text-xs font-medium mr-2">
                  {stepInfo.current}/{stepInfo.total}
                </span>
                <span className="text-success-800 text-sm">
                  {stepInfo.current === 1 ? 'Continuarás con la parte trasera' : 'Listo para el editor'}
                </span>
              </div>
            )}

            {/* Botón para continuar manualmente */}
            {onContinue && (
              <div className="mt-4 text-center">
                <button
                  onClick={onContinue}
                  className="btn btn-sm btn-principal"
                >
                  <i className="bi bi-arrow-right"></i>
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
