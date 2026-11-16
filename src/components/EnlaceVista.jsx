import React from 'react';
import { useAppNavigation } from '../hooks/useNavigation';

// Enlace a una página de la propia web. Cambia de vista sin recargar, así no se pierden las fotos subidas.
// Con Ctrl, ⌘, Mayúsculas o la rueda del ratón se abre en otra pestaña, como cualquier enlace
function EnlaceVista({ view, href, className, children }) {
  const navegacion = useAppNavigation();

  const abrir = (event) => {
    if (!navegacion || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (navegacion.currentView === view) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navegacion.goTo(view);
    }
  };

  return (
    <a href={href} onClick={abrir} className={className}>
      {children}
    </a>
  );
}

export default EnlaceVista;
