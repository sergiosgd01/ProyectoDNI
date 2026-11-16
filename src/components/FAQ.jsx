import React, { useState } from 'react';

// Preguntas frecuentes de la portada y de la página de subida.
// Cada respuesta se abre y se cierra por su cuenta, sin cerrar las demás, y la primera sale abierta.
// Las cerradas llevan inert, así que ni se leen con lector de pantalla ni reciben el foco mientras están plegadas
const faqs = [
  {
    question: '¿Es seguro subir la foto de mi DNI?',
    answer: 'Sí. La foto viaja cifrada a nuestro servidor solo para recortar y enderezar el DNI, y no se guarda en ningún sitio. La censura y la marca de agua se aplican en tu navegador, y tú revisas el resultado antes de descargarlo.'
  },
  {
    question: '¿Se guarda algún dato mío?',
    answer: 'No guardamos tu foto ni ningún dato de tu DNI. Solo registramos estadísticas de uso, como el perfil elegido o qué campos se tapan, y el texto que escribes en la marca de agua. Por eso te pedimos que no pongas datos personales en ese texto.'
  },
  {
    question: '¿Qué formatos de imagen acepta la aplicación?',
    answer: 'La aplicación admite los formatos de foto más habituales: JPG, PNG y WEBP (con un tamaño máximo de 30 MB por foto).'
  },
  {
    question: '¿Tiene algún coste utilizar esta herramienta?',
    answer: 'No, la herramienta es completamente gratuita y puedes utilizarla libremente todas las veces que la necesites sin registrarte.'
  },
  {
    question: '¿Puedo personalizar la marca de agua?',
    answer: 'Sí, puedes escribir el texto de la marca de agua que mejor se adapte para cada trámite o gestión que vayas a realizar con tu documento (por ejemplo, «Copia válida para alquilar piso»).'
  },
  {
    question: '¿Qué partes del DNI puedo ocultar?',
    answer: 'Puedes tapar cualquier dato del DNI que no quieras mostrar, como tu nombre, apellidos, firma, fechas o lugar de nacimiento. Tú eliges en todo momento qué información quieres que sea visible.'
  }
];

function FAQ() {
  // Índices de las preguntas abiertas
  const [abiertas, setAbiertas] = useState(() => new Set([0]));

  const alternar = (index) => {
    setAbiertas((anteriores) => {
      const siguientes = new Set(anteriores);
      if (siguientes.has(index)) {
        siguientes.delete(index);
      } else {
        siguientes.add(index);
      }
      return siguientes;
    });
  };

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-start gap-x-20 gap-y-10">
        <div className="flex flex-[1_1_300px] max-w-[380px] flex-col gap-4 lg:sticky lg:top-24">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 text-balance">
            Preguntas frecuentes
          </h2>
          <p className="text-lg leading-relaxed text-gray-600 text-pretty">
            Lo que más nos preguntan sobre la foto, tus datos y la copia que descargas.
          </p>
          <a
            href="/privacidad"
            className="mt-1.5 inline-flex items-center gap-2 self-start text-[15px] font-semibold text-secondary-600 hover:text-secondary-700 transition-colors"
          >
            Lee la política de privacidad
            <i className="bi bi-arrow-right" aria-hidden="true"></i>
          </a>
        </div>

        <div className="min-w-0 flex-[2_1_560px] border-t border-gray-900">
          {faqs.map((faq, index) => {
            const estaAbierta = abiertas.has(index);
            return (
              <div key={faq.question} className="border-b border-gray-200">
                <h3>
                  <button
                    type="button"
                    id={`faq-pregunta-${index}`}
                    aria-expanded={estaAbierta}
                    aria-controls={`faq-respuesta-${index}`}
                    onClick={() => alternar(index)}
                    className="group flex w-full items-center gap-5 rounded-sm py-5 sm:py-[22px] text-left text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2"
                  >
                    <span
                      className={`w-7 flex-none font-mono text-[13px] font-semibold transition-colors ${
                        estaAbierta ? 'text-secondary-600' : 'text-gray-500'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 text-lg sm:text-[19px] font-semibold leading-snug tracking-[-0.01em]">
                      {faq.question}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border transition-colors ${
                        estaAbierta
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 bg-white text-gray-900 group-hover:border-gray-400'
                      }`}
                    >
                      <svg
                        viewBox="0 0 14 14"
                        className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${estaAbierta ? 'rotate-45' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      >
                        <path d="M7 1.5v11M1.5 7h11" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-respuesta-${index}`}
                  role="region"
                  aria-labelledby={`faq-pregunta-${index}`}
                  inert={!estaAbierta}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                    estaAbierta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="max-w-[640px] pb-6 pl-12 sm:pr-14 text-base leading-relaxed text-gray-600 text-pretty">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
