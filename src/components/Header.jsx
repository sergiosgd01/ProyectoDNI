import React, { useState } from 'react';
import 'flag-icons/css/flag-icons.min.css';

function Header({ onShowHome }) {
  const [selectedLanguage, setSelectedLanguage] = useState('es');

  const languages = [
    { code: 'es', name: 'Español', flag: 'fi fi-es' },
    { code: 'en', name: 'English', flag: 'fi fi-us' },
    { code: 'pt', name: 'Português', flag: 'fi fi-pt' }
  ];

  const current = languages.find(lang => lang.code === selectedLanguage);
  const [open, setOpen] = useState(false);

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

            {/* Selector de idioma eliminado temporalmente */}
            {/* <div className="relative w-48">
              <button
                onClick={() => setOpen(prev => !prev)}
                className="flex items-center justify-start w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <span className={`${current.flag} w-5 h-5 mr-2`}></span>
                <span>{current.name}</span>
                <i className="bi bi-chevron-down text-gray-400 ml-auto"></i>
              </button>

              {open && (
                <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                  {languages.map(lang => (
                    <div
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setOpen(false);
                      }}
                      className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100 space-x-2"
                    >
                      <span className={`${lang.flag} w-5 h-5`}></span>
                      <span>{lang.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div> */}

          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;