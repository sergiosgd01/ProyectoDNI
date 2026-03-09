import React, { useState, useEffect } from 'react';
import 'flag-icons/css/flag-icons.min.css';

function Header({ onShowHome }) {
  const [scrolled, setScrolled] = useState(false);

  // Detectar scroll para cambiar estilo del header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    if (onShowHome) onShowHome(); // Asegurarse de estar en la vista principal

    // Pequeño delay para permitir que el renderizado de la "home" ocurra si estábamos en el proceso
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        const headerOffset = 90;

        if (targetId === 'upload-section') {
          const ctaAnchor = document.getElementById('upload-cta-anchor');
          const sectionTop = element.getBoundingClientRect().top + window.pageYOffset;
          const minTarget = sectionTop - headerOffset;
          let targetPosition = minTarget;

          if (ctaAnchor) {
            const ctaRect = ctaAnchor.getBoundingClientRect();
            const ctaTop = ctaRect.top + window.pageYOffset;
            const ctaBottom = ctaTop + ctaRect.height;
            const bottomMargin = 20;
            targetPosition = ctaBottom - (window.innerHeight - bottomMargin);
          }

          const maxTarget = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          const finalTarget = Math.min(maxTarget, Math.max(minTarget, targetPosition));

          window.scrollTo({
            top: finalTarget,
            behavior: 'smooth'
          });
          return;
        }

        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 py-3 transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">

          {/* Logo y nombre */}
          <div className="flex items-center cursor-pointer group" onClick={onShowHome}>
            <div className="flex items-center justify-center mr-3 w-10 h-10">
              <img
                src="/logo-web.png"
                alt="Logo Protector DNI"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Protector DNI</h1>
              <p className="text-xs text-primary-600 font-medium tracking-wide uppercase">Seguridad Digital</p>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#upload-section" onClick={(e) => handleNavClick(e, 'upload-section')} className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
              Cómo funciona
            </a>
            <a href="#security-section" onClick={(e) => handleNavClick(e, 'security-section')} className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
              Seguridad
            </a>
            <a href="#faq-section" onClick={(e) => handleNavClick(e, 'faq-section')} className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
              FAQ
            </a>
          </nav>

          {/* CTA Header */}
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => handleNavClick(e, 'upload-section')}
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 bg-primary-600 rounded-full hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5"
            >
              Procesar DNI
            </button>
            <button
              onClick={(e) => handleNavClick(e, 'upload-section')}
              className="sm:hidden inline-flex items-center justify-center p-2 text-primary-600 bg-primary-50 rounded-full hover:bg-primary-100"
            >
              <i className="bi bi-upload text-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;