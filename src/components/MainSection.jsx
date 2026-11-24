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

          {/* Confirmación en una línea, en verde porque todo ha ido bien. Antes eran tres líneas que decían lo mismo con
              otras palabras, y la de la parte delantera hablaba de cargar la trasera aunque ya estuviera (UX-12) */}
          <div className="bg-success-50 border border-success-200 rounded-lg px-4 py-3 text-success-800 text-sm flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
            <span className="flex items-center font-semibold">
              <i className="bi bi-check-circle-fill mr-2 text-base" aria-hidden="true"></i>
              Parte {stepInfo?.side || ''} lista
            </span>
            {stepInfo && (
              <span className="bg-success-700 text-white px-2.5 py-0.5 rounded-full text-xs font-medium">
                {stepInfo.current}/{stepInfo.total}
              </span>
            )}

            {/* Botón para continuar manualmente */}
            {onContinue && (
              <button
                onClick={onContinue}
                className="btn btn-sm btn-principal w-full sm:w-auto"
              >
                <i className="bi bi-arrow-right"></i>
                {stepInfo?.current === 1 ? 'Continuar con parte trasera' : 'Ir al editor'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainSection;
