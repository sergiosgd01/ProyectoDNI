import React from 'react';
import { useColors } from '../theme/useColors';

export default function WatermarkInput({ value, onChange, maxLength = 40 }) {
  const colors = useColors();
  const remainingChars = maxLength - value.length;

  return (
    <div 
      className="border-2 rounded-lg p-4 mb-4"
      style={{
        backgroundColor: `${colors.secondary}15`,
        borderColor: `${colors.secondary}50`
      }}
    >
      <div className="flex items-center mb-2">
        <i 
          className="bi bi-droplet mr-2"
          style={{ color: colors.secondary }}
        ></i>
        <h4 
          className="font-semibold text-sm"
          style={{ color: colors.secondary }}
        >
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
          className="w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
          style={{
            background: colors.background.primary,
            borderColor: colors.border.default,
            focusRingColor: colors.secondary
          }}
          onFocus={(e) => {
            e.target.style.borderColor = colors.secondary;
            e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.border.default;
            e.target.style.boxShadow = 'none';
          }}
        />
        
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: colors.secondary }}>
            <i className="bi bi-info-circle mr-1"></i>
            Máximo {maxLength} caracteres para mejor visualización
          </span>
          <span 
            className="font-medium"
            style={{ 
              color: remainingChars < 5 ? '#dc2626' : remainingChars < 10 ? '#f59e0b' : colors.secondary 
            }}
          >
            {remainingChars} restantes
          </span>
        </div>
      </div>
    </div>
  );
}