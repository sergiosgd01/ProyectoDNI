import { useEffect } from 'react';

/**
 * Hook personalizado para hacer scroll al principio de la página
 * cuando se monta el componente
 */
export function useScrollToTop() {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);
}