import React from 'react';
import LegalPageLayout, { LegalSection } from '../legal/LegalPageLayout';
import LegalTable from '../legal/LegalTable';
import { LEGAL_INFO } from '../../content/legal';

export default function PrivacidadPage({ onGoHome }) {
  const info = LEGAL_INFO;

  const contactLink = info.correoContacto && (
    <a href={`mailto:${info.correoContacto}`} className="text-primary-700 underline">
      {info.correoContacto}
    </a>
  );

  const responsableRows = [
    ['Responsable', info.titular],
    ['Proyecto', info.proyecto],
    ['NIF', info.nif],
    ['Dirección', info.direccion],
    ['Contacto', contactLink],
    ['Delegado de Protección de Datos', info.correoDpd],
  ].filter(([, value]) => value);

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
            Descargas tu copia. A nuestro servidor de estadísticas solo llegan datos de uso y el texto de la marca de
            agua, nunca el DNI ni la foto.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="Responsable del tratamiento">
        <LegalTable headers={['Dato', 'Valor']} rows={responsableRows} />
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
              info.plazoEstadisticas,
            ],
            [
              'El texto que escribes en la marca de agua. Te pedimos que no pongas datos personales en él',
              'Saber para qué se usan las copias del DNI y mejorar la herramienta',
              'Base de datos del proyecto',
              info.plazoEstadisticas,
            ],
            [
              'Tu dirección IP y datos técnicos de la conexión',
              'Mostrar la web y protegerla de ataques',
              'Proveedores de la tabla de destinatarios',
              info.plazoProveedores,
            ],
          ]}
        />
        <p>
          No usamos tu foto para reconocer tu cara, para entrenar modelos de inteligencia artificial ni para tomar
          decisiones automáticas sobre ti. Las estadísticas no incluyen tu foto ni ningún dato de tu DNI. El texto
          de la marca de agua se guarda tal como lo escribes, así que no pongas en él tu nombre, tu dirección ni
          otros datos personales.
        </p>
      </LegalSection>

      <LegalSection title="Base jurídica">
        <p>
          Tratamos la foto para prestarte el servicio que pides al usar la herramienta (artículo 6.1.b del RGPD).
          Los datos técnicos de la conexión se tratan para mantener la web segura, y el texto de la marca de agua
          para fines estadísticos y de investigación (artículo 6.1.f del RGPD).
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
            ['Hetzner Online GmbH', 'Servidor que recorta la foto', 'Alemania (UE)', 'Proveedor de la UE sujeto al RGPD'],
            [
              'Cloudflare, Inc.',
              'Red que entrega la web y la protege. La foto pasa cifrada por ella camino del servidor, sin guardarse',
              'Red mundial',
              info.garantiaEEUU,
            ],
            ['Netlify, Inc.', 'Alojamiento de la web', 'EE. UU. y red mundial', info.garantiaEEUU],
            ['Vercel Inc.', 'Servidor que recibe las estadísticas', 'EE. UU. (Washington D. C.)', info.garantiaEEUU],
            ['MongoDB, Inc. (Atlas)', 'Base de datos de las estadísticas', info.regionAtlas, info.garantiaEEUU],
          ]}
        />
      </LegalSection>

      <LegalSection title="Tus derechos">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
            escribiendo a {contactLink}.
          </li>
          <li>
            Como no guardamos tu foto ni datos de tu DNI, normalmente no podremos encontrar información tuya
            (artículo 11 del RGPD). Si escribiste algún dato personal en la marca de agua y quieres que se borre,
            indícanos el texto y la fecha aproximada.
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
          La web no usa cookies de publicidad ni de analítica. Lo único que guarda en tu navegador son los datos
          del idioma español que usa para leer el texto del DNI, así no tiene que descargarlos en cada visita. No
          contienen ningún dato tuyo y se borran al borrar los datos de esta web en el navegador. Cloudflare puede
          usar alguna cookie técnica necesaria para proteger el servicio.
        </p>
      </LegalSection>

      <LegalSection title="Seguridad">
        <ul className="list-disc pl-5 space-y-2">
          <li>Todas las conexiones van cifradas con HTTPS.</li>
          <li>
            Las librerías que se ejecutan en tu navegador (OpenCV, ONNX Runtime y Tesseract) se descargan de esta
            misma web, no de servidores ajenos.
          </li>
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
          Hasta esa fecha la herramienta también guardaba el número de DNI cifrado, con el único fin de saber
          cuántas veces se usaba con un mismo documento. Junto a él no se guardaba ningún otro dato de tu DNI, y no
          se usaba para nada más. Desde esa fecha ya no se guarda. Si quieres que se borre cualquier registro tuyo
          de esa época, escribe a {contactLink}.
        </p>
      </LegalSection>

      <LegalSection title="Cambios en esta política">
        <p>
          Si cambia el funcionamiento de la herramienta, actualizaremos esta política. Última actualización el{' '}
          {info.fechaActualizacion}.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
