import React from 'react';
import ProjectInfo from '../ProjectInfo';
import MainSection from '../MainSection';
import SecuritySection from '../SecuritySection';
import FAQ from '../FAQ';
import Footer from '../Footer';

export default function FrontStepPage({ frontFile, onFrontFileSelect, onClearFrontFile }) {
  return (
    <>
      <ProjectInfo />
      
      {/* Paso 1: Seleccionar parte delantera (móvil) */}
      <section className="py-16 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              📄 Paso 1 de 2: Parte Delantera
            </h2>
            <p className="text-gray-600">
              Selecciona o toma una foto de la <strong>parte delantera</strong> de tu DNI
            </p>
          </div>
          
          <MainSection
            key="front-section-mobile"
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
      </section>

      <SecuritySection />
      <FAQ />
      <Footer />
    </>
  );
}