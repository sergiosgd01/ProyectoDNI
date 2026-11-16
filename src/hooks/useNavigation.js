import { createContext, useState, useCallback, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { VIEWS } from '../constants/views';

// Cada cambio de vista se apunta en el historial del navegador. Así Atrás y Adelante cambian de vista
// dentro de la web sin recargarla y no se pierden las fotos subidas, que solo están en memoria.
// La web no tiene rutas. Inicio, subida y editor comparten la dirección «/» y se distinguen por la vista
// guardada en el estado de cada entrada. Las páginas legales y las de jornadas conservan su dirección.
//
// Cada entrada guarda en «cadena» las vistas de las entradas anteriores, en orden. Su longitud es la posición
// de la entrada, y con ella los botones de volver retroceden de una vez hasta la vista que piden.
//
// Las ventanas (cámara, recorte y censura manual) apuntan su propia entrada al abrirse, con la misma vista y
// «ventana: true». Atrás quita esa entrada y cierra la ventana en vez de salir de la vista, como es habitual
// en Android (useCloseOnBack). Si la ventana se cierra con sus botones, su entrada se queda hasta la siguiente
// navegación. La siguiente entrada la sustituye, y Atrás desde ella retrocede una vez más.
//
// Al cerrar una ventana la web no retrocede sola. Chrome marca como saltables todas las entradas de una página que
// apunta una entrada nueva después de ir atrás o adelante sin que la persona haya tocado nada desde entonces, y su
// botón Atrás se las salta y saca de la web (docs/history_manipulation_intervention.md de Chromium). Pasaría al
// abrirse solo el editor tras hacer la segunda foto con la cámara o recortarla a mano.

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

// Si un retroceso pedido por la propia web no llega en este tiempo, las entradas que esperan se apuntan igual
const ESPERA_MAXIMA_MS = 1500;

function viewFromPath(pathname) {
  const view = Object.keys(PAGE_PATHS).find((key) => PAGE_PATHS[key] === pathname);
  return view || OLD_PATHS[pathname] || null;
}

// Vista de la entrada actual del historial. En las páginas con dirección propia manda la dirección
// y en «/» la vista guardada en el estado. Devuelve null si la entrada no tiene vista guardada.
function viewFromHistory(state) {
  return viewFromPath(window.location.pathname) || (ROOT_VIEWS.includes(state?.view) ? state.view : null);
}

const cadenaDe = (state) => (Array.isArray(state?.cadena) ? state.cadena : []);

// Posición de la entrada en el historial de la web. Es null en las entradas sin cadena, como las de
// versiones anteriores de la web o la de un enlace a un ancla
const posicionDe = (state) => (Array.isArray(state?.cadena) ? state.cadena.length : null);

// Entradas que hay que retroceder para llegar a la última con esa vista, o 0 si no hay ninguna.
// Las entradas de la versión anterior solo guardaban en «prev» la vista de la anterior
function pasosHasta(state, view) {
  const cadena = cadenaDe(state);
  const indice = cadena.lastIndexOf(view);
  if (indice !== -1) return cadena.length - indice;
  return !Array.isArray(state?.cadena) && state?.prev === view ? 1 : 0;
}

// Dirección de la entrada de una vista. Es undefined si no cambia, por ejemplo al ir de la subida al editor
function rutaDe(view) {
  if (PAGE_PATHS[view]) return PAGE_PATHS[view];
  return window.location.pathname !== '/' ? '/' : undefined;
}

// ------------------------------------------------------------------ ventanas y retrocesos propios
// Este estado es de la página entera, como el propio historial. La web solo usa useNavigation en App

// Ventanas abiertas, de la más antigua a la más reciente. posicion es la de su entrada, o null mientras espera
const ventanas = [];

// Posición de la entrada actual si es la de una ventana ya cerrada con sus botones. Enseña lo mismo que la de debajo
let entradaCerrada = null;

// Retrocesos pedidos por la propia web cuyo popstate aún no ha llegado, en orden. Mientras tanto la entrada actual
// no es la definitiva, así que lo que hay que apuntar en el historial espera en «pendientes». Cada retroceso dice si
// al llegar se deja la vista que ya se ve ('mantener') o se enseña la de la entrada de destino ('seguir')
let retrocesos = [];
let pendientes = [];
let vigilante = null;

function soltarPendientes() {
  clearTimeout(vigilante);
  const lista = pendientes;
  pendientes = [];
  lista.forEach((accion) => accion());
}

function cuandoTermine(accion) {
  if (retrocesos.length > 0) pendientes.push(accion);
  else accion();
}

function retroceder(pasos = 1, modo = 'mantener') {
  retrocesos.push(modo);
  entradaCerrada = null;
  clearTimeout(vigilante);
  // Por si el popstate no llega nunca. Lo que llegue tarde se trata como cualquier otro popstate
  vigilante = setTimeout(() => {
    retrocesos = [];
    soltarPendientes();
  }, ESPERA_MAXIMA_MS);
  window.history.go(-pasos);
}

// Apunta la entrada de una vista o de una ventana detrás de la actual, con las vistas de las anteriores en «cadena».
// Si la actual es la de una ventana ya cerrada, la sustituye en vez de añadir otra. Devuelve la posición de la entrada
function apuntar(datos, vistaAnterior, ruta) {
  const actual = window.history.state;
  const sustituir = entradaCerrada !== null && posicionDe(actual) === entradaCerrada;
  entradaCerrada = null;
  const state = { ...datos, cadena: sustituir ? cadenaDe(actual) : [...cadenaDe(actual), vistaAnterior] };
  const metodo = sustituir ? 'replaceState' : 'pushState';
  if (ruta === undefined) window.history[metodo](state, '');
  else window.history[metodo](state, '', ruta);
  return state.cadena.length;
}

// Entrada que ya no enseña nada propio y repite la vista de la anterior. Son la de una ventana que ya no está
// abierta y la del editor tras recargar, que sin fotos enseña la subida. La primera entrada nunca lo es
function esSobrante(state, pedida, mostrada) {
  const posicion = posicionDe(state);
  if (!posicion) return false;
  if (state.ventana) return !ventanas.some((ventana) => ventana.posicion === posicion);
  return pedida !== mostrada && cadenaDe(state)[posicion - 1] === mostrada;
}

function abrirVentana(cerrar) {
  const ventana = { cerrar, posicion: null, cerrada: false };
  ventanas.push(ventana);
  cuandoTermine(() => {
    if (ventana.cerrada) return;
    // Misma vista y misma dirección. Solo cambia que es la entrada de una ventana
    const vista = window.history.state?.view ?? null;
    ventana.posicion = apuntar({ view: vista, ventana: true }, vista);
  });
  return ventana;
}

function soltarVentana(ventana) {
  const indice = ventanas.indexOf(ventana);
  if (indice !== -1) ventanas.splice(indice, 1);
  // Si la ha cerrado Atrás, su entrada ya no está
  if (ventana.cerrada) return;
  ventana.cerrada = true;
  // Se ha cerrado con sus botones, o porque la vista ya no la enseña. Si su entrada es la actual se queda,
  // sin retroceder, hasta la siguiente navegación
  cuandoTermine(() => {
    const actual = window.history.state;
    if (ventana.posicion !== null && actual?.ventana && posicionDe(actual) === ventana.posicion) {
      entradaCerrada = ventana.posicion;
    }
  });
}

// Tras recargar, la entrada inicial se revisa una sola vez, aunque React monte App dos veces en desarrollo
let entradaInicialRevisada = false;

// ------------------------------------------------------------------ hooks

// Para los enlaces que cambian de vista sin recargar la página, como los del pie
export const NavigationContext = createContext(null);
export const useAppNavigation = () => useContext(NavigationContext);

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
    if (!entradaInicialRevisada) {
      entradaInicialRevisada = true;
      const state = window.history.state;
      if (esSobrante(state, viewFromHistory(state), currentViewRef.current)) {
        // Tras recargar en el editor o con una ventana abierta, esta entrada enseña lo mismo que la anterior.
        // Se vuelve a ella para que Atrás no se quede sin hacer nada
        retroceder();
      } else {
        // La entrada con la que se abre la web también guarda su vista, para reconocerla al volver a ella.
        // Tras recargar conserva su cadena, porque las entradas anteriores siguen siendo de esta web
        window.history.replaceState({ view: currentViewRef.current, cadena: cadenaDe(state) }, '');
      }
    }

    const handlePopState = (event) => {
      // Si es un retroceso pedido por la propia web. Los de los botones de volver ya enseñaron su vista, y si mientras
      // tanto la web ha cambiado de vista manda la nueva, cuya entrada se apunta después ('mantener')
      const modo = retrocesos.shift();
      const state = event.state;
      const destino = posicionDe(state);

      // Atrás desde la entrada de una ventana cerrada con sus botones llega a la de debajo, que enseña lo mismo.
      // Se retrocede otra vez para que la pulsación haga lo mismo que si esa entrada no estuviera
      const desdeCerrada = modo === undefined && entradaCerrada !== null && destino === entradaCerrada - 1;
      entradaCerrada = null;

      // Las ventanas cuya entrada ha quedado por delante de la de destino se cierran. Es lo que hace Atrás
      // con una ventana abierta. La vista de debajo es la misma, así que no cambia
      ventanas
        .filter((ventana) => ventana.posicion !== null && (destino === null || ventana.posicion > destino))
        .forEach((ventana) => {
          ventanas.splice(ventanas.indexOf(ventana), 1);
          ventana.cerrada = true;
          ventana.cerrar();
        });

      const fromHistory = viewFromHistory(state);
      if (!fromHistory) {
        // Entrada sin vista, por ejemplo la de un enlace a un ancla. Se queda la vista que hay en pantalla
        window.history.replaceState({ view: currentViewRef.current }, '');
      } else {
        const view = resolve(fromHistory);
        const sobrante = esSobrante(state, fromHistory, view);
        if (view !== fromHistory && !sobrante) {
          // La entrada pedía una vista que ya no se puede mostrar. Se corrige para que coincida con lo que se ve
          window.history.replaceState({ ...state, view }, '');
        }
        if (view !== currentViewRef.current && modo !== 'mantener') {
          optionsRef.current.onHistoryNavigate?.(view, currentViewRef.current);
          show(view);
        }
        if (desdeCerrada) {
          retroceder(1, 'seguir');
        } else if (sobrante) {
          // Al llegar con Adelante a la entrada de una ventana ya cerrada, o a la del editor sin fotos,
          // se vuelve a la anterior, que enseña lo mismo. Así ninguna pulsación se queda sin hacer nada
          retroceder();
        }
      }

      if (retrocesos.length === 0) soltarPendientes();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolve, show]);

  const goTo = useCallback((requested) => {
    const view = resolve(requested);
    const from = currentViewRef.current;
    if (view === from) return;

    show(view);
    // Cada entrada recuerda las vistas anteriores, para que los botones de volver puedan usar el historial
    cuandoTermine(() => apuntar({ view }, from, rutaDe(view)));
  }, [resolve, show]);

  // Para los botones de volver de la propia web. Si la vista pedida está más atrás en el historial se retrocede
  // hasta ella de una vez, igual que con Atrás. Así el historial no crece en bucle, «Inicio» en el editor hace lo
  // mismo que «Volver al inicio» en la subida y desde el inicio Atrás sigue saliendo de la web.
  // Si no está, se añade una entrada nueva.
  const goBack = useCallback((requested) => {
    const view = resolve(requested);
    const from = currentViewRef.current;
    if (view === from) return;

    // La vista cambia ya, sin esperar a popstate, y así un segundo toque no puede retroceder dos veces
    show(view);
    cuandoTermine(() => {
      const pasos = pasosHasta(window.history.state, view);
      if (pasos > 0) {
        retroceder(pasos);
      } else {
        apuntar({ view }, from, rutaDe(view));
      }
    });
  }, [resolve, show]);

  const goHome = useCallback(() => goBack(VIEWS.HOME), [goBack]);

  return {
    currentView,
    goTo,
    goBack,
    goHome
  };
}

/**
 * Atrás cierra la ventana en vez de salir de la vista, como es habitual en Android.
 * Mientras «abierta» es true la ventana tiene su propia entrada en el historial. Atrás la quita y llama a «cerrar».
 * Si la ventana se cierra de otra forma, con sus botones o porque se desmonta, la entrada se quita sola
 */
export function useCloseOnBack(abierta, cerrar) {
  const cerrarRef = useRef(cerrar);
  useLayoutEffect(() => {
    cerrarRef.current = cerrar;
  });

  useEffect(() => {
    if (!abierta) return undefined;
    const ventana = abrirVentana(() => cerrarRef.current?.());
    return () => soltarVentana(ventana);
  }, [abierta]);
}
