import React from 'react';

function FAQ() {
  const faqs = [
    {
      question: "¿Es seguro subir mi DNI?",
      answer: "Completamente seguro. Tu DNI nunca sale de tu dispositivo, todo el procesamiento es local en tu navegador. Las imágenes no se envían a ningún servidor externo."
    },
    {
      question: "¿Qué datos se guardan de mi DNI?",
      answer: "Solo guardamos el número de DNI codificado de forma anónima para estadísticas de uso de la web (cuántas veces se utiliza la herramienta). No se almacena ninguna imagen, ni datos personales, ni información sensible. El resto de datos del DNI no se procesan ni guardan en absoluto."
    },
    {
      question: "¿Qué formatos de imagen son compatibles?",
      answer: "Soportamos todos los formatos de imagen comunes: JPG, PNG, GIF, BMP y WebP."
    },
    {
      question: "¿Funciona sin conexión a internet?",
      answer: "Sí, una vez cargada la página, la herramienta funciona completamente offline ya que todo el procesamiento es local."
    },
    {
      question: "¿Puedo personalizar la marca de agua?",
      answer: "Sí, puedes personalizar el texto de la marca de agua para cada uso específico que le vayas a dar al documento."
    },
    {
      question: "¿Qué datos puedo ocultar?",
      answer: "Puedes ocultar selectivamente cualquier campo del DNI: nombre, apellidos, DNI, fechas, códigos QR, número de trámite, etc."
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
