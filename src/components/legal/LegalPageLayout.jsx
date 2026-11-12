import React from 'react';
import Footer from '../Footer';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export function LegalSection({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function LegalPageLayout({ title, onGoHome, children }) {
  useScrollToTop();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-grow py-8 sm:py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={onGoHome}
            className="group inline-flex items-center mb-6 px-4 py-2 bg-white/60 hover:bg-white border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-600 hover:text-primary-600 rounded-full shadow-sm transition-all duration-200"
          >
            <i className="bi bi-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i>
            Volver al inicio
          </button>

          <article className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10 text-gray-700 leading-relaxed space-y-3">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{title}</h1>
            {children}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
