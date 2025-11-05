import { useEffect, useRef } from 'react';
import { VIEWS } from '../constants/views';
import { DEMO_MODE } from '../config/demoMode';

export function useAutoNavigation(
  frontFile, 
  backFile, 
  currentView, 
  goTo, 
  shouldAutoNavigate = true,
  setShowProcessingLoader = null,
  onBeforeNavigate = null,
  onFailure = null
) {
  const isProcessingRef = useRef(false);

  // Efecto para ir automáticamente al editor cuando ambas imágenes estén cargadas
  useEffect(() => {
    if (frontFile && backFile && shouldAutoNavigate && currentView === VIEWS.UPLOAD_PROCESS) {
      if (isProcessingRef.current) {
        return;
      }

      const navigateToEditor = async () => {
        isProcessingRef.current = true;

        // Si está en modo demo y hay función para mostrar loader
        try {
          if (onBeforeNavigate) {
            const precheck = await onBeforeNavigate();
            if (!precheck || precheck.ok === false) {
              onFailure?.(precheck);
              return;
            }
          }

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
        } catch (error) {
          onFailure?.({ ok: false, error, message: error?.message });
        } finally {
          isProcessingRef.current = false;
        }
      };

      navigateToEditor();
    }
  }, [
    frontFile,
    backFile,
    currentView,
    goTo,
    shouldAutoNavigate,
    setShowProcessingLoader,
    onBeforeNavigate,
    onFailure
  ]);
}
