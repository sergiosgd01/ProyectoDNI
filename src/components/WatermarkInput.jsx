import React from 'react';
import { useColors } from '../theme/useColors';

export default function WatermarkInput({ value, onChange, maxLength = 50 }) {
  const colors = useColors();
  const remainingChars = maxLength - value.length;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
      <div className="flex items-center mb-2">
        <i className="bi bi-droplet text-purple-600 mr-2"></i>
        <h4 className="font-semibold text-purple-800 text-sm">Marca de agua personalizada</h4>
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
          placeholder="Ej: Uso exclusivo para Hotel ABC"
          className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          style={{
            borderColor: colors.border.default
          }}
        />
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-purple-600">
            <i className="bi bi-info-circle mr-1"></i>
            Este texto aparecerá en las imágenes descargadas
          </span>
          <span className={`font-medium ${remainingChars < 10 ? 'text-orange-600' : 'text-purple-600'}`}>
            {remainingChars} caracteres restantes
          </span>
        </div>
      </div>
    </div>
  );
}