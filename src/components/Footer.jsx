import React from 'react';
import EnlaceVista from './EnlaceVista';
import { VIEWS } from '../constants/views';
import { LEGAL_PATHS } from '../content/legal';

const ENLACE = 'text-gray-400 hover:text-white transition-colors';

// Logos de la financiación. Son una sola imagen de 4678 x 410 px con los cuatro en fila: Unión Europea, Gobierno de
// España, Plan de Recuperación e INCIBE. En el ordenador va entera. En el móvil, entera, cada logo medía unos 80 px
// de ancho y no se leía, así que se reparte en dos filas recortando la misma imagen, con el mismo orden y la misma
// escala para todos. En tres filas (UX-15) el recuadro medía unos 220 px de alto y se veía desproporcionado. Las
// medidas son píxeles de la imagen. El trozo de la Unión Europea llega hasta 1020 para dejar un hueco blanco antes
// del Gobierno, y la primera fila, la más ancha, ocupa todo el ancho del recuadro
const LOGOS = { src: '/footer_incibe.jpg', ancho: 4678, alto: 410, y0: 60, y1: 350 };
const FILAS_LOGOS = [
  [[60, 1020], [1396, 2966]],
  [[3036, 3682], [3746, 4624]],
];
const ANCHO_MAYOR = (1020 - 60) + (2966 - 1396);
const TEXTO_LOGOS = 'Financiado por la Unión Europea, NextGenerationEU. Gobierno de España, Ministerio para la Transformación '
  + 'Digital y de la Función Pública. Plan de Recuperación, Transformación y Resiliencia. INCIBE, Instituto Nacional de '
  + 'Ciberseguridad';

// Un trozo de la imagen de los logos, de x0 a x1 y de LOGOS.y0 a LOGOS.y1, como fondo de un recuadro con su proporción
function TrozoLogos({ x0, x1 }) {
  const { src, ancho, alto, y0, y1 } = LOGOS;
  const w = x1 - x0;
  const h = y1 - y0;
  return (
    <span
      aria-hidden="true"
      className="block"
      style={{
        width: `${(w / ANCHO_MAYOR) * 100}%`,
        aspectRatio: `${w} / ${h}`,
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${(ancho / w) * 100}% ${(alto / h) * 100}%`,
        backgroundPosition: `${(x0 / (ancho - w)) * 100}% ${(y0 / (alto - h)) * 100}%`,
      }}
    />
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      {/* En el móvil, menos aire arriba, abajo y entre bloques que en el ordenador, que queda igual */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-16">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white p-1.5">
                <img src="/logo-web.png" alt="" className="h-full w-full object-contain" />
              </span>
              <span className="text-xl font-bold tracking-tight text-white">Protege tu identidad</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed">
              La herramienta gratuita para proteger tu documento de identidad antes de compartirlo.
            </p>
          </div>

          <div className="max-w-md md:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">Financiado por Next Generation EU</p>
            <p className="mt-3 text-xs leading-relaxed">
              Iniciativa del Plan de Recuperación, Transformación y Resiliencia, financiada por la UE en el proyecto C108/23 «Detección de Falsificación de Documentos mediante IA».
            </p>
            {/* object-contain para que no se aplaste. Con h-14 y sin él, al no caber a lo ancho se estrechaba sin bajar
                el alto, un 5 % en el ordenador y un 29 % en el móvil */}
            <img src={LOGOS.src} alt={TEXTO_LOGOS} className="mt-4 hidden md:inline-block h-14 w-auto max-w-full object-contain rounded-lg bg-white p-2" />
            <div role="img" aria-label={TEXTO_LOGOS} className="mt-4 flex flex-col items-center gap-2 rounded-lg bg-white p-3 md:hidden">
              {FILAS_LOGOS.map((fila) => (
                <div key={fila[0][0]} className="flex w-full justify-center">
                  {fila.map(([x0, x1]) => <TrozoLogos key={x0} x0={x0} x1={x1} />)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-12 flex flex-col gap-4 border-t border-gray-800 pt-6 text-xs md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Protege tu identidad. Todos los derechos reservados.</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Información legal">
            <EnlaceVista view={VIEWS.AVISO_LEGAL} href={LEGAL_PATHS.avisoLegal} className={ENLACE}>Aviso legal</EnlaceVista>
            <EnlaceVista view={VIEWS.PRIVACIDAD} href={LEGAL_PATHS.privacidad} className={ENLACE}>Política de privacidad</EnlaceVista>
          </nav>
          <p className="flex items-center gap-2">
            <i className="bi bi-shield-lock" aria-hidden="true"></i>
            Tus fotos no se guardan
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
