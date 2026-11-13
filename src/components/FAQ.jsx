import React from 'react';

function FAQ() {
  const faqs = [
    {
      question: "¿Es seguro subir la foto de mi DNI?",
      answer: "Sí. La foto viaja cifrada a nuestro servidor solo para recortar y enderezar el DNI, y no se guarda en ningún sitio. La censura y la marca de agua se aplican en tu navegador, y tú revisas el resultado antes de descargarlo."
    },
    {
      question: "¿Se guarda algún dato mío?",
      answer: "No guardamos tu foto ni ningún dato de tu DNI. Solo registramos estadísticas de uso, como el perfil elegido o qué campos se tapan, y el texto que escribes en la marca de agua. Por eso te pedimos que no pongas datos personales en ese texto."
    },
    {
      question: "¿Qué formatos de imagen acepta la aplicación?",
      answer: "La aplicación admite los formatos de foto más habituales: JPG, PNG y WEBP (con un tamaño máximo de 30 MB por foto)."
    },
    {
      question: "¿Tiene algún coste utilizar esta herramienta?",
      answer: "No, la herramienta es completamente gratuita y puedes utilizarla libremente todas las veces que la necesites sin registrarte."
    },
    {
      question: "¿Puedo personalizar la marca de agua?",
      answer: "Sí, puedes escribir el texto de la marca de agua que mejor se adapte para cada trámite o gestión que vayas a realizar con tu documento (por ejemplo, 'Copia válida para alquilar piso')."
    },
    {
      question: "¿Qué partes del DNI puedo ocultar?",
      answer: "Puedes tapar cualquier dato del DNI que no quieras mostrar, como tu nombre, apellidos, firma, fechas o lugar de nacimiento. Tú eliges en todo momento qué información quieres que sea visible."
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Preguntas Frecuentes
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {faq.question}
              </h3>
              <p className="text-gray-600">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
