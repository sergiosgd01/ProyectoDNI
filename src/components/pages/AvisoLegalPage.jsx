import React from 'react';
import LegalPageLayout, { LegalSection } from '../legal/LegalPageLayout';
import LegalTable from '../legal/LegalTable';
import { LEGAL_INFO } from '../../content/legal';

export default function AvisoLegalPage({ onGoHome }) {
  const info = LEGAL_INFO;

  const titularRows = [
    ['Titular', info.titular],
    ['Proyecto', info.proyecto],
    ['NIF', info.nif],
    ['Domicilio', info.direccion],
    [
      'Correo de contacto',
      info.correoContacto && (
        <a href={`mailto:${info.correoContacto}`} className="text-primary-700 underline">
          {info.correoContacto}
        </a>
      ),
    ],
    ['Sitio web', 'protegetuidentidad.es y los dominios que redirigen a él'],
  ].filter(([, value]) => value);

  return (
    <LegalPageLayout title="Aviso legal" onGoHome={onGoHome}>
      <p>
        Protege tu Identidad es una herramienta gratuita para tapar datos del DNI antes de compartir una copia.
        Este aviso da la información que exige el artículo 10 de la Ley 34/2002 de servicios de la sociedad de la
        información (LSSI-CE).
      </p>

      <LegalSection title="Titular del sitio web">
        <LegalTable headers={['Dato', 'Valor']} rows={titularRows} />
      </LegalSection>

      <LegalSection title="Qué es la herramienta">
        <p>
          La herramienta tapa con bloques negros los datos del DNI que la persona elige y añade una marca de agua.
          Forma parte del proyecto C108/23 “Detección de Falsificación de Documentos de Identidad mediante Técnicas
          de Visión por Computador e Inteligencia Artificial”. Lo financia la Unión Europea (NextGenerationEU) a
          través del Plan de Recuperación, Transformación y Resiliencia y de INCIBE.
        </p>
      </LegalSection>

      <LegalSection title="Condiciones de uso">
        <p>Al usar la herramienta aceptas estas condiciones.</p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>Úsala solo con tu propio documento o con el de alguien que te haya dado permiso.</li>
          <li>
            La detección automática puede fallar. Revisa siempre la imagen final antes de compartirla y comprueba
            que están tapados todos los datos que querías ocultar.
          </li>
          <li>
            La zona de letras del reverso (MRZ) repite el nombre, el número de DNI, las fechas y otros datos. Si
            quieres ocultarlos, tápala también.
          </li>
          <li>
            La marca de agua ayuda a que la copia no se reutilice para otra cosa, pero no tiene valor legal por sí
            misma.
          </li>
          <li>
            No está permitido usar la herramienta para alterar documentos con fines fraudulentos ni para atacar o
            saturar el servicio.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Responsabilidad">
        <p>
          La herramienta se ofrece gratis y tal cual, como resultado de un proyecto de investigación. No
          garantizamos que esté siempre disponible ni que detecte todos los datos en todas las fotos. El titular no
          responde de los daños que se deriven de compartir una imagen sin revisarla o de un uso contrario a estas
          condiciones.
        </p>
      </LegalSection>

      <LegalSection title="Propiedad intelectual">
        <p>
          Los textos, el diseño, el código y los modelos de la herramienta pertenecen a {info.titularDerechos},
          salvo las librerías de código abierto, que mantienen sus propias licencias. Las que se ejecutan en tu
          navegador y sus licencias están en la{' '}
          <a href="/licencias/LEEME.txt" className="text-primary-700 underline">
            lista de librerías de terceros
          </a>
          . Las imágenes que subes siguen siendo tuyas y no se guardan.
        </p>
      </LegalSection>

      <LegalSection title="Legislación aplicable">
        <p>
          Este aviso se rige por la legislación española. Si usas la herramienta como consumidor, puedes acudir a
          los juzgados de tu domicilio.
        </p>
      </LegalSection>

      <p className="mt-8 text-sm text-gray-500">Última actualización el {info.fechaActualizacion}.</p>
    </LegalPageLayout>
  );
}
