import React from 'react';
import LegalPageLayout, { LegalSection } from '../legal/LegalPageLayout';
import LegalTable from '../legal/LegalTable';
import Fill from '../legal/Fill';
import { LEGAL_INFO } from '../../content/legal';

export default function PrivacidadPage({ onGoHome }) {
  const info = LEGAL_INFO;

  return (
    <LegalPageLayout title="Política de privacidad" onGoHome={onGoHome}>
      <p className="text-lg text-gray-800">
        No guardamos tu foto ni ningún dato de tu DNI. La foto pasa por nuestro servidor en Alemania solo para
        recortarla, y la censura y la marca de agua se hacen en tu navegador.
      </p>

      <LegalSection title="Así se trata tu foto">
        <ol className="list-decimal pl-5 space-y-2">
          <li>Subes la foto de tu DNI o la haces con la cámara.</li>
          <li>
            La foto viaja cifrada a nuestro servidor en Núremberg (Alemania), que la recorta, la endereza y te la
            devuelve. No la guarda.
          </li>
          <li>Tu navegador detecta los campos, tapa los que eliges y añade la marca de agua.</li>
          <li>
            Descargas tu copia. A nuestro servidor de estadísticas solo llegan datos anónimos, nunca el DNI ni la
            foto.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="Responsable del tratamiento">
        <LegalTable
          headers={['Dato', 'Valor']}
          rows={[
            ['Responsable', <Fill>{info.responsable}</Fill>],
            ['NIF', <Fill>{info.nif}</Fill>],
            ['Dirección', <Fill>{info.direccion}</Fill>],
            ['Delegado de Protección de Datos', <Fill>{info.correoDpd}</Fill>],
          ]}
        />
      </LegalSection>

      <LegalSection title="Qué datos tratamos">
        <LegalTable
          headers={['Qué', 'Para qué', 'Dónde', 'Cuánto tiempo']}
          rows={[
            [
              'La foto del DNI que subes o haces con la cámara',
              'Recortar y enderezar el documento',
              'Servidor de la herramienta en Núremberg, Alemania',
              'Solo mientras se procesa, unos segundos. No se guarda',
            ],
            [
              'El texto de algunos campos, leído en tu navegador',
              'Comprobar si la detección funcionó',
              'Solo en tu dispositivo. Al servidor solo llega si cada campo se pudo leer (sí o no), nunca su contenido',
              'No se guarda',
            ],
            [
              'La copia censurada y con marca de agua',
              'Que la descargues',
              'Solo en tu dispositivo',
              'Hasta que cierras la página',
            ],
            [
              'Estadísticas anónimas de uso (perfil elegido, campos tapados, si la censura fue automática o manual, resultados técnicos de la detección y fecha)',
              'Mejorar la herramienta e investigar',
              'Base de datos del proyecto',
              <Fill>{info.plazoEstadisticas}</Fill>,
            ],
            [
              'Tu dirección IP y datos técnicos de la conexión',
              'Mostrar la web y protegerla de ataques',
              'Proveedores de la tabla de destinatarios',
              <Fill>{info.plazoProveedores}</Fill>,
            ],
          ]}
        />
        <p>
          No usamos tu foto para reconocer tu cara, para entrenar modelos de inteligencia artificial ni para tomar
          decisiones automáticas sobre ti. Las estadísticas no incluyen nada que permita identificarte.
        </p>
      </LegalSection>

      <LegalSection title="Base jurídica">
        <p>
          <Fill>[PROPUESTA A VALIDAR POR EL DPD]</Fill> Tratamos la foto y los datos técnicos para cumplir una
          misión de interés público de la Universidad, la investigación y la transferencia de conocimiento
          (artículo 6.1.e del RGPD). Las estadísticas anónimas no son datos personales.
        </p>
      </LegalSection>

      <LegalSection title="Destinatarios y transferencias internacionales">
        <p>
          No vendemos ni cedemos tus datos. Estos proveedores nos prestan servicios técnicos y tratan los datos
          solo por cuenta nuestra.
        </p>
        <LegalTable
          headers={['Proveedor', 'Qué hace', 'Dónde', 'Garantía']}
          rows={[
            [
              'Hetzner Online GmbH',
              'Servidor que recorta la foto',
              'Alemania (UE)',
              <Fill>Contrato de encargado del tratamiento [CONFIRMAR QUE ESTÁ FIRMADO]</Fill>,
            ],
            [
              'Cloudflare, Inc.',
              'Red que entrega la web y la protege. La foto pasa cifrada por ella camino del servidor, sin guardarse',
              'Red mundial',
              <Fill>{info.garantiaEEUU}</Fill>,
            ],
            ['Netlify, Inc.', 'Alojamiento de la web', 'EE. UU. y red mundial', <Fill>{info.garantiaEEUU}</Fill>],
            [
              'Vercel Inc.',
              'Servidor que recibe las estadísticas',
              'EE. UU. (Washington D. C.)',
              <Fill>{info.garantiaEEUU}</Fill>,
            ],
            [
              'MongoDB, Inc. (Atlas)',
              'Base de datos de las estadísticas',
              <Fill>{info.regionAtlas}</Fill>,
              <Fill>{info.garantiaEEUU}</Fill>,
            ],
            [
              'jsDelivr, unpkg, OpenCV y Project Naptha',
              'Descarga de librerías que se ejecutan en tu navegador. Solo reciben tu IP, nunca tus imágenes',
              'Red mundial',
              <Fill>[REVISAR CON EL DPD]</Fill>,
            ],
          ]}
        />
      </LegalSection>

      <LegalSection title="Tus derechos">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
            escribiendo a <Fill>{info.correoDpd}</Fill> o en <Fill>{info.sedeElectronica}</Fill>.
          </li>
          <li>
            Como no guardamos tu foto ni datos que te identifiquen, normalmente no podremos encontrar información
            tuya (artículo 11 del RGPD).
          </li>
          <li>
            Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de
            Datos en{' '}
            <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-primary-700 underline">
              aepd.es
            </a>
            .
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          La web no usa cookies de publicidad ni de analítica y no guarda nada en tu navegador. Cloudflare puede
          usar alguna cookie técnica necesaria para proteger el servicio.{' '}
          <Fill>[CONFIRMAR EN CLOUDFLARE SI HAY ALGUNA FUNCIÓN ACTIVA QUE LAS INSTALE]</Fill>
        </p>
      </LegalSection>

      <LegalSection title="Seguridad">
        <ul className="list-disc pl-5 space-y-2">
          <li>Todas las conexiones van cifradas con HTTPS.</li>
          <li>
            La foto solo existe mientras se procesa y después se borra. Los registros del servidor no guardan ni la
            imagen ni el nombre del archivo.
          </li>
          <li>El panel de administración exige usuario y contraseña comprobados en el servidor.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Menores de 14 años">
        <p>Si tienes menos de 14 años, usa la herramienta con tu madre, tu padre o tu tutor.</p>
      </LegalSection>

      <LegalSection title="Registros anteriores al 12 de noviembre de 2026">
        <p>
          Hasta esa fecha la herramienta también guardaba el número de DNI cifrado y el texto de la marca de agua.{' '}
          <Fill>[DECISIÓN DEL DPD SOBRE ESTOS REGISTROS Y TEXTO PARA INFORMAR DE ELLA]</Fill>
        </p>
      </LegalSection>

      <LegalSection title="Cambios en esta política">
        <p>
          Si cambia el funcionamiento de la herramienta, actualizaremos esta política. Última actualización el{' '}
          <Fill>{info.fechaActualizacion}</Fill>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
