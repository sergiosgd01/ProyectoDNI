import React, { useMemo, useState } from 'react';
import { DNI_PROFILES } from '../../shared/constants/dniProfiles';

// Sección de la portada que explica la herramienta con una demo que se puede tocar.
// Sustituye a «Características principales» y «¿Por qué elegirnos?», que repetían ideas (UX-14, punto 13).
// La tarjeta es un DNI de ejemplo dibujado con HTML. No se sube ni se procesa ninguna foto, y la marca de
// agua que se escribe aquí no sale del navegador ni cuenta en las métricas.
// Dentro de la tarjeta las medidas van en cqw (centésimas del ancho de la tarjeta), así todo escala junto
// y se ve igual en el móvil que en el ordenador.

// Datos del anverso que se pueden tapar en la demo, con la misma clave que usan los perfiles.
// El CAN no sale porque la tarjeta de ejemplo no lo dibuja y todos los perfiles lo tapan
const CAMPOS = [
  { clave: 'nombre', nombre: 'Nombre' },
  { clave: 'apellidos', nombre: 'Apellidos' },
  { clave: 'dni', nombre: 'N.º de DNI' },
  { clave: 'sexo', nombre: 'Sexo' },
  { clave: 'nacionalidad', nombre: 'Nacionalidad' },
  { clave: 'fechaNacimiento', nombre: 'Nacimiento' },
  { clave: 'fechaExpedicion', nombre: 'Expedición' },
  { clave: 'fechaCaducidad', nombre: 'Validez' },
  { clave: 'numeroSoporte', nombre: 'Soporte' },
  { clave: 'firma', nombre: 'Firma' },
];

// Perfiles de la demo, con un nombre corto que quepa en el botón. Lo que tapa cada uno sale de
// dniProfiles.js, el mismo archivo que usa el editor, así la demo no se queda atrás si cambian.
// Administrativo no sale porque en el anverso tapa lo mismo que Salud (solo cambia el reverso),
// así que su botón no cambiaría nada en la tarjeta
const PERFILES = [
  { id: 'viajes', nombre: 'Viajes' },
  { id: 'salud', nombre: 'Salud' },
  { id: 'financiero', nombre: 'Banca' },
]
  .map((perfil) => ({ ...perfil, datos: DNI_PROFILES.getProfileById(perfil.id) }))
  .filter((perfil) => perfil.datos);

const PERFIL_INICIAL = PERFILES[0] ?? null;
const MARCA_INICIAL = 'Solo para el alquiler';
const MARCA_MAXIMO = 40; // El mismo límite que WatermarkInput

function tapadosDelPerfil(perfil) {
  const tapados = {};
  CAMPOS.forEach(({ clave }) => {
    tapados[clave] = Boolean(perfil.datos.frontFields?.[clave]);
  });
  return tapados;
}

// El perfil que tapa justo esos datos, o null si la combinación está hecha a mano
function perfilQueCoincide(tapados) {
  const perfil = PERFILES.find((p) => {
    const delPerfil = tapadosDelPerfil(p);
    return CAMPOS.every(({ clave }) => delPerfil[clave] === Boolean(tapados[clave]));
  });
  return perfil ? perfil.id : null;
}

// Fondo de la tarjeta y rayas onduladas, como el papel de seguridad del DNI
const FONDO_PAPEL = 'linear-gradient(118deg, #fbf6ea 0%, #f9efeb 48%, #edf1f6 100%)';
const GUILLOCHE = [
  'M-40 30 C20 16 80 44 140 30 S260 44 320 30 S440 44 500 30 S620 44 680 30',
  'M-70 62 C-10 44 50 80 110 62 S230 80 290 62 S410 80 470 62 S590 80 650 62',
  'M-100 94 C-40 72 20 116 80 94 S200 116 260 94 S380 116 440 94 S560 116 620 94',
  'M-40 126 C20 112 80 140 140 126 S260 140 320 126 S440 140 500 126 S620 140 680 126',
  'M-70 158 C-10 140 50 176 110 158 S230 176 290 158 S410 176 470 158 S590 176 650 158',
  'M-100 190 C-40 168 20 212 80 190 S200 212 260 190 S380 212 440 190 S560 212 620 190',
  'M-40 222 C20 208 80 236 140 222 S260 236 320 222 S440 236 500 222 S620 236 680 222',
  'M-70 254 C-10 236 50 272 110 254 S230 272 290 254 S410 272 470 254 S590 272 650 254',
  'M-100 286 C-40 264 20 308 80 286 S200 308 260 286 S380 308 440 286 S560 308 620 286',
];

// Barra negra que tapa un dato. Crece de izquierda a derecha al taparlo
const BARRA = 'absolute bg-gray-900 transition-[width] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none';

function Valor({ tapado, className = '', style, children }) {
  return (
    <span className={`relative font-mono ${className}`} style={style}>
      {children}
      <span
        className={`${BARRA} top-1/2 -translate-y-1/2`}
        style={{ left: '-0.15em', height: '1.12em', width: tapado ? 'calc(100% + 0.3em)' : '0px', borderRadius: '0.1em' }}
      />
    </span>
  );
}

function Dato({ etiqueta, valor, tapado }) {
  return (
    <div className="flex flex-col" style={{ gap: '0.35cqw' }}>
      <span className="font-bold text-gray-600" style={{ fontSize: '1.75cqw', letterSpacing: '0.07em' }}>
        {etiqueta}
      </span>
      <Valor
        tapado={tapado}
        className="self-start font-semibold text-gray-800"
        style={{ fontSize: '3.1cqw', lineHeight: 1.15 }}
      >
        {valor}
      </Valor>
    </div>
  );
}

function TarjetaEjemplo({ tapados, marca }) {
  const texto = marca.trim();
  const lineasMarca = useMemo(() => {
    if (!texto) return [];
    const fila = `${texto}\u2003\u2003\u2003`.repeat(8);
    return Array.from({ length: 14 }, (_, i) => ({ fila, sangria: i % 2 ? '9cqw' : '0' }));
  }, [texto]);

  return (
    <div
      aria-hidden="true"
      className="relative w-full max-w-[500px] aspect-[1.586] overflow-hidden rounded-2xl border border-gray-900/10 [container-type:inline-size]"
      style={{ background: FONDO_PAPEL, boxShadow: '0 1px 1px rgba(17,24,39,0.06), 0 22px 44px -20px rgba(17,24,39,0.38)' }}
    >
      <svg
        viewBox="0 0 500 315"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        fill="none"
        stroke="#b98a2e"
        strokeOpacity="0.2"
        strokeWidth="0.7"
      >
        {GUILLOCHE.map((d) => <path key={d} d={d} />)}
      </svg>

      <div className="absolute flex items-center" style={{ left: '5cqw', right: '5cqw', top: '4.4cqw', gap: '2cqw' }}>
        <span
          className="flex-none"
          style={{ width: '5.6cqw', height: '3.8cqw', borderRadius: '0.6cqw', background: 'linear-gradient(90deg, #eaaf0f 50%, #E53338 50%)' }}
        />
        <span className="whitespace-nowrap font-bold text-gray-700" style={{ fontSize: '2.15cqw', letterSpacing: '0.14em' }}>
          DOCUMENTO NACIONAL DE IDENTIDAD
        </span>
      </div>

      <div className="absolute flex items-baseline" style={{ left: '35cqw', top: '11.2cqw', gap: '1.6cqw' }}>
        <span className="font-bold text-gray-600" style={{ fontSize: '1.9cqw', letterSpacing: '0.08em' }}>DNI</span>
        <Valor
          tapado={tapados.dni}
          className="font-bold text-gray-900"
          style={{ fontSize: '4.4cqw', lineHeight: 1.1, letterSpacing: '0.03em' }}
        >
          99999999R
        </Valor>
      </div>

      <div
        className="absolute overflow-hidden"
        style={{ left: '5cqw', top: '12.6cqw', width: '25cqw', height: '33cqw', borderRadius: '1.6cqw', background: 'linear-gradient(180deg, #ece7de, #dcd4c6)' }}
      >
        <svg viewBox="0 0 100 132" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 h-full w-full" fill="#c8bfae">
          <circle cx="50" cy="52" r="21" />
          <path d="M10 132 C12 100 30 84 50 84 C70 84 88 100 90 132 Z" />
        </svg>
      </div>

      <div className="absolute flex flex-col" style={{ left: '35cqw', right: '5cqw', top: '19.6cqw', gap: '1.45cqw' }}>
        <Dato etiqueta="APELLIDOS" valor="ESPAÑOLA ESPAÑOLA" tapado={tapados.apellidos} />
        <Dato etiqueta="NOMBRE" valor="CARMEN" tapado={tapados.nombre} />
        <div className="flex" style={{ gap: '4cqw' }}>
          <Dato etiqueta="SEXO" valor="F" tapado={tapados.sexo} />
          <Dato etiqueta="NACIONALIDAD" valor="ESP" tapado={tapados.nacionalidad} />
          <Dato etiqueta="NACIMIENTO" valor="01 01 1980" tapado={tapados.fechaNacimiento} />
        </div>
        <div className="flex" style={{ gap: '4cqw' }}>
          <Dato etiqueta="EXPEDICIÓN" valor="02 06 2021" tapado={tapados.fechaExpedicion} />
          <Dato etiqueta="VALIDEZ" valor="02 06 2031" tapado={tapados.fechaCaducidad} />
        </div>
        <Dato etiqueta="NÚM. SOPORTE" valor="CAA000000" tapado={tapados.numeroSoporte} />
      </div>

      <div className="absolute" style={{ left: '5cqw', top: '48.2cqw', width: '25cqw', height: '9.6cqw' }}>
        <svg
          viewBox="0 0 120 40"
          className="absolute inset-0 h-full w-full"
          fill="none"
          stroke="#1f2937"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 30 C14 10 22 8 24 22 S30 34 38 18 S48 6 52 20 S60 30 66 16 C70 8 78 10 76 22 S86 30 96 14 L114 12" />
        </svg>
        <span
          className={BARRA}
          style={{ left: '-2%', top: '8%', height: '84%', width: tapados.firma ? '104%' : '0%', borderRadius: '0.5cqw' }}
        />
      </div>

      {/* Imita la marca de utils/watermark.js, con Arial en negrita, letra blanca con borde oscuro y girada -45° */}
      {lineasMarca.length > 0 && (
        <div
          className="pointer-events-none absolute flex flex-col justify-center"
          style={{ left: '-50%', top: '-50%', width: '200%', height: '200%', gap: '5.2cqw', transform: 'rotate(-45deg)' }}
        >
          {lineasMarca.map((linea, i) => (
            <div
              key={i}
              className="whitespace-nowrap font-bold"
              style={{
                paddingLeft: linea.sangria,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '3cqw',
                color: 'rgba(255,255,255,0.62)',
                WebkitTextStroke: '0.09cqw rgba(17,24,39,0.42)',
              }}
            >
              {linea.fila}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// onStartProcess abre la subida. En la página de subida no se pasa y el botón no sale,
// porque la subida ya está justo encima
function SecuritySection({ onStartProcess }) {
  const [perfil, setPerfil] = useState(PERFIL_INICIAL?.id ?? null);
  const [tapados, setTapados] = useState(() => (PERFIL_INICIAL ? tapadosDelPerfil(PERFIL_INICIAL) : {}));
  const [marca, setMarca] = useState(MARCA_INICIAL);

  const elegirPerfil = (p) => {
    setPerfil(p.id);
    setTapados(tapadosDelPerfil(p));
  };

  const alternarDato = (clave) => {
    const nuevos = { ...tapados, [clave]: !tapados[clave] };
    setTapados(nuevos);
    setPerfil(perfilQueCoincide(nuevos));
  };

  const perfilActivo = PERFILES.find((p) => p.id === perfil);
  const totalTapados = CAMPOS.filter(({ clave }) => tapados[clave]).length;
  const cuenta = totalTapados === 1
    ? `1 dato tapado de ${CAMPOS.length}`
    : `${totalTapados} datos tapados de ${CAMPOS.length}`;

  return (
    <section className="bg-gray-100 py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 text-balance">
          Tú eliges qué se ve
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-600 text-pretty">
          Pruébalo con este DNI de ejemplo. Elige un perfil o pulsa cada dato para taparlo, y escribe para qué es la copia.
        </p>

        <div className="mt-8 lg:mt-11 flex flex-wrap overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="flex min-w-0 flex-[1_1_540px] items-center justify-center bg-[#eceef1] p-5 sm:p-8 lg:p-12">
            <div className="flex w-full max-w-[500px] flex-col gap-4">
              <span className="self-start rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                DNI de ejemplo
              </span>
              <TarjetaEjemplo tapados={tapados} marca={marca} />
              <p className="self-center text-sm text-gray-600" aria-live="polite">{cuenta}</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-7 p-5 sm:p-7 lg:p-9">
            <div className="flex flex-col gap-2.5">
              <span id="demo-perfil" className="text-[13px] font-semibold text-gray-900">Perfil</span>
              <div role="group" aria-labelledby="demo-perfil" className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
                {PERFILES.map((p) => {
                  const activo = perfil === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => elegirPerfil(p)}
                      className={`btn btn-sm w-full rounded-[9px] px-2 text-[15px] font-semibold ${
                        activo
                          ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5'
                          : 'bg-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {p.nombre}
                    </button>
                  );
                })}
              </div>
              <p className="text-[13px] leading-snug text-gray-600">
                {perfilActivo ? `${perfilActivo.datos.description}.` : 'Personalizado. Has elegido los datos a mano.'}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <span id="demo-datos" className="text-[13px] font-semibold text-gray-900">Datos tapados</span>
              <div role="group" aria-labelledby="demo-datos" className="flex flex-wrap gap-2">
                {CAMPOS.map(({ clave, nombre }) => {
                  const tapado = Boolean(tapados[clave]);
                  return (
                    <button
                      key={clave}
                      type="button"
                      aria-pressed={tapado}
                      onClick={() => alternarDato(clave)}
                      className={`btn btn-sm rounded-[10px] border ${
                        tapado
                          ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <span aria-hidden="true" className={`h-[7px] w-3.5 flex-none rounded-sm ${tapado ? 'bg-white' : 'bg-gray-300'}`} />
                      {nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <label htmlFor="demo-marca" className="text-[13px] font-semibold text-gray-900">Marca de agua</label>
              <input
                id="demo-marca"
                type="text"
                value={marca}
                maxLength={MARCA_MAXIMO}
                autoComplete="off"
                onChange={(e) => setMarca(e.target.value.slice(0, MARCA_MAXIMO))}
                placeholder="Escribe para qué es la copia"
                className="min-h-[3rem] w-full rounded-xl border border-gray-300 bg-white px-3.5 text-base text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100"
              />
              <p className="text-[13px] text-gray-600">Se repite en diagonal sobre la imagen.</p>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-x-5 gap-y-3.5 border-t border-gray-200 pt-6">
              <p className="flex-[1_1_200px] text-sm leading-normal text-gray-600">
                Sin cuenta y sin pagar. Descarga cada cara en JPG o las dos en un PDF.
              </p>
              {onStartProcess && (
                <button type="button" onClick={onStartProcess} className="btn btn-principal">
                  <i className="bi bi-upload text-lg" aria-hidden="true"></i>
                  Subir mi DNI
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex max-w-3xl items-start gap-3">
          <i className="bi bi-lock mt-0.5 text-lg leading-none text-gray-900" aria-hidden="true"></i>
          <p className="text-[15px] leading-relaxed text-gray-600">
            <strong className="font-semibold text-gray-900">Tu foto no se guarda.</strong> Solo pasa por nuestro servidor, cifrada,
            para recortarla y enderezarla. Detectar, tapar y marcar los datos ocurre en tu navegador.
          </p>
        </div>
      </div>
    </section>
  );
}

export default SecuritySection;
