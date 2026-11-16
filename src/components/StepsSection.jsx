import React from 'react';

// Sección «Listo en tres pasos» de la portada, con el botón que abre la subida.
// Cada paso lleva un dibujo pequeño del DNI hecho con HTML, del mismo estilo que la tarjeta de la demo
// (SecuritySection). Dentro de cada dibujo las medidas van en cqw, centésimas de su ancho, así escala entero.
// El banco de pruebas pulsa el botón por su texto, «Subir mi DNI», y la cabecera baja hasta aquí con
// «Cómo funciona» usando upload-section y upload-cta-anchor. Si se cambian, hay que cambiarlos también allí

const PASOS = [
  {
    cara: 'delantera',
    titulo: 'Sube la parte delantera',
    texto: 'Haz la foto con el móvil o elige una que ya tengas.',
  },
  {
    cara: 'trasera',
    titulo: 'Sube la parte trasera',
    texto: 'Igual que la delantera. Hacen falta las dos caras.',
  },
  {
    cara: 'protegida',
    titulo: 'Elige qué tapar y descarga',
    texto: 'Con un perfil o dato a dato. Pon tu marca de agua y descarga la copia.',
  },
];

const PAPEL = 'linear-gradient(118deg, #fbf6ea 0%, #f9efeb 48%, #edf1f6 100%)';
const PAPEL_REVERSO = 'linear-gradient(118deg, #edf1f6 0%, #f9efeb 52%, #fbf6ea 100%)';
const COLOR_ETIQUETA = '#d9d2c4';
const COLOR_VALOR = '#a8a091';
const COLOR_TAPADO = '#111827';

// Rayas que hacen de texto, en cqw. Las etiquetas son finas y claras y los valores, gruesos y oscuros.
// En la cara protegida, los valores marcados con tapar salen en negro
const RAYAS_DELANTERA = [
  { x: 38, y: 17, w: 14, etiqueta: true },
  { x: 38, y: 20.6, w: 44 },
  { x: 38, y: 28, w: 11, etiqueta: true },
  { x: 38, y: 31.6, w: 26, tapar: true },
  { x: 38, y: 39, w: 16, etiqueta: true },
  { x: 38, y: 42.6, w: 36, tapar: true },
  { x: 38, y: 50, w: 12, etiqueta: true },
  { x: 38, y: 53.6, w: 24 },
];

const RAYAS_TRASERA = [
  { x: 6, y: 7, w: 12, etiqueta: true },
  { x: 6, y: 10.6, w: 50 },
  { x: 6, y: 18, w: 15, etiqueta: true },
  { x: 6, y: 21.6, w: 36 },
  { x: 6, y: 29, w: 10, etiqueta: true },
  { x: 6, y: 32.6, w: 44 },
];

// Zona de lectura mecánica del reverso, con los datos del DNI de ejemplo
const MRZ = [
  'IDESPCAA000000099999999R<<<<<<',
  '8001014F3106028ESP<<<<<<<<<<<6',
  'ESPANOLA<ESPANOLA<<CARMEN<<<<<',
];

// Imita la marca de utils/watermark.js, con Arial en negrita, letra blanca con borde oscuro y girada -45°
const FILA_MARCA = 'Solo para el alquiler      '.repeat(4);

function Raya({ x, y, w, etiqueta, color }) {
  return (
    <span
      className="absolute"
      style={{
        left: `${x}cqw`,
        top: `${y}cqw`,
        width: `${w}cqw`,
        height: etiqueta ? '1.8cqw' : '3.4cqw',
        borderRadius: etiqueta ? '0.9cqw' : '0.8cqw',
        background: color,
      }}
    />
  );
}

function MarcaDeAgua() {
  return (
    <div
      className="pointer-events-none absolute flex flex-col justify-center"
      style={{ left: '-60%', top: '-80%', width: '220%', height: '260%', gap: '4.5cqw', transform: 'rotate(-45deg)' }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="whitespace-pre font-bold"
          style={{
            paddingLeft: i % 2 ? '12cqw' : 0,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '4cqw',
            color: 'rgba(255,255,255,0.72)',
            WebkitTextStroke: '0.12cqw rgba(17,24,39,0.45)',
          }}
        >
          {FILA_MARCA}
        </div>
      ))}
    </div>
  );
}

