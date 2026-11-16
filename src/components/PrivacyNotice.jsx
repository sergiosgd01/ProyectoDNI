import React from 'react';
import LegalTable from './legal/LegalTable';
import { LEGAL_INFO, LEGAL_PATHS } from '../content/legal';

// Primera capa de información de protección de datos, junto a donde se sube la foto.
// Los enlaces abren en otra pestaña para no perder las fotos ya subidas.
export default function PrivacyNotice() {
  const privacyLink = (
    <a
      href={LEGAL_PATHS.privacidad}
      target="_blank"
      rel="noopener noreferrer"
      className="text-secondary-600 underline hover:text-secondary-700"
    >
      política de privacidad
    </a>
  );

  const contactLink = (
    <a href={`mailto:${LEGAL_INFO.correoContacto}`} className="text-secondary-600 underline hover:text-secondary-700">
      {LEGAL_INFO.correoContacto}
    </a>
  );

  return (
    <div className="mt-6 max-w-3xl mx-auto text-center text-sm text-gray-600">
      <p>
        <i className="bi bi-shield-lock mr-1.5 text-secondary-600"></i>
        Tu foto se envía cifrada a nuestro servidor solo para recortarla y no se guarda. Más información en la{' '}
        {privacyLink}.
      </p>

      <details className="mt-3 text-left">
        <summary className="cursor-pointer text-center py-2 text-secondary-600 hover:text-secondary-700">
          Información básica sobre protección de datos
        </summary>
        <LegalTable
          headers={['Concepto', 'Texto']}
          rows={[
            [
              'Responsable',
              `${LEGAL_INFO.titular} (${LEGAL_INFO.proyecto.charAt(0).toLowerCase()}${LEGAL_INFO.proyecto.slice(1)})`,
            ],
            [
              'Finalidad',
              'Recortar tu DNI para que puedas tapar los datos que elijas. La foto se envía cifrada a nuestro servidor en Alemania y no se guarda. Guardamos estadísticas de uso y el texto de la marca de agua',
            ],
            ['Legitimación', LEGAL_INFO.legitimacion],
            ['Destinatarios', 'Proveedores técnicos que actúan por nuestra cuenta. No cedemos datos a terceros'],
            ['Derechos', <>Acceso, supresión y el resto de derechos escribiendo a {contactLink}</>],
            ['Más información', privacyLink],
          ]}
        />
      </details>
    </div>
  );
}
