import React from 'react';
import ProjectInfo from '../ProjectInfo';
import MainSection from '../MainSection';
import SecuritySection from '../SecuritySection';
import FAQ from '../FAQ';
import Footer from '../Footer';

export default function UploadPage({ 
  frontFile, 
  backFile, 
  onFrontFileSelect, 
  onBackFileSelect,
  onClearFrontFile,
  onClearBackFile,
  hasAllFiles 
}) {
  return (
    <>
      <ProjectInfo />
      
      {/* Vista combinada: ambos pasos lado a lado */}
      <section className="py-16 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-7xl">
          {/* Header general */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              📄 Subir ambas partes del DNI
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Sube las fotos de la parte delantera y trasera de tu DNI
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${frontFile ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Parte delantera</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${backFile ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Parte trasera</span>
              </div>
            </div>
          </div>

          {/* Grid para pantallas grandes, stack para móviles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Parte Delantera */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Parte Delantera
                </h3>
                <p className="text-gray-600">
                  Sube una foto de la <strong>parte frontal</strong> de tu DNI
                </p>
              </div>
              
              <MainSection
                key="front-section"
                selectedFile={frontFile}
                onFileSelect={onFrontFileSelect}
                onClearImage={onClearFrontFile}
                stepInfo={{
                  current: 1,
                  total: 2,
                  side: 'delantera'
                }}
              />
            </div>

            {/* Parte Trasera */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <span className="text-xl font-bold text-green-600">2</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Parte Trasera
                </h3>
                <p className="text-gray-600">
                  Sube una foto de la <strong>parte posterior</strong> de tu DNI
                </p>
              </div>
              
              <MainSection
                key="back-section"
                selectedFile={backFile}
                onFileSelect={onBackFileSelect}
                onClearImage={onClearBackFile}
                stepInfo={{
                  current: 2,
                  total: 2,
                  side: 'trasera'
                }}
              />
            </div>
          </div>

          {/* Mensaje cuando ambas fotos estén cargadas */}
          {hasAllFiles && (
            <div className="text-center mt-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-center text-green-700 mb-3">
                  <i className="bi bi-check-circle-fill text-2xl mr-3"></i>
                  <span className="text-lg font-bold">¡Ambas partes cargadas correctamente!</span>
                </div>
                <p className="text-green-600 mb-4">
                  Dirigiéndote automáticamente al editor para seleccionar los campos...
                </p>
                
                {/* Indicador de carga */}
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
                  <span className="text-primary-600 font-medium">Procesando...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <SecuritySection />
      <FAQ />
      <Footer />
    </>
  );
}