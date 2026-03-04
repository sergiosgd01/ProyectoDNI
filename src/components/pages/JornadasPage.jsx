import React from 'react';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export default function JornadasPage({ imageSrc }) {
  useScrollToTop();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50 to-white">
      <main className="flex-grow flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-lg lg:max-w-2xl text-center flex justify-center items-center h-full animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <img
            src={imageSrc}
            alt="Jornadas"
            className="max-w-full max-h-[90vh] mx-auto rounded-2xl shadow-2xl object-contain"
          />
        </div>
      </main>
    </div>
  );
}
