import { useState, useCallback } from 'react';
import { DEMO_MODE } from '../config/demoMode';

export function useDemoMode() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  // Procesar con demo (sin mostrar que es demo)
  const processWithDemo = useCallback(async (processFunction, ...args) => {
    if (!DEMO_MODE.enabled) {
      return await processFunction(...args);
    }

    setIsProcessing(true);
    setShowLoader(true);

    // Esperar a que termine la animación
    await new Promise(resolve => {
      setTimeout(resolve, DEMO_MODE.timings.processingSteps);
    });

    setShowLoader(false);

    // Retornar resultado demo (sin marcar como demo)
    const result = {
      frontImageUrl: DEMO_MODE.images.frontProcessed,
      backImageUrl: DEMO_MODE.images.backProcessed,
    };

    setIsProcessing(false);
    return result;
  }, []);

  return {
    isProcessing,
    showLoader,
    setShowLoader,
    processWithDemo,
    isDemoMode: DEMO_MODE.enabled
  };
}