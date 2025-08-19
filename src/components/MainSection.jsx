// src/components/MainSection.jsx
import React from 'react';
import FileUploadZone from './FileUploadZone';

const MainSection = ({
  selectedFile,
  previewUrl,
  croppedImageUrl,
  onFileSelect,
  onRecropImage,
  onClearImage,
  onOpenDataModal
}) => {
  return (
    <section className="py-16 flex flex-col items-center justify-center p-4">
      <div className={`w-full bg-white rounded-lg shadow-xl p-8 transition-all duration-500 ease-in-out ${
        selectedFile ? 'max-w-6xl' : 'max-w-2xl'
      }`}>
        <div className={`flex flex-col gap-8 transition-all duration-500 ease-in-out ${
          selectedFile ? 'md:flex-row' : ''
        }`}>
          {/* Zona de carga y Previsualización */}
          <div className={`flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${
            selectedFile ? 'flex-1' : 'w-full'
          }`}>
            {!selectedFile ? (
              <FileUploadZone onFileSelect={onFileSelect} />
            ) : (
              <div className="w-full h-80 flex items-center justify-center border border-gray-300 rounded-lg overflow-hidden relative">
                <img 
                  src={croppedImageUrl || previewUrl} 
                  alt="Previsualización del DNI" 
                  className="max-w-full max-h-full object-contain" 
                />
                
                {/* Botones de acción sobre la imagen */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {croppedImageUrl && (
                    <button
                      onClick={onRecropImage}
                      className="bg-primary-600 bg-opacity-80 hover:bg-opacity-100 text-white px-3 py-1 rounded-lg text-sm transition-all duration-200"
                      title="Recortar de nuevo"
                    >
                      <i className="bi bi-scissors"></i> Recortar
                    </button>
                  )}
                  <button
                    onClick={onClearImage}
                    className="bg-gray-800 bg-opacity-70 hover:bg-opacity-90 shadow-lg rounded-full p-2 transition-all duration-200 hover:scale-110"
                    title="Eliminar imagen"
                  >
                    <i className="bi bi-x-lg text-white"></i>
                  </button>
                </div>
                
                {!croppedImageUrl && (
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
                    <button
                      onClick={onRecropImage}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <i className="bi bi-scissors"></i> Recortar DNI
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lado derecho: Botones de acción (solo aparece cuando hay imagen recortada) */}
          {selectedFile && croppedImageUrl && (
            <div className="flex-1 flex flex-col justify-center items-center border-l-0 md:border-l border-gray-200 pl-0 md:pl-8 transform transition-all duration-500 ease-in-out">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-4">¡DNI listo para personalizar!</h3>
                <p className="text-gray-600 mb-6">Tu imagen está recortada. Ahora configura qué datos quieres mostrar.</p>
                
                <button 
                  onClick={onOpenDataModal}
                  className="px-8 py-4 bg-secondary-600 hover:bg-secondary-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] text-lg"
                >
                  <i className="bi bi-shield-check"></i> Configurar Protección
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MainSection;
