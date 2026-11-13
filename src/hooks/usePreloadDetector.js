import { useEffect } from 'react';
import { preloadDetector } from '../components/dni_scripts/dni_detector';

/**
 * Prepara el modelo de detección mientras la persona sube las fotos.
 *
 * Sin esto, el primer «Procesar» espera a que el modelo (12 MB) y el motor que lo ejecuta
 * se descarguen y se carguen. Se lanza cuando la página está desocupada para no competir
 * con lo que se está mostrando. Con el ahorro de datos activado no se hace, para no gastar
 * esos megas si al final no se procesa.
 */
export function usePreloadDetector() {
  useEffect(() => {
    if (navigator.connection?.saveData) {
      return undefined;
    }

    const preload = () => {
      preloadDetector();
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(preload, 1000);
    return () => window.clearTimeout(id);
  }, []);
}
