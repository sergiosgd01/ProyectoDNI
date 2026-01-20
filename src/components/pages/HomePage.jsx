import React from 'react';
import ProjectInfo from '../ProjectInfo';
import BeforeAfter from '../BeforeAfter';
import SecuritySection from '../SecuritySection';
import FAQ from '../FAQ';
import Footer from '../Footer';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export default function HomePage({ onStartProcess }) {
  // Scroll inicial al principio de la página
  useScrollToTop();

  return (
    <>
      <ProjectInfo />
      
      {/* Pantalla inicial - Subir DNI */}
      <section className="py-16 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6">
              <i className="bi bi-credit-card-2-front text-4xl text-primary-600"></i>
            </div>
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Subir DNI
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Digitaliza tu DNI de forma segura y extrae los datos que necesites
            </p>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-primary-800 mb-4">¿Cómo funciona?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-primary-700">
              <div className="flex flex-col items-center">
                <div className="bg-primary-500 text-white rounded-full w-8 h-8 flex items-center justify-center mb-2">1</div>
                <strong>Foto Delantera</strong>
                <span>Sube la parte frontal</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-primary-500 text-white rounded-full w-8 h-8 flex items-center justify-center mb-2">2</div>
                <strong>Foto Trasera</strong>
                <span>Sube la parte posterior</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-primary-500 text-white rounded-full w-8 h-8 flex items-center justify-center mb-2">3</div>
                <strong>Selecciona datos</strong>
                <span>Elige qué campos descargar</span>
              </div>
            </div>
          </div>

          <button
            onClick={onStartProcess}
            className="inline-flex items-center px-8 py-4 bg-primary-600 text-white font-bold text-lg rounded-lg hover:bg-primary-700 transition-colors duration-200 shadow-lg"
          >
            <i className="bi bi-upload mr-3"></i>
            Comenzar proceso
          </button>

          <p className="text-sm text-gray-500 mt-4">
            Proceso 100% seguro - Tus datos no se almacenan en nuestros servidores
          </p>
        </div>
      </section>

      <BeforeAfter 
        originalImage="/dni-blanco-negro.png"
        processedImage="/dni.png"
      />
      <SecuritySection />
      <FAQ />
      <Footer />
    </>
  );
}