import React, { useEffect, useRef, useState } from 'react';

// Comparador de la portada. A la izquierda de la línea se ve la foto original y a la derecha, la protegida.
// El marco tiene la proporción de las dos imágenes (473 x 301), así que la foto lo llena entero.
// La línea se mueve pulsando o arrastrando con el ratón o el dedo, y con las flechas desde el tirador.
// Con el dedo, el navegador se queda los gestos verticales (touch-pan-y), así que la página baja aunque el dedo
// empiece encima de la foto. La línea solo se arrastra cuando el dedo va sobre todo de lado.
//
// En el iPhone touch-pan-y no basta. Safari mueve la página con la parte vertical de cualquier gesto, aunque vaya casi
// de lado, y al empezar a moverla cancela el arrastre de la línea. Por eso, si el primer movimiento del dedo va más de
// lado que en vertical, se le pide que no mueva la página durante ese gesto (preventDefault en touchmove). Safari
// decide si mueve la página con el primer touchmove, así que la decisión se toma ahí y vale para todo el gesto

// Lo que tiene que ir el dedo de lado antes de que la línea empiece a seguirlo
const UMBRAL_ARRASTRE_PX = 8;

function BeforeAfter({ original, protegida }) {
  const [posicion, setPosicion] = useState(50);
  const marcoRef = useRef(null);
  const tiradorRef = useRef(null);
  // Gesto en curso. Qué puntero es, dónde empezó, dónde estaba la línea y si ya se está arrastrando
  const gestoRef = useRef(null);

  // Ver la explicación de arriba. Va con addEventListener porque React registra touchmove como pasivo y ahí
  // preventDefault no hace nada. Con dos dedos no se toca nada, para que se pueda ampliar la página
  useEffect(() => {
    const marco = marcoRef.current;
    // Dónde empezó el dedo y si el gesto va de lado (true), en vertical (false) o aún no se sabe (null)
    let toque = null;

    const alTocar = (e) => {
      toque = e.touches.length === 1
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, deLado: null }
        : null;
    };

    const alMoverDedo = (e) => {
      if (!toque || e.touches.length !== 1) {
        toque = null;
        return;
      }
      if (toque.deLado === null) {
        const deLado = Math.abs(e.touches[0].clientX - toque.x);
        const enVertical = Math.abs(e.touches[0].clientY - toque.y);
        if (deLado === 0 && enVertical === 0) return;
        toque.deLado = deLado > enVertical;
      }
      if (toque.deLado && e.cancelable) e.preventDefault();
    };

    const alSoltar = () => {
      toque = null;
    };

    marco.addEventListener('touchstart', alTocar, { passive: true });
    marco.addEventListener('touchmove', alMoverDedo, { passive: false });
    marco.addEventListener('touchend', alSoltar);
    marco.addEventListener('touchcancel', alSoltar);
    return () => {
      marco.removeEventListener('touchstart', alTocar);
      marco.removeEventListener('touchmove', alMoverDedo);
      marco.removeEventListener('touchend', alSoltar);
      marco.removeEventListener('touchcancel', alSoltar);
    };
  }, []);

  const moverA = (clientX) => {
    const marco = marcoRef.current.getBoundingClientRect();
    const porcentaje = ((clientX - marco.left) / marco.width) * 100;
    setPosicion(Math.max(0, Math.min(100, porcentaje)));
  };

  const enTirador = (e) => tiradorRef.current.contains(e.target);

  const alPulsar = (e) => {
    const conRaton = e.pointerType === 'mouse';
    if (conRaton && e.button !== 0) return;
    gestoRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, inicial: posicion, arrastrando: conRaton };
    // Con el ratón la línea va al momento al punto pulsado, salvo en el tirador, para que no salte.
    // Con el dedo se espera a ver hacia dónde va
    if (conRaton && !enTirador(e)) moverA(e.clientX);
  };

  const alMover = (e) => {
    const gesto = gestoRef.current;
    if (!gesto || gesto.id !== e.pointerId) return;
    if (!gesto.arrastrando) {
      const deLado = Math.abs(e.clientX - gesto.x);
      const enVertical = Math.abs(e.clientY - gesto.y);
      if (deLado < UMBRAL_ARRASTRE_PX || deLado <= enVertical) return;
      gesto.arrastrando = true;
    }
    moverA(e.clientX);
  };

  const terminar = (e) => {
    if (gestoRef.current?.id === e.pointerId) gestoRef.current = null;
  };

  // El navegador se ha quedado el gesto para mover la página. Si la línea ya se había movido, vuelve a donde estaba
  const alCancelar = (e) => {
    const gesto = gestoRef.current;
    if (!gesto || gesto.id !== e.pointerId) return;
    if (gesto.arrastrando) setPosicion(gesto.inicial);
    gestoRef.current = null;
  };

  // Un toque o un clic sin arrastrar llevan la línea a ese punto, salvo en el tirador.
  // El navegador no manda el clic si el toque solo ha frenado la página
  const alHacerClic = (e) => {
    if (!enTirador(e)) moverA(e.clientX);
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
      ref={marcoRef}
      className="relative w-full aspect-[473/301] overflow-hidden rounded-xl bg-gray-200 cursor-ew-resize touch-pan-y touch-pinch-zoom select-none"
      onPointerDown={alPulsar}
      onPointerMove={alMover}
      onPointerUp={terminar}
      onPointerLeave={(e) => e.pointerType === 'mouse' && terminar(e)}
      onPointerCancel={alCancelar}
      onClick={alHacerClic}
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

      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(17,24,39,0.15)]"
        style={{ left: `${posicion}%` }}
      />
      <div
        ref={tiradorRef}
        role="slider"
        tabIndex={0}
        aria-label="Comparar la foto original con la protegida"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(posicion)}
        aria-valuetext={`${Math.round(posicion)} % de la foto original`}
        onKeyDown={alPulsarTecla}
        className="absolute top-1/2 z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500"
        style={{ left: `${posicion}%` }}
      >
        <i className="bi bi-arrows-expand-vertical text-base" aria-hidden="true"></i>
      </div>
    </div>
  );
}

export default BeforeAfter;
