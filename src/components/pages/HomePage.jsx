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

  const scrollToUpload = () => {
    const section = document.getElementById('upload-section');
    const ctaAnchor = document.getElementById('upload-cta-anchor');

    if (!section) return;

    const headerOffset = 90;
    const sectionTop = section.getBoundingClientRect().top + window.pageYOffset;
    const minTarget = sectionTop - headerOffset;

    // Intentamos dejar el CTA visible en la parte baja de pantalla sin saltarnos el inicio de la seccion.
    let targetPosition = minTarget;

    if (ctaAnchor) {
      const ctaRect = ctaAnchor.getBoundingClientRect();
      const ctaTop = ctaRect.top + window.pageYOffset;
      const ctaBottom = ctaTop + ctaRect.height;
      const bottomMargin = 20;
      targetPosition = ctaBottom - (window.innerHeight - bottomMargin);
    }

    const maxTarget = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const finalTarget = Math.min(maxTarget, Math.max(minTarget, targetPosition));

    window.scrollTo({
      top: finalTarget,
      behavior: 'smooth'
    });
  };

  return (
    <div className="pt-16"> {/* Compensar el header fixed */}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Texto y CTAs */}
            <div className="text-center lg:text-left animate-slide-up">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-700 font-medium text-sm mb-6">
                <i className="bi bi-shield-check mr-2"></i>
                100% Seguro y Privado
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
                Protege tu DNI <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">
                  antes de compartirlo
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                Añade marcas de agua, censura datos sensibles y extrae texto automáticamente. Todo ocurre en tu navegador, sin enviar imágenes a ningún servidor.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={scrollToUpload}
                  className="inline-flex justify-center items-center px-8 py-4 bg-primary-600 text-white font-bold text-lg rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-xl hover:shadow-primary-500/30 hover:-translate-y-1"
                >
                  Procesar mi DNI ahora
                  <i className="bi bi-arrow-right ml-2 text-xl"></i>
                </button>
              </div>
            </div>

            {/* Visual / Before After integrado */}
            <div id="how-it-works" className="relative lg:ml-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {/* Decoraciones abstractas detrás */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary-200/40 to-secondary-200/40 blur-3xl rounded-full -z-10"></div>

              <div className="bg-white p-2 sm:p-4 rounded-2xl shadow-2xl border border-gray-100 relative z-10">
                <div className="absolute -top-4 -right-4 bg-secondary-500 text-white font-bold px-4 py-1 rounded-full text-sm shadow-lg transform rotate-3">
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

      {/* Sección principal de subida */}
      <section id="upload-section" className="py-10 sm:py-14 lg:py-20 bg-white relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative">
            {/* Cabecera decorativa de la tarjeta */}
            <div className="h-2 w-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500"></div>

            <div className="p-5 sm:p-8 lg:p-10 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.09),_transparent_45%)] pointer-events-none"></div>

              <div className="relative">
                <div className="text-center mb-7 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                    Comienza en 3 sencillos pasos
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600">
                    Sube tus imágenes y aplica la protección en segundos
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto mb-8 sm:mb-10">
                  {/* Paso 1 */}
                  <div className="group relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                    <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-t-2xl opacity-90"></div>
                    <div className="flex items-center justify-between mb-5 pt-2">
                      <div className="flex items-center justify-center w-11 h-11 bg-primary-100 rounded-xl">
                        <i className="bi bi-credit-card-2-front text-xl text-primary-600"></i>
                      </div>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold">1</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Sube el frontal</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Captura o sube la parte delantera de tu documento.</p>
                  </div>

                  {/* Paso 2 */}
                  <div className="group relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                    <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-t-2xl opacity-90"></div>
                    <div className="flex items-center justify-between mb-5 pt-2">
                      <div className="flex items-center justify-center w-11 h-11 bg-primary-100 rounded-xl">
                        <i className="bi bi-credit-card-2-back text-xl text-primary-600"></i>
                      </div>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold">2</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Sube el reverso</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Captura o sube la parte trasera para completarlo.</p>
                  </div>

                  {/* Paso 3 */}
                  <div className="group relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                    <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-t-2xl opacity-90"></div>
                    <div className="flex items-center justify-between mb-5 pt-2">
                      <div className="flex items-center justify-center w-11 h-11 bg-primary-100 rounded-xl">
                        <i className="bi bi-shield-lock text-xl text-primary-600"></i>
                      </div>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold">3</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Edita y protege</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Aplica marcas de agua y censura a tu gusto.</p>
                  </div>
                </div>

                <div id="upload-cta-anchor" className="border-t border-gray-200 pt-6 sm:pt-8 text-center">
                <button
                  onClick={onStartProcess}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-7 sm:px-10 py-4 sm:py-5 bg-gray-900 text-white font-bold text-lg sm:text-xl rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-xl hover:-translate-y-1 group"
                >
                    <i className="bi bi-upload mr-3 text-xl sm:text-2xl group-hover:-translate-y-1 transition-transform"></i>
                  Subir mi DNI
                </button>
              </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <div id="security-section">
        <SecuritySection />
      </div>

      <div id="faq-section">
        <FAQ />
      </div>

      <Footer />
    </div>
  );
}