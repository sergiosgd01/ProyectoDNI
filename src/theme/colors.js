// 🎨 SISTEMA DE COLORES SIMPLIFICADO

export const COLORS = {
  // 🔥 COLORES PRINCIPALES
  PRIMARY: '#eaaf0f',      // Amarillo dorado - Botones principales, enlaces, destacados
  SECONDARY: '#00b28c',    // Verde azulado - Éxito, confirmaciones, elementos de apoyo
  
  // 🌫️ NEUTRALES (Para estructura y textos)
  GRAY: {
    50: '#f9fafb',
    100: '#f3f4f6', 
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  },
  
  // ⚠️ ESTADOS 
  ERROR: '#ef4444',        // Rojo - Solo para errores críticos
  WARNING: '#f59e0b',      // Naranja - Solo para advertencias importantes
  
  // 🔲 ESPECIALES
  WHITE: '#ffffff',
  BLACK: '#000000',
  TRANSPARENT: 'transparent'
};

// 🎭 VARIANTES AUTOMÁTICAS 
export const COLOR_VARIANTS = {
  PRIMARY: {
    50: '#fefbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: COLORS.PRIMARY,     // #eaaf0f
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  SECONDARY: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: COLORS.SECONDARY,   // #00b28c
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b'
  }
};

// 🎯 USOS ESPECÍFICOS
export const SEMANTIC_COLORS = {
  // Botones
  BUTTON_PRIMARY: COLORS.PRIMARY,
  BUTTON_SECONDARY: COLORS.SECONDARY,
  BUTTON_DANGER: COLORS.ERROR,
  
  // Estados
  SUCCESS: COLORS.SECONDARY,
  ERROR: COLORS.ERROR,
  WARNING: COLORS.WARNING,
  
  // Textos
  TEXT_PRIMARY: COLORS.GRAY[900],
  TEXT_SECONDARY: COLORS.GRAY[600],
  TEXT_MUTED: COLORS.GRAY[500],
  
  // Bordes
  BORDER_DEFAULT: COLORS.GRAY[200],
  BORDER_FOCUS: COLORS.PRIMARY,
  BORDER_ERROR: COLORS.ERROR,
  
  // Fondos
  BG_PRIMARY: COLORS.WHITE,
  BG_SECONDARY: COLORS.GRAY[50],
  BG_OVERLAY: 'rgba(0, 0, 0, 0.5)'
};
