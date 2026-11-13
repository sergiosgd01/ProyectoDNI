import { useEffect, useRef } from 'react';
import { VIEWS } from '../constants/views';
import { DEMO_MODE } from '../config/demoMode';

// Pausa antes de abrir el editor, para que se llegue a ver la miniatura de la segunda cara.
// Eran 1,5 s fijos, más de lo que tarda ahora el propio recorte
const EDITOR_DELAY_MS = 300;

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
          // Modo normal (sin demo): pausa breve
          await new Promise(resolve => setTimeout(resolve, EDITOR_DELAY_MS));
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
