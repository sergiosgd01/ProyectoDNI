import { COLORS, SEMANTIC_COLORS, COLOR_VARIANTS } from './colors';

/**
 * 🎨 Hook para usar colores de forma consistente
 * Centraliza el acceso a todos los colores del sistema
 */
export const useColors = () => {
  return {
    // 🎨 Colores base
    primary: COLORS.PRIMARY,
    secondary: COLORS.SECONDARY,
    
    // 🎯 Colores semánticos  
    button: {
      primary: SEMANTIC_COLORS.BUTTON_PRIMARY,
      secondary: SEMANTIC_COLORS.BUTTON_SECONDARY,
      danger: SEMANTIC_COLORS.BUTTON_DANGER,
    },
    
    text: {
      primary: SEMANTIC_COLORS.TEXT_PRIMARY,
      secondary: SEMANTIC_COLORS.TEXT_SECONDARY,
      muted: SEMANTIC_COLORS.TEXT_MUTED,
    },
    
    border: {
      default: SEMANTIC_COLORS.BORDER_DEFAULT,
      focus: SEMANTIC_COLORS.BORDER_FOCUS,
      error: SEMANTIC_COLORS.BORDER_ERROR,
    },
    
    background: {
      primary: SEMANTIC_COLORS.BG_PRIMARY,
      secondary: SEMANTIC_COLORS.BG_SECONDARY,
      overlay: SEMANTIC_COLORS.BG_OVERLAY,
    },
    
    // 🎭 Variantes completas
    variants: COLOR_VARIANTS,
    
    // 🛠️ Utilidades
    getHover: (colorType) => {
      if (colorType === 'primary') return COLOR_VARIANTS.PRIMARY[600];
      if (colorType === 'secondary') return COLOR_VARIANTS.SECONDARY[600];
      return colorType;
    },
    
    getLight: (colorType) => {
      if (colorType === 'primary') return COLOR_VARIANTS.PRIMARY[100];
      if (colorType === 'secondary') return COLOR_VARIANTS.SECONDARY[100];
      return colorType;
    },
    
    getDark: (colorType) => {
      if (colorType === 'primary') return COLOR_VARIANTS.PRIMARY[700];
      if (colorType === 'secondary') return COLOR_VARIANTS.SECONDARY[700];
      return colorType;
    },
    
    // 🎨 Gradientes predefinidos
    gradients: {
      primary: `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.SECONDARY})`,
      light: `linear-gradient(135deg, ${COLOR_VARIANTS.PRIMARY[100]}, ${COLOR_VARIANTS.SECONDARY[100]})`,
      dark: `linear-gradient(135deg, ${COLOR_VARIANTS.PRIMARY[700]}, ${COLOR_VARIANTS.SECONDARY[700]})`
    }
  };
};
