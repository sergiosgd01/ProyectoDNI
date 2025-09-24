// src/components/Header.jsx
import React, { useState } from 'react';

function Header({ onShowHome }) {
  const [selectedLanguage, setSelectedLanguage] = useState('es');

  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y nombre */}
          <div className="flex items-center cursor-pointer" onClick={onShowHome}>
            <div className="w-10 h-10 flex items-center justify-center mr-3">
              <img 
                src="/logo-web.png" 
                alt="Logo Protector DNI" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Protector DNI</h1>
              <p className="text-xs text-gray-500">Protege tu identidad</p>
            </div>
          </div>

          {/* Navegación y controles */}
          <div className="flex items-center space-x-4">

            {/* Selector de idioma */}
            <div className="relative">
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              {/* Icono de flecha hacia abajo */}
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <i className="bi bi-chevron-down text-gray-400"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
