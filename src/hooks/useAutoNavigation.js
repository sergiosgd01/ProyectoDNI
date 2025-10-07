import { useEffect } from 'react';
import { VIEWS } from '../constants/views';
import { DEMO_MODE } from '../config/demoMode';

export function useAutoNavigation(
  frontFile, 
  backFile, 
  currentView, 
  goTo, 
  shouldAutoNavigate = true,
  setShowProcessingLoader = null
) {
  // Efecto para ir automáticamente al editor cuando ambas imágenes estén cargadas
  useEffect(() => {
    if (frontFile && backFile && shouldAutoNavigate && currentView === VIEWS.UPLOAD_PROCESS) {
      const navigateToEditor = async () => {
        // Si está en modo demo y hay función para mostrar loader
        if (DEMO_MODE.enabled && setShowProcessingLoader) {
          // Pequeño delay para que se vea que ambas fotos están cargadas
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Mostrar el loader
          setShowProcessingLoader(true);
          
          // Esperar la duración del procesamiento
          await new Promise(resolve => setTimeout(resolve, DEMO_MODE.timings.processingSteps));
          
          // Ocultar el loader
          setShowProcessingLoader(false);
          
          // Navegar al editor
          goTo(VIEWS.EDITOR);
        } else {
          // Modo normal (sin demo): delay simple como antes
          await new Promise(resolve => setTimeout(resolve, 1500));
          goTo(VIEWS.EDITOR);
        }
      };

      navigateToEditor();
    }
  }, [frontFile, backFile, currentView, goTo, shouldAutoNavigate, setShowProcessingLoader]);
}