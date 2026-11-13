import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { VIEWS } from '../constants/views';

// Cada cambio de vista se apunta en el historial del navegador. Así Atrás y Adelante cambian de vista
// dentro de la web sin recargarla y no se pierden las fotos subidas, que solo están en memoria.
// La web no tiene rutas. Inicio, subida y editor comparten la dirección «/» y se distinguen por la vista
// guardada en el estado de cada entrada. Las páginas legales y las de jornadas conservan su dirección.

const PAGE_PATHS = {
  [VIEWS.JORNADAS_CACERES]: '/jornadas-caceres',
  [VIEWS.JORNADAS_MERIDA]: '/jornadas-merida',
  [VIEWS.AVISO_LEGAL]: '/aviso-legal',
  [VIEWS.PRIVACIDAD]: '/privacidad'
};

// Dirección antigua con una errata que sigue llevando a las jornadas de Mérida
const OLD_PATHS = {
  '/jorndas-merida': VIEWS.JORNADAS_MERIDA
};

const ROOT_VIEWS = [VIEWS.HOME, VIEWS.UPLOAD_PROCESS, VIEWS.EDITOR];

function viewFromPath(pathname) {
  const view = Object.keys(PAGE_PATHS).find((key) => PAGE_PATHS[key] === pathname);
  return view || OLD_PATHS[pathname] || null;
}

// Vista de la entrada actual del historial. En las páginas con dirección propia manda la dirección
// y en «/» la vista guardada en el estado. Devuelve null si la entrada no tiene vista guardada.
function viewFromHistory(state) {
  return viewFromPath(window.location.pathname) || (ROOT_VIEWS.includes(state?.view) ? state.view : null);
}

function pushEntry(state, view) {
  if (PAGE_PATHS[view]) {
    window.history.pushState(state, '', PAGE_PATHS[view]);
  } else if (window.location.pathname !== '/') {
    window.history.pushState(state, '', '/');
  } else {
    // Ya se está en «/». La dirección no cambia
    window.history.pushState(state, '');
  }
}

/**
 * resolveView recibe la vista pedida y devuelve la que se puede mostrar, por ejemplo la subida
 * si se pide el editor sin fotos. onHistoryNavigate avisa cuando la vista cambia con Atrás o Adelante.
 */
export function useNavigation({ resolveView, onHistoryNavigate } = {}) {
  const [currentView, setCurrentView] = useState(() => {
    const view = viewFromHistory(window.history.state) || VIEWS.HOME;
    return resolveView ? resolveView(view) : view;
  });

  // Copia de la vista para leerla al momento desde el oyente de popstate
  const currentViewRef = useRef(currentView);

  // Las funciones de App se leen siempre en su última versión
  const optionsRef = useRef({ resolveView, onHistoryNavigate });
  useLayoutEffect(() => {
    optionsRef.current = { resolveView, onHistoryNavigate };
  });

  const resolve = useCallback((view) => {
    const resolver = optionsRef.current.resolveView;
    return resolver ? resolver(view) : view;
  }, []);

  const show = useCallback((view) => {
    currentViewRef.current = view;
    setCurrentView(view);
  }, []);

  useEffect(() => {
    // La entrada con la que se abre la web también guarda su vista, para reconocerla al volver a ella.
    // No guarda la vista anterior porque tras una recarga la entrada de atrás es de otra carga de la página
    window.history.replaceState({ view: currentViewRef.current }, '');

    const handlePopState = (event) => {
      const fromHistory = viewFromHistory(event.state);
      if (!fromHistory) {
        // Entrada sin vista, por ejemplo la de un enlace a un ancla. Se queda la vista que hay en pantalla
        window.history.replaceState({ view: currentViewRef.current }, '');
        return;
      }

      const view = resolve(fromHistory);
      if (view !== fromHistory) {
        // La entrada pedía una vista que ya no se puede mostrar. Se corrige para que coincida con lo que se ve
        window.history.replaceState({ ...event.state, view }, '');
      }
      if (view === currentViewRef.current) return;

      optionsRef.current.onHistoryNavigate?.(view, currentViewRef.current);
      show(view);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolve, show]);

  const goTo = useCallback((requested) => {
    const view = resolve(requested);
    const from = currentViewRef.current;
    if (view === from) return;

    // Cada entrada recuerda de qué vista se venía, para que los botones de volver puedan usar el historial
    pushEntry({ view, prev: from }, view);
    show(view);
  }, [resolve, show]);

  // Para los botones de volver de la propia web. Si la entrada anterior del historial es la vista pedida
  // se retrocede a ella, igual que con Atrás. Así el historial no crece en bucle y desde el inicio
  // Atrás sigue saliendo de la web. Si no, se añade una entrada nueva.
  const goBack = useCallback((requested) => {
    const view = resolve(requested);
    if (view === currentViewRef.current) return;

    if (window.history.state?.prev === view) {
      // La vista cambia ya, sin esperar a popstate, y así un segundo toque no puede retroceder dos veces
      show(view);
      window.history.back();
      return;
    }
    goTo(view);
  }, [goTo, resolve, show]);

  const goHome = useCallback(() => goBack(VIEWS.HOME), [goBack]);

  return {
    currentView,
    goTo,
    goBack,
    goHome
  };
}
