import React from 'react';

// Recuadro de la marca de agua. El título y los avisos van en gris, porque antes iban en amarillo sobre
// blanco (no se leía) y en rojo aunque no hubiera ningún error. El contador solo cambia de color al final
export default function WatermarkInput({ value, onChange, maxLength = 40 }) {
  const remainingChars = maxLength - value.length;
  const colorContador = remainingChars < 5 ? 'text-red-600' : remainingChars < 10 ? 'text-amber-600' : 'text-gray-500';

  return (
    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
      <div className="flex items-center mb-2">
        <i className="bi bi-droplet mr-2 text-primary-600"></i>
        <h4 className="font-semibold text-sm text-gray-900">
          Marca de agua personalizada
        </h4>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= maxLength) {
              onChange(e.target.value);
            }
          }}
          maxLength={maxLength}
          placeholder="Ej: Uso exclusivo para Hotel"
          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg transition-colors focus:outline-none focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100"
        />

        <div className="flex items-start justify-between gap-3 text-xs text-gray-600">
          <span>
            <i className="bi bi-info-circle mr-1"></i>
            Máximo {maxLength} caracteres para mejor visualización
          </span>
          <span className={`font-medium flex-shrink-0 ${colorContador}`}>
            {remainingChars} restantes
          </span>
        </div>

        <p className="text-xs text-gray-600 flex items-start">
          <i className="bi bi-exclamation-circle mr-1 mt-0.5 text-amber-600"></i>
          <span>
            Este texto se guarda para nuestras estadísticas. No escribas tu nombre, tu dirección ni otros datos
            personales.
          </span>
        </p>
      </div>
    </div>
  );
}
