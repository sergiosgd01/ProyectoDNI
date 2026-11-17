import React, { useState } from 'react';
import Aviso from './Aviso';
import { A4, NOMBRES_COPIA, describirCopia } from '../utils/copiaProtegida';

// Zona de descarga del editor, bajo el resultado. Sergio la eligió el 17/11/2026 entre tres propuestas del lienzo de
// diseño («Compartir primero»). Lleva la ficha de la copia, con la hoja en pequeño y su marca de agua, «Descargar PDF»
// y «Compartir» y el resto de formatos en «Más formatos». copia sale de useCopiaProtegida

// Rueda pequeña en un botón mientras se prepara su archivo
function Girando() {
  return <span className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
}

// Lo que se hace con la copia. En el ordenador va en esta zona, con «Descargar PDF» como principal. En el móvil y la
// tableta va en la barra fija de abajo (ver DNIEditor) con compartirPrimero, porque allí lo normal es mandarla por
// WhatsApp o por correo. «Compartir» solo sale si el navegador puede compartir el PDF, y si no, queda la descarga
export function AccionesCopia({ copia, compartirPrimero = false, className = '' }) {
  const ocupado = Boolean(copia.ocupado);
  const descargar = (
    <button
      type="button"
      onClick={copia.descargarPdf}
      disabled={ocupado}
      className={`btn ${copia.puedeCompartir && compartirPrimero ? 'btn-secundario' : 'btn-principal'} flex-1 px-3`}
    >
      {copia.ocupado === 'pdf' ? <Girando /> : <i className="bi bi-download text-lg" aria-hidden="true"></i>}
      Descargar PDF
    </button>
  );
  const compartir = copia.puedeCompartir && (
    <button
      type="button"
      onClick={copia.compartir}
      disabled={ocupado}
      className={`btn ${compartirPrimero ? 'btn-principal' : 'btn-secundario'} flex-1 px-3`}
    >
      {copia.ocupado === 'compartir' ? <Girando /> : <i className="bi bi-share text-lg" aria-hidden="true"></i>}
      Compartir
    </button>
  );
  return (
    <div className={`flex gap-3 ${className}`}>
      {compartirPrimero ? <>{compartir}{descargar}</> : <>{descargar}{compartir}</>}
    </div>
  );
}

// La hoja del PDF en pequeño, con cada cara donde la pone disponerEnA4. Mientras se prepara se ve la hoja en blanco
const ANCHO_MINIATURA = 96;

function MiniaturaHoja({ miniatura }) {
  const escala = ANCHO_MINIATURA / A4.ancho;
  const sitios = miniatura?.disposicion.caras ?? [];
  return (
    <div
      aria-hidden="true"
      className="relative flex-none overflow-hidden border border-gray-300 bg-white shadow-sm"
      style={{ width: ANCHO_MINIATURA, height: Math.round(A4.alto * escala) }}
    >
      {miniatura?.imagenes.map((src, i) => sitios[i]?.pagina === 1 && (
        <img
          key={i}
          src={src}
          alt=""
          className="absolute max-w-none"
          style={{
            left: sitios[i].x * escala,
            top: sitios[i].y * escala,
            width: sitios[i].ancho * escala,
            height: sitios[i].alto * escala
          }}
        />
      ))}
    </div>
  );
}

export default function ZonaDescarga({ copia, marca }) {
  const [abierto, setAbierto] = useState(false);
  const paginas = copia.miniatura?.disposicion.paginas ?? 1;
  const formatos = copia.hayTrasera
    ? [
      { id: 'dosCaras', texto: 'Las dos caras en una imagen', accion: copia.descargarDosCaras },
      { id: 'delantera', texto: 'Solo la parte delantera', accion: () => copia.descargarCara('delantera') },
      { id: 'trasera', texto: 'Solo la parte trasera', accion: () => copia.descargarCara('trasera') }
    ]
    : [{ id: 'delantera', texto: 'La parte delantera en una imagen', accion: () => copia.descargarCara('delantera') }];

  return (
    <section aria-labelledby="titulo-copia" className="flex flex-col gap-4 border-t border-gray-200 pt-5">
      <div className="flex items-start gap-4 sm:gap-5">
        <MiniaturaHoja miniatura={copia.miniatura} />
        <div className="flex min-w-0 flex-col gap-1.5 pt-1">
          <h4 id="titulo-copia" className="text-base font-semibold leading-snug text-gray-900 sm:text-lg">
            Tu copia protegida
          </h4>
          <p className="font-mono text-xs text-gray-500 sm:text-[13px]">
            {/* Con espacios que no parten la línea entre el número y la palabra */}
            {NOMBRES_COPIA.pdf} · A4 · {paginas === 1 ? '1\u00a0página' : `${paginas}\u00a0páginas`}
          </p>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-gray-600 sm:text-[15px]">
            {describirCopia({ hayTrasera: copia.hayTrasera, paginas, marca })}
          </p>
        </div>
      </div>

      {/* En el móvil y la tableta estos botones y su aviso van en la barra fija de abajo */}
      <AccionesCopia copia={copia} className="hidden lg:flex" />
      {copia.aviso && (
        <Aviso tipo="copia" onCerrar={copia.cerrarAviso} className="hidden lg:flex">
          {copia.aviso}
        </Aviso>
      )}

      <div>
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls="mas-formatos"
          onClick={() => setAbierto((antes) => !antes)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md text-[15px] font-semibold text-gray-900 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500"
        >
          Más formatos
          <i className={`bi bi-chevron-down text-sm transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} aria-hidden="true"></i>
        </button>
        {abierto && (
          <ul id="mas-formatos" className="border-t border-gray-900">
            {formatos.map((formato) => (
              <li key={formato.id} className="border-b border-gray-200">
                <button
                  type="button"
                  onClick={formato.accion}
                  disabled={Boolean(copia.ocupado)}
                  className="flex min-h-[52px] w-full items-center gap-4 pr-1 text-left text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary-500 disabled:opacity-60"
                >
                  <span className="w-9 flex-none font-mono text-xs font-semibold tracking-wide text-gray-500">JPG</span>
                  <span className="min-w-0 flex-1 text-[15px]">{formato.texto}</span>
                  {copia.ocupado === formato.id
                    ? <Girando />
                    : <i className="bi bi-download text-gray-600" aria-hidden="true"></i>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
