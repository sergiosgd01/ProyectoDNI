import { useEffect } from 'react';
import { VIEWS } from '../constants/views';

export function useAutoNavigation(frontFile, backFile, currentView, goTo, shouldAutoNavigate = true) {
  // Efecto para ir automáticamente al editor cuando ambas imágenes estén cargadas
  useEffect(() => {
    if (frontFile && backFile && shouldAutoNavigate && currentView === VIEWS.UPLOAD_PROCESS) {
      // Pequeño delay para mostrar que ambas fotos se cargaron antes de ir al editor
      const timer = setTimeout(() => {
        goTo(VIEWS.EDITOR);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [frontFile, backFile, currentView, goTo, shouldAutoNavigate]);
}