import React from 'react';

function FAQ() {
  const faqs = [
    {
      question: "¿Es seguro subir la foto de mi DNI?",
      answer: "Sí, es completamente seguro. Tu foto nunca sale de tu móvil u ordenador. Todo el proceso ocurre en tu propio dispositivo de manera privada y no se envía ninguna foto por internet a ninguna otra parte."
    },
    {
      question: "¿Se guarda algún dato mío?",
      answer: "No guardamos tu foto, nombre ni ningún dato personal tuyo. Únicamente registramos de forma totalmente privada (e indescifrable) tu número de documento para poder llevar la cuenta general de cuánta gente usa la aplicación, pero de ninguna manera sabremos quién eres."
    },
    {
      question: "¿Qué formatos de imagen acepta la aplicación?",
      answer: "La aplicación admite los formatos de foto más habituales: JPG, PNG y WEBP (con un tamaño máximo de 10 MB por foto)."
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
      answer: "Puedes ocultar o difuminar fácilmente cualquier dato del DNI que no quieras mostrar como tu nombre, apellidos, firma, fechas o lugar de nacimiento. Tú eliges en todo momento qué información quieres que sea visible."
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
