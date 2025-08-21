// src/components/Statistics.jsx
import React from 'react';

export default function Statistics({ onBackHome }) {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        {/* Header de estadísticas */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📊 Estadísticas de la Web
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Dashboard completo con métricas en tiempo real de Google Analytics
          </p>
        </div>

        {/* Dashboard GA4 (Looker Studio) */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-8">
          <iframe
            title="Dashboard ProyectoDNI (GA4)"
            src="https://lookerstudio.google.com/reporting/033e33c0-ed82-4285-8a50-5693c2d621c4"
            width="100%"
            height="800"
            frameBorder="0"
            style={{ border: 0 }}
            allowFullScreen>
          </iframe>
        </div>

        {/* Botón de regreso */}
        <div className="text-center mt-8">
          <button
            onClick={onBackHome}
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors duration-200 shadow-lg"
          >
            <i className="bi bi-arrow-left mr-2"></i>
            Volver a la Aplicación
          </button>
        </div>
      </div>
    </div>
  );
}