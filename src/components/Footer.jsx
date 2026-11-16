import React from 'react';
import EnlaceVista from './EnlaceVista';
import { VIEWS } from '../constants/views';
import { LEGAL_PATHS } from '../content/legal';

const ENLACE = 'text-gray-400 hover:text-white transition-colors';

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-16">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white p-1.5">
                <img src="/logo-web.png" alt="" className="h-full w-full object-contain" />
              </span>
              <span className="text-xl font-bold tracking-tight text-white">Protector DNI</span>
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
            <img src="/footer_incibe.jpg" alt="Logo INCIBE" className="mt-4 inline-block h-14 w-auto rounded-lg bg-white p-2" />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-gray-800 pt-6 text-xs md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Protector DNI. Todos los derechos reservados.</p>
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
