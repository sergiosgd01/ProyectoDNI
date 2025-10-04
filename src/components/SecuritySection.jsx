import React from 'react';

function SecuritySection() {
  return (
    <>
      {/* Sección de características principales */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Características Principales
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Protege tu DNI de forma inteligente con nuestras herramientas avanzadas
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Ofuscación Inteligente */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-eye text-primary-600 text-3xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Ocultación Selectiva</h3>
              <p className="text-gray-600">
                Selecciona exactamente qué datos mostrar u ocultar. Perfecto para trámites específicos donde solo necesitas mostrar cierta información.
              </p>
            </div>

            {/* Marca de Agua Personalizable */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-pencil-square text-primary-600 text-3xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Marca de Agua Personalizable</h3>
              <p className="text-gray-600">
                Añade una marca de agua con el texto que quieras: "Solo para trámite bancario", "Copia no válida", o cualquier mensaje personalizado.
              </p>
            </div>

            {/* Exportación Inmediata */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-file-earmark-arrow-down text-primary-600 text-3xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Descarga Instantánea</h3>
              <p className="text-gray-600">
                Obtén tu DNI protegido al instante. Sin registros, sin esperas, sin complicaciones. Un click y listo para usar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de beneficios técnicos */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-12">
            ¿Por qué elegirnos?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Privacidad Total */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-lock text-secondary-600 text-3xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">100% Privado</h3>
              <p className="text-sm text-gray-600">
                Tu DNI nunca sale de tu dispositivo. Todo se procesa localmente en tu navegador. Sin servidores, sin riesgos.
              </p>
            </div>

            {/* Facilidad de Uso */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-speedometer2 text-secondary-600 text-3xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Súper Rápido</h3>
              <p className="text-sm text-gray-600">
                Tres pasos simples: sube, personaliza y descarga. Sin registros, sin complicaciones. Listo en segundos.
              </p>
            </div>

            {/* Flexibilidad */}
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-sliders text-secondary-600 text-3xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Totalmente Personalizable</h3>
              <p className="text-sm text-gray-600">
                Cada trámite es diferente. Adapta tu DNI para cada situación específica con total control sobre qué mostrar.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default SecuritySection;
