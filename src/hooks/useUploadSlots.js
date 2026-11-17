import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { esHeicPorNombre } from '../utils/heic';

// Recuadros de subida de la cara delantera y de la trasera.
// Cada FileUploadZone se apunta mientras su cara no tiene foto. Así la página de subida puede
// entregarle una foto soltada fuera del recuadro, pegada con ⌘V o que llega junto con la de la otra cara
const UploadSlotContext = createContext(null);

export const UploadSlotProvider = UploadSlotContext.Provider;

// Pistas en el nombre del archivo para saber de qué cara es
const PISTA_DELANTERA = /delant|anvers|front/i;
const PISTA_TRASERA = /tras|detr[aá]s|revers|back|dorso|poster/i;

const caraPorNombre = (file) => {
  if (PISTA_TRASERA.test(file.name)) return 'back';
  if (PISTA_DELANTERA.test(file.name)) return 'front';
  return null;
};

// Ordena dos fotos como [delantera, trasera]. Primero mira si el nombre lo dice («dni_delante», «reverso»...).
// Si no, sigue el orden de los nombres, que en las fotos del móvil es el orden en que se hicieron
export function ordenarPorCara([a, b]) {
  const caraA = caraPorNombre(a);
  const caraB = caraPorNombre(b);
  if ((caraA === 'back' && caraB !== 'back') || (caraB === 'front' && caraA !== 'front')) return [b, a];
  if (caraA || caraB) return [a, b];
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) <= 0 ? [a, b] : [b, a];
}

// FileUploadZone se apunta con esto. processFile sube la foto como si se hubiera elegido en ese recuadro.
// Devuelve si el recuadro está dentro de la página de subida, que es quien reparte lo que se suelta
export function useUploadSlotRegistration(processFile, isBusy) {
  const slot = useContext(UploadSlotContext);
  const latest = useRef({ processFile, isBusy });

  useEffect(() => {
    latest.current = { processFile, isBusy };
  });

  useEffect(() => {
    if (!slot) return undefined;
    return slot.register(slot.side, {
      processFile: (file) => latest.current.processFile(file),
      isBusy: () => latest.current.isBusy
    });
  }, [slot]);

  return Boolean(slot);
}

const AVISO_SIN_HUECO = 'Ya hay una foto en cada cara. Quita con la ✕ la que quieras cambiar.';

// La página de subida reparte con esto las fotos entre las dos caras.
// distribute devuelve un aviso para enseñar, o null si no hace falta
export function useUploadSlots() {
  const handlers = useRef({ front: null, back: null });

  const register = useCallback((side, handler) => {
    handlers.current[side] = handler;
    return () => {
      if (handlers.current[side] === handler) handlers.current[side] = null;
    };
  }, []);

  const front = useMemo(() => ({ side: 'front', register }), [register]);
  const back = useMemo(() => ({ side: 'back', register }), [register]);

  const distribute = useCallback((files, droppedOn) => {
    // Si entre lo soltado hay algo que no es una imagen, se descarta. Si no hay ninguna imagen,
    // se manda el primer archivo para que el recuadro explique qué formatos admite.
    // Las HEIC se miran también por la extensión, porque algunos navegadores las dan sin tipo
    const imagenes = files.filter((file) => file.type.startsWith('image/') || esHeicPorNombre(file));
    const fotos = imagenes.length ? imagenes : files.slice(0, 1);

    // Una cara está libre si su recuadro está a la vista, es decir, sin foto, y no está procesando otra
    const libres = ['front', 'back'].filter((side) => handlers.current[side] && !handlers.current[side].isBusy());
    const enviar = (side, file) => handlers.current[side].processFile(file);

    if (fotos.length === 1) {
      if (droppedOn && !libres.includes(droppedOn)) {
        return handlers.current[droppedOn]
          ? 'Espera a que termine de procesarse la foto de esta cara.'
          : 'Esta cara ya tiene foto. Quítala con la ✕ para cambiarla.';
      }
      const destino = droppedOn || libres[0];
      if (!destino) return AVISO_SIN_HUECO;
      enviar(destino, fotos[0]);
      return null;
    }

    if (libres.length === 0) return AVISO_SIN_HUECO;
    const [delantera, trasera] = ordenarPorCara(fotos.slice(0, 2));
    if (libres.includes('front')) enviar('front', delantera);
    if (libres.includes('back')) enviar('back', trasera);
    if (libres.length === 1) return 'Solo quedaba libre una cara, así que se ha subido una sola foto.';
    if (fotos.length > 2) return 'Solo se usan dos fotos, una por cara.';
    return null;
  }, []);

  return useMemo(() => ({ front, back, distribute }), [front, back, distribute]);
}
