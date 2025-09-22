import { useEffect } from 'react';

export function useAutoNavigation(frontFile, backFile, currentView, goTo, isMobile) {
  // Efecto para ir automáticamente al editor cuando ambas imágenes estén cargadas
  useEffect(() => {
    if (frontFile && backFile && (currentView === 'upload' || currentView === 'back')) {
      // Pequeño delay para mostrar que ambas fotos se cargaron antes de ir al editor
      const timer = setTimeout(() => {
        goTo('editor');
      }, 1500); // 1.5 segundos de delay

      return () => clearTimeout(timer);
    }
  }, [frontFile, backFile, currentView, goTo]);

  // Efecto para navegación automática en móvil después de seleccionar archivo frontal
  useEffect(() => {
    if (frontFile && isMobile && currentView === 'front') {
      const timer = setTimeout(() => {
        goTo('back');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [frontFile, isMobile, currentView, goTo]);
}