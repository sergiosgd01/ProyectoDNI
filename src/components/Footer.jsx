import React from 'react';

function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"></div>
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary-900/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-secondary-900/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-8 items-center justify-between">

          {/* Logo y Eslogan */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-lg p-2 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <img
                  src="/logo-web.png"
                  alt="Logo Protector DNI"
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Protector<span className="text-primary-400">DNI</span>
              </h3>
            </div>
            <p className="text-gray-400 text-sm max-w-sm text-center md:text-left leading-relaxed">
              La herramienta gratuita y segura para proteger tu documentación de identidad en el navegador de forma 100% privada.
            </p>
          </div>

          {/* Financiación (Reemplaza a ProjectInfo) */}
          <div className="flex flex-col items-center md:items-end w-full">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 text-center md:text-right max-w-lg shadow-xl hover:bg-gray-800/70 transition-colors duration-300">
              <h4 className="font-semibold text-primary-400 text-sm tracking-wider uppercase mb-3">
                Financiado por Next Generation EU
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Iniciativa del Plan de Recuperación, Transformación y Resiliencia, financiada por la UE en el proyecto C108/23 "Detección de Falsificación de Documentos mediante IA".
              </p>
              <div className="flex items-center justify-center md:justify-end">
                <div className="bg-white p-2 rounded-lg inline-block">
                  <img
                    src="/footer_incibe.jpg"
                    alt="Logo INCIBE"
                    className="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="mt-16 pt-8 border-t border-gray-800/50 flex flex-col md:flex-row items-center justify-between text-center md:text-left">
          <p className="text-xs text-gray-500 mb-4 md:mb-0">
            © {new Date().getFullYear()} Protector DNI. Todos los derechos reservados.
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <i className="bi bi-shield-lock-fill text-green-500"></i>
            <span>Procesamiento 100% Local</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
