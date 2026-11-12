import React from 'react';

// Resalta en amarillo los datos que siguen entre corchetes, para verlos de un vistazo al revisar la página
export default function Fill({ children }) {
  const text = String(children ?? '');
  if (!text.includes('[')) return text;
  return <mark className="bg-yellow-100 text-gray-900 px-1 rounded">{text}</mark>;
}
