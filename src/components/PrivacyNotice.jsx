import React from 'react';
import LegalTable from './legal/LegalTable';
import Fill from './legal/Fill';
import { LEGAL_INFO, LEGAL_PATHS } from '../content/legal';

// Primera capa de información de protección de datos, junto a donde se sube la foto.
// Los enlaces abren en otra pestaña para no perder las fotos ya subidas.
export default function PrivacyNotice() {
  const privacyLink = (
    <a
      href={LEGAL_PATHS.privacidad}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary-700 underline hover:text-primary-800"
    >
      política de privacidad
    </a>
  );

  return (
    <div className="mt-6 max-w-3xl mx-auto text-center text-sm text-gray-600">
      <p>
        <i className="bi bi-shield-lock mr-1.5 text-primary-600"></i>
        Tu foto se envía cifrada a nuestro servidor solo para recortarla y no se guarda. Más información en la{' '}
        {privacyLink}.
      </p>

      <details className="mt-3 text-left">
        <summary className="cursor-pointer text-center text-primary-700 hover:text-primary-800">
          Información básica sobre protección de datos
        </summary>
        <LegalTable
          headers={['Concepto', 'Texto']}
          rows={[
            ['Responsable', <Fill>{LEGAL_INFO.responsable}</Fill>],
            [
              'Finalidad',
              'Recortar tu DNI para que puedas tapar los datos que elijas. La foto se envía cifrada a nuestro servidor en Alemania y no se guarda',
            ],
            ['Legitimación', <Fill>{LEGAL_INFO.legitimacion}</Fill>],
            ['Destinatarios', 'Proveedores técnicos que actúan por nuestra cuenta. No cedemos datos a terceros'],
            [
              'Derechos',
              <>
                Acceso, supresión y el resto de derechos escribiendo a <Fill>{LEGAL_INFO.correoDpd}</Fill>
              </>,
            ],
            ['Más información', privacyLink],
          ]}
        />
      </details>
    </div>
  );
}
