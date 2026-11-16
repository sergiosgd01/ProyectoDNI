import React, { useState } from 'react';

// Comparador de la portada. A la izquierda de la línea se ve la foto original y a la derecha, la protegida.
// El marco tiene la proporción de las dos imágenes (473 x 301), así que la foto lo llena entero.
// La línea se mueve pulsando o arrastrando con el ratón o el dedo, y con las flechas desde el tirador
function BeforeAfter({ original, protegida }) {
  const [posicion, setPosicion] = useState(50);
  const [arrastrando, setArrastrando] = useState(false);

  const moverA = (clientX, marco) => {
    const porcentaje = ((clientX - marco.left) / marco.width) * 100;
    setPosicion(Math.max(0, Math.min(100, porcentaje)));
  };

  const empezar = (clientX, elemento) => {
    setArrastrando(true);
    moverA(clientX, elemento.getBoundingClientRect());
  };

  const alPulsarTecla = (e) => {
    const paso = e.shiftKey ? 10 : 2;
    const destinos = {
      ArrowLeft: (p) => Math.max(0, p - paso),
      ArrowRight: (p) => Math.min(100, p + paso),
      Home: () => 0,
      End: () => 100,
    };
    if (!destinos[e.key]) return;
    e.preventDefault();
    setPosicion(destinos[e.key]);
  };

  return (
    <div
      className="relative w-full aspect-[473/301] overflow-hidden rounded-xl bg-gray-200 cursor-ew-resize touch-none select-none"
      onMouseMove={(e) => arrastrando && moverA(e.clientX, e.currentTarget.getBoundingClientRect())}
      onMouseUp={() => setArrastrando(false)}
      onMouseLeave={() => setArrastrando(false)}
      onTouchMove={(e) => arrastrando && moverA(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
      onTouchEnd={() => setArrastrando(false)}
    >
      <img
        src={protegida}
        alt="El mismo DNI de ejemplo con los datos tapados"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - posicion}% 0 0)` }}>
        <img
          src={original}
          alt="DNI de ejemplo sin proteger"
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 z-30 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-gray-900">
        Original
      </span>
      <span className="pointer-events-none absolute right-3 top-3 z-30 rounded-md bg-gray-900/85 px-2 py-1 text-xs font-semibold text-white">
        Protegido
      </span>

      {/* Capa que recoge el ratón y el dedo en todo el marco */}
      <div
        className="absolute inset-0 z-20"
        onMouseDown={(e) => empezar(e.clientX, e.currentTarget)}
        onTouchStart={(e) => empezar(e.touches[0].clientX, e.currentTarget)}
      />

      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(17,24,39,0.15)]"
        style={{ left: `${posicion}%` }}
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparar la foto original con la protegida"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(posicion)}
        aria-valuetext={`${Math.round(posicion)} % de la foto original`}
        onKeyDown={alPulsarTecla}
        onMouseDown={() => setArrastrando(true)}
        onTouchStart={() => setArrastrando(true)}
        className="absolute top-1/2 z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500"
        style={{ left: `${posicion}%` }}
      >
        <i className="bi bi-arrows-expand-vertical text-base" aria-hidden="true"></i>
      </div>
    </div>
  );
}

export default BeforeAfter;
