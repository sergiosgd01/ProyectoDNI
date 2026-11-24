import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { addWatermark } from '../utils/watermark';

// Resultado de una cara con la marca de agua por encima, como saldrá en la copia que se descarga (FUN-5). Antes la
// vista previa salía sin marca y solo se veía en la ficha pequeña de la descarga. La marca se dibuja con la misma función
// que la copia, en un lienzo transparente del tamaño de la foto puesto encima, así que se ve igual. La imagen de debajo
// sigue siendo el resultado tapado sin marca, que es lo que usan la copia y el banco de pruebas
// El resto de propiedades (como data-giro, que lee el banco) van a la imagen
export default function FotoConMarca({ src, alt, marca, className = '', ...resto }) {
  const imagenRef = useRef(null);
  const lienzoRef = useRef(null);
  const [tamano, setTamano] = useState(null);

  const medir = () => {
    const imagen = imagenRef.current;
    if (imagen?.complete && imagen.naturalWidth) setTamano({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight });
  };
  // Una imagen que ya estaba en la caché puede cargarse antes de que llegue onLoad
  useLayoutEffect(medir, [src]);

  useEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo || !tamano) return;
    lienzo.width = tamano.ancho;
    lienzo.height = tamano.alto;
    const ctx = lienzo.getContext('2d');
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    if (marca?.trim()) addWatermark(lienzo, ctx, { text: marca });
  }, [tamano, marca]);

  return (
    <div className="relative">
      <img ref={imagenRef} src={src} alt={alt} className={className} onLoad={medir} {...resto} />
      <canvas
        ref={lienzoRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
      />
    </div>
  );
}
