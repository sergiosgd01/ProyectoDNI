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

      {/* Cabecera de la portada */}
      <section className="bg-white border-b border-gray-100 pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight text-gray-900">
              {/* En dos líneas desde 640 px. A partir de 1280 px la letra crece porque la columna ya cabe */}
              Protege tu DNI <br className="hidden sm:block" />
              <span className="bg-[linear-gradient(transparent_64%,#fde68a_64%,#fde68a_92%,transparent_92%)] [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                antes de compartirlo
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg sm:text-xl leading-relaxed text-gray-600 text-pretty">
              Tapa los datos que no quieras enseñar y añade una marca de agua antes de enviar tu DNI. La foto solo pasa por nuestro servidor para recortarla y no se guarda.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              {/* Abre la subida directamente, sin pasar por los tres pasos de más abajo */}
              <button type="button" onClick={onStartProcess} className="btn btn-principal w-full sm:w-auto px-7 shadow-sm">
                <i className="bi bi-upload text-lg" aria-hidden="true"></i>
                Subir mi DNI
              </button>
              <span className="text-center sm:text-left text-sm text-gray-500">Gratis y sin registro</span>
            </div>
          </div>

          <figure id="how-it-works">
            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-2 sm:p-3">
              <BeforeAfter original="/dni.png" protegida="/dni-blanco-negro.png" />
            </div>
            <figcaption className="mt-3 text-sm text-gray-500">
              Desliza la línea para comparar la foto original con la copia protegida.
            </figcaption>
          </figure>
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