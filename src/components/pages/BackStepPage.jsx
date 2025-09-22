import React from 'react';
import ProjectInfo from '../ProjectInfo';
import MainSection from '../MainSection';
import SecuritySection from '../SecuritySection';
import FAQ from '../FAQ';
import Footer from '../Footer';

export default function BackStepPage({ 
  backFile, 
  onBackFileSelect, 
  onClearBackFile, 
  onGoToFront 
}) {
  return (
    <>
      <div className="py-8 bg-primary-50">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
              <i className="bi bi-check"></i>
            </div>
            <span className="text-green-700 font-medium">Parte delantera cargada correctamente</span>
          </div>
        </div>
      </div>

      {/* Paso 2: Seleccionar parte trasera (móvil) */}
      <section className="py-16 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              📄 Paso 2 de 2: Parte Trasera
            </h2>
            <p className="text-gray-600">
              Ahora selecciona o toma una foto de la <strong>parte trasera</strong> de tu DNI
            </p>
          </div>
          
          <MainSection
            key="back-section-mobile"
            selectedFile={backFile}
            onFileSelect={onBackFileSelect}
            onClearImage={onClearBackFile}
            stepInfo={{
              current: 2,
              total: 2,
              side: 'trasera'
            }}
          />

          {/* Botón para volver a la parte delantera */}
          <div className="mt-6 text-center">
            <button
              onClick={onGoToFront}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <i className="bi bi-arrow-left mr-2"></i>
              Cambiar foto delantera
            </button>
          </div>
        </div>
      </section>

      <SecuritySection />
      <FAQ />
      <Footer />
    </>
  );
}