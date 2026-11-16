import React from 'react';

// Aviso de error dentro de la página, en lugar de alert(). Con role="alert" el lector de pantalla lo lee al
// aparecer. data-aviso dice de qué aviso se trata ("archivo-no-valido", "limite-subidas", "esquinas"...),
// para que el banco de pruebas lo reconozca sin depender del texto. oscuro es para las ventanas con fondo negro
export default function Aviso({ tipo, titulo, children, onCerrar, oscuro = false, className = '' }) {
  const colores = oscuro
    ? 'bg-red-950/90 border-red-500/60 text-red-50'
    : 'bg-red-50 border-red-200 text-red-900';

  return (
    <div
      role="alert"
      data-aviso={tipo}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm text-left shadow-sm ${colores} ${className}`}
    >
      <i className="bi bi-exclamation-triangle-fill mt-0.5 text-base" aria-hidden="true"></i>
      <div className="flex-1 min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <p className={titulo ? 'mt-0.5' : ''}>{children}</p>
      </div>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className={`-mr-1 -mt-0.5 p-1 rounded-md transition-colors ${oscuro ? 'hover:bg-white/10' : 'hover:bg-red-100'}`}
        >
          <i className="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      )}
    </div>
  );
}
