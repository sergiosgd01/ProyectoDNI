import { useLayoutEffect, useState } from 'react';

// Dirección de un archivo (una foto subida) para enseñarlo en una imagen. Se crea una vez por archivo y se libera al
// cambiar de archivo o al desmontar. Antes se creaba con URL.createObjectURL dentro del render, y cada pintado dejaba
// una dirección nueva sin liberar, con la foto entera en memoria (UX-4). Va en un efecto de layout para que la imagen
// tenga su dirección antes de que se pinte la pantalla, sin un instante en blanco. Con un efecto así, la doble pasada
// de React en desarrollo libera la primera y crea otra, sin dejar la imagen rota
export function useUrlDeArchivo(archivo) {
  const [url, setUrl] = useState(null);
  useLayoutEffect(() => {
    if (!archivo) {
      setUrl(null);
      return undefined;
    }
    const nueva = URL.createObjectURL(archivo);
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [archivo]);
  return url;
}