function TarjetaMini({ cara }) {
  const trasera = cara === 'trasera';
  const protegida = cara === 'protegida';
  const rayas = trasera ? RAYAS_TRASERA : RAYAS_DELANTERA;

  return (
    <div
      className="relative w-[70%] aspect-[1.586] overflow-hidden rounded-xl border border-gray-900/10 [container-type:inline-size]"
      style={{
        background: trasera ? PAPEL_REVERSO : PAPEL,
        boxShadow: '0 1px 1px rgba(17,24,39,0.06), 0 14px 28px -14px rgba(17,24,39,0.35)',
      }}
    >
      {!trasera && (
        <>
          <span
            className="absolute"
            style={{ left: '6cqw', top: '6cqw', width: '7cqw', height: '4.6cqw', borderRadius: '0.9cqw', background: 'linear-gradient(90deg, #eaaf0f 50%, #E53338 50%)' }}
          />
          <span
            className="absolute"
            style={{ left: '15.5cqw', top: '7.1cqw', width: '46cqw', height: '2.4cqw', borderRadius: '1.2cqw', background: COLOR_ETIQUETA }}
          />
          <span
            className="absolute overflow-hidden"
            style={{ left: '6cqw', top: '16cqw', width: '26cqw', height: '35cqw', borderRadius: '2.4cqw', background: 'linear-gradient(180deg, #ece7de, #dcd4c6)' }}
          >
            <svg viewBox="0 0 100 132" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 h-full w-full" fill="#c8bfae">
              <circle cx="50" cy="52" r="21" />
              <path d="M10 132 C12 100 30 84 50 84 C70 84 88 100 90 132 Z" />
            </svg>
          </span>
          <svg
            viewBox="0 0 120 40"
            className="absolute"
            style={{ left: '6cqw', top: '53cqw', width: '26cqw', height: '7cqw' }}
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 30 C14 10 22 8 24 22 S30 34 38 18 S48 6 52 20 S60 30 66 16 C70 8 78 10 76 22 S86 30 96 14 L114 12" />
          </svg>
        </>
      )}

      {rayas.map((raya) => (
        <Raya
          key={`${raya.x}-${raya.y}`}
          x={raya.x}
          y={raya.y}
          w={raya.w}
          etiqueta={raya.etiqueta}
          color={raya.etiqueta ? COLOR_ETIQUETA : protegida && raya.tapar ? COLOR_TAPADO : COLOR_VALOR}
        />
      ))}

      {trasera && (
        <div
          className="absolute flex flex-col overflow-hidden whitespace-nowrap font-mono text-gray-600"
          style={{ left: '6cqw', right: '6cqw', top: '41cqw', gap: '1.6cqw', fontSize: '3.3cqw', lineHeight: 1, letterSpacing: '0.06em' }}
        >
          {MRZ.map((linea) => <span key={linea}>{linea}</span>)}
        </div>
      )}

      {protegida && (
        <>
          <span
            className="absolute"
            style={{ left: '5.5cqw', top: '53.5cqw', width: '27cqw', height: '6cqw', borderRadius: '0.8cqw', background: COLOR_TAPADO }}
          />
          <MarcaDeAgua />
        </>
      )}
    </div>
  );
}

function StepsSection({ onStartProcess }) {
  return (
    <section id="upload-section" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 text-balance">
          Listo en tres pasos
        </h2>
        <p className="mt-3.5 max-w-xl text-lg leading-relaxed text-gray-600 text-pretty">
          Sube las dos caras de tu DNI, elige qué se ve y descarga la copia protegida.
        </p>

        {/* Una columna en el móvil y tres desde 768 px, para que el tercer paso nunca se quede solo en otra fila */}
        <ol className="mt-9 lg:mt-14 grid grid-cols-1 md:grid-cols-3 gap-x-4 lg:gap-x-6 gap-y-8">
          {PASOS.map((paso, index) => (
            <li key={paso.cara} className="flex min-w-0 flex-col">
              <div
                aria-hidden="true"
                className="relative flex aspect-[16/9] md:aspect-[16/11] items-center justify-center overflow-hidden rounded-[20px] bg-gray-100"
              >
                {paso.cara === 'protegida' ? (
                  <span className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white">
                    <i className="bi bi-check-lg text-lg leading-none"></i>
                  </span>
                ) : (
                  <span className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900">
                    <i className="bi bi-upload text-base leading-none"></i>
                  </span>
                )}
                <TarjetaMini cara={paso.cara} />
              </div>
              <div className="flex flex-col gap-1.5 px-1 pt-[18px]">
                <span className="font-mono text-xs font-semibold tracking-[0.1em] text-secondary-600">PASO {index + 1}</span>
                <h3 className="text-[19px] font-semibold leading-snug tracking-[-0.01em] text-gray-900">{paso.titulo}</h3>
                <p className="text-[15.5px] leading-relaxed text-gray-600 text-pretty">{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>

        <div id="upload-cta-anchor" className="mt-9 lg:mt-12 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="button" onClick={onStartProcess} className="btn btn-principal w-full sm:w-auto px-7 shadow-sm">
            <i className="bi bi-upload text-lg" aria-hidden="true"></i>
            Subir mi DNI
          </button>
          <span className="w-full sm:w-auto text-center sm:text-left text-sm text-gray-500">Gratis y sin registro</span>
        </div>
      </div>
    </section>
  );
}

export default StepsSection;
