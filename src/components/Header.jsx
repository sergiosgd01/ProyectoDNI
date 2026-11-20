import React, { useState, useEffect } from 'react';
import 'flag-icons/css/flag-icons.min.css';

// Enlaces del menú. Solo bajan a cada sección de la portada
const ENLACES = [
  { id: 'upload-section', texto: 'Cómo funciona' },
  { id: 'security-section', texto: 'Pruébalo' },
  { id: 'faq-section', texto: 'Preguntas frecuentes' },
];

// onStartProcess abre la subida. El botón se llama «Subir mi DNI», como el resto de la portada, y el banco de
// pruebas lo busca por ese nombre. En el móvil los enlaces van en un menú que se abre con el botón de las tres
// rayas y se cierra al elegir un enlace o con Escape
function Header({ onShowHome, onStartProcess }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Detectar scroll para cambiar estilo del header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPulsarTecla = (e) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    window.addEventListener('keydown', alPulsarTecla);
    return () => window.removeEventListener('keydown', alPulsarTecla);
  }, [menuAbierto]);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMenuAbierto(false);
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

  // El logo lleva a la portada sin recargar. Con Ctrl, ⌘ o Mayúsculas se abre en otra pestaña, como un enlace
  const irAlInicio = (e) => {
    setMenuAbierto(false);
    if (!onShowHome || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onShowHome();
  };

  return (
    // Con el menú abierto la cabecera es opaca, para que no se vea el texto de detrás entre los enlaces
    <header className={`fixed top-0 left-0 right-0 z-50 border-b border-gray-200 transition-shadow duration-300 ${menuAbierto ? 'bg-white' : 'bg-white/95 backdrop-blur-sm'} ${scrolled || menuAbierto ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 py-3">
          <a
            href="/"
            onClick={irAlInicio}
            className="flex min-w-0 items-center gap-2.5 sm:gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500"
          >
            <img src="/logo-web.png" alt="" className="h-9 w-9 sm:h-10 sm:w-10 flex-none object-contain" />
            <span className="min-w-0 max-[359px]:hidden">
              {/* En el móvil el nombre no cabe en una línea junto a «Subir mi DNI» y pasa a dos */}
              <span className="block text-base sm:text-xl font-bold leading-tight text-gray-900">Protege tu identidad</span>
              <span className="hidden sm:block text-xs font-medium uppercase tracking-wide text-secondary-600">Seguridad digital</span>
            </span>
          </a>

          <nav aria-label="Secciones de la portada" className="hidden md:flex items-center gap-8">
            {ENLACES.map((enlace) => (
              <a
                key={enlace.id}
                href={`#${enlace.id}`}
                onClick={(e) => handleNavClick(e, enlace.id)}
                className="text-sm font-medium text-gray-700 hover:text-secondary-600 transition-colors"
              >
                {enlace.texto}
              </a>
            ))}
          </nav>

          <div className="flex flex-none items-center gap-2">
            <button type="button" onClick={onStartProcess} className="btn btn-sm btn-principal px-3 sm:px-4">
              Subir mi DNI
            </button>
            <button
              type="button"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
              aria-label={menuAbierto ? 'Cerrar el menú' : 'Abrir el menú'}
              className="btn btn-sm btn-secundario w-11 px-0 md:hidden"
            >
              <i className={`bi ${menuAbierto ? 'bi-x-lg' : 'bi-list'} text-xl`} aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {menuAbierto && (
          <nav id="menu-movil" aria-label="Secciones de la portada" className="md:hidden border-t border-gray-200 pb-2">
            {ENLACES.map((enlace) => (
              <a
                key={enlace.id}
                href={`#${enlace.id}`}
                onClick={(e) => handleNavClick(e, enlace.id)}
                className="flex min-h-[48px] items-center border-b border-gray-100 last:border-b-0 text-base font-medium text-gray-800"
              >
                {enlace.texto}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
