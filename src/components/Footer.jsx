import React from 'react';

function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Logo y descripción */}
          <div className="md:col-span-1">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 flex items-center justify-center mr-2">
                <img 
                  src="/logo-web.png" 
                  alt="Logo Protector DNI" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-lg font-bold">Protector DNI</h3>
            </div>
            <p className="text-gray-300 text-sm">
              Herramienta gratuita para proteger tu documentación de identidad de forma segura y privada.
            </p>
          </div>

          {/* Enlaces útiles */}
          <div>
            <h4 className="text-base font-semibold mb-3">Enlaces</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Preguntas frecuentes
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Términos de uso
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Política de privacidad
                </a>
              </li>
            </ul>
          </div>

          {/* Información de contacto */}
          <div>
            <h4 className="text-base font-semibold mb-3">Contacto</h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>info@protectordni.com</li>
              <li>Desarrollado por el grupo de ingeniería de medios</li>
            </ul>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-gray-700 mt-6 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Copyright */}
            <div className="text-sm text-gray-400 mb-3 md:mb-0">
              © 2025 Protector DNI. Todos los derechos reservados.
            </div>

            {/* Logo INCIBE donde estaba el texto */}
            <div className="flex items-center">
              <img 
                src="/footer_incibe.jpg" 
                alt="Logo INCIBE" 
                className="h-12 w-auto opacity-90"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
