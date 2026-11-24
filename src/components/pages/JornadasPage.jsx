import React from 'react';
import Footer from '../Footer';
import { useScrollToTop } from '../../hooks/useScrollToTop';

// Cartel de unas jornadas. Lleva la cabecera de la web (App.jsx), «Volver al inicio» y el pie, como el aviso legal y la
// privacidad. Antes solo tenía el cartel, sin forma de volver a la web (UX-14, punto 15)
export default function JornadasPage({ imageSrc, onGoHome }) {
  useScrollToTop();

  // pt-16 deja sitio a la cabecera de la web, que va fija arriba
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50 to-white pt-16">
      <main className="flex-grow p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-lg lg:max-w-2xl mx-auto">
          {onGoHome && (
            <button onClick={onGoHome} className="btn btn-sm btn-secundario mb-6">
              <i className="bi bi-arrow-left"></i>
              Volver al inicio
            </button>
          )}
          <div className="text-center flex justify-center items-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <img
              src={imageSrc}
              alt="Jornadas"
              className="max-w-full max-h-[90vh] mx-auto rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
