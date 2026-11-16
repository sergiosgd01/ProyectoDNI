import React from 'react';
import ProjectInfo from '../ProjectInfo';
import BeforeAfter from '../BeforeAfter';
import StepsSection from '../StepsSection';
import SecuritySection from '../SecuritySection';
import FAQ from '../FAQ';
import Footer from '../Footer';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export default function HomePage({ onStartProcess }) {
  // Scroll inicial al principio de la página
  useScrollToTop();

  return (
    <div className="pt-16"> {/* Compensar el header fixed */}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Texto y CTAs */}
            <div className="text-center lg:text-left animate-slide-up">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-800 font-medium text-sm mb-6">
                <i className="bi bi-shield-check mr-2"></i>
                Tus fotos no se guardan
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
                Protege tu DNI <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-500 to-primary-400">
                  antes de compartirlo
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                Censura los datos que no quieras compartir y añade una marca de agua antes de enviar tu DNI. La foto solo pasa por nuestro servidor para recortarla y no se guarda.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {/* Abre la subida directamente, sin pasar por los tres pasos de más abajo */}
                <button
                  onClick={onStartProcess}
                  className="btn btn-principal px-8 shadow-lg"
                >
                  Procesar mi DNI ahora
                  <i className="bi bi-arrow-right text-lg"></i>
                </button>
              </div>
            </div>

            {/* Visual / Before After integrado */}
            <div id="how-it-works" className="relative lg:ml-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {/* Decoraciones abstractas detrás */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary-200/40 to-secondary-200/40 blur-3xl rounded-full -z-10"></div>

              <div className="bg-white p-2 sm:p-4 rounded-2xl shadow-2xl border border-gray-100 relative z-10">
                <div className="absolute -top-4 -right-4 bg-secondary-600 text-white font-bold px-4 py-1 rounded-full text-sm shadow-lg transform rotate-3">
                  Pruébalo interactivo
                </div>
                {/* Contenedor adaptado para BeforeAfter */}
                <div className="rounded-xl overflow-hidden [&>div]:max-w-none [&>div]:mx-0 [&_h2]:hidden [&>div>p]:hidden [&>div>div:first-of-type]:mb-0 [&>div>div:last-of-type]:hidden">
                  <BeforeAfter
                    originalImage="/dni-blanco-negro.png"
                    processedImage="/dni.png"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <StepsSection onStartProcess={onStartProcess} />

      <div id="security-section">
        <SecuritySection onStartProcess={onStartProcess} />
      </div>

      <div id="faq-section">
        <FAQ />
      </div>

      <Footer />
    </div>
  );
}