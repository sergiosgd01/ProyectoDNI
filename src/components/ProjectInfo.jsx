// src/components/ProjectInfo.jsx
import React from 'react';

function ProjectInfo() {
  return (
    <section className="bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border border-primary-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {/* Contenido principal */}
            <div>
              <h4 className="font-bold text-lg text-primary-900 mb-2">Financiado por Next Generation EU</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Esta iniciativa se realiza en el marco de los fondos del Plan de Recuperación, Transformación y Resiliencia, financiados por la Unión Europea (Next Generation) en el marco del proyecto con referencia C108/23 "Detección de Falsificación de Documentos de Identidad mediante Técnicas de Visión por Computador e Inteligencia Artificial".
              </p>
            </div>
            
            {/* Logo INCIBE debajo */}
            <div className="pt-2">
              <img 
                src="/footer_incibe.jpg" 
                alt="Logo INCIBE" 
                className="h-12 w-auto opacity-90"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProjectInfo;
