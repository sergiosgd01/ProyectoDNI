import React from 'react';
import { sitiosDelCampo } from '../utils/sitioDeLosDatos';

// Recuadros sobre la foto de una cara con el sitio del campo por el que pasa el ratón o el teclado (UX-12, 24/11/2026).
// El dato va en amarillo y sus copias (la MRZ, la ventana del soporte, el CLI...) con borde discontinuo. Va dentro de
// un contenedor relative del mismo tamaño que la foto
export default function ZonasIluminadas({ campo, cara }) {
  if (!campo) return null;
  const sitios = sitiosDelCampo(campo).filter((sitio) => sitio.cara === cara);
  if (sitios.length === 0) return null;
  return (
    <div aria-hidden="true" data-iluminado={campo} className="absolute inset-0 pointer-events-none">
      {sitios.map(({ caja: [x0, y0, x1, y1], copia }) => (
        <div
          key={`${x0}:${y0}`}
          className={`absolute rounded-sm border-2 border-primary-500 ${copia ? 'border-dashed bg-primary-300/20' : 'bg-primary-300/40'}`}
          style={{ left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` }}
        />
      ))}
    </div>
  );
}
