  // Colores de la web. Los usa Tailwind (tailwind.config.js) y useColors para los estilos en línea.
  //
  // Los nombres primary y secondary vienen de antes y no dicen qué color son, así que conviene mirarlo aquí.
  // primary es el amarillo de la marca y secondary el rojo. Cada escala va de claro (50) a oscuro (900)
  // sin cambiar de color por el camino. Hasta noviembre de 2026 primary-600 era rojo y primary-700 un rojo
  // transparente, y por eso había mensajes de éxito en rojo y textos que apenas se leían.
  //
  // Para qué se usa cada uno
  // - secondary (rojo). Botones principales, enlaces e iconos. El 600 es el de
  //   los botones y los textos, porque el 500 con letra blanca no llega al contraste mínimo (4,5 a 1).
  // - primary (amarillo). Fondos suaves, insignias, la selección de un perfil y barras. Nunca para texto
  //   sobre blanco ni con letra blanca encima, porque no se lee.
  // - success (verde). Lo que ha salido bien.
  // - error (rojo, la misma escala que secondary). Solo errores.

  export const COLORS = {
    PRIMARY: '#eaaf0f',      // Amarillo de la marca
    SECONDARY: '#E53338',    // Rojo de la marca
    SUCCESS: '#16a34a',      // Verde, lo que ha salido bien

    // Neutrales, para estructura y textos
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

    // Estados
    ERROR: '#E53338',        // Rojo, solo para errores
    WARNING: '#f59e0b',      // Naranja, solo para advertencias

    WHITE: '#ffffff',
    BLACK: '#000000',
    TRANSPARENT: 'transparent'
  };

  export const COLOR_VARIANTS = {
    // Amarillo (escala ámbar con el 500 de la marca)
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
    // Rojo
    SECONDARY: {
      50: '#fdecec',
      100: '#f9caca',
      200: '#f3a1a3',
      300: '#ed777b',
      400: '#e75d61',
      500: COLORS.SECONDARY,   // #E53338
      600: '#d12e32',          // botones y textos en rojo (5 a 1 con blanco)
      700: '#b8262a',
      800: '#9f1f22',
      900: '#86181b'
    },
    // Verde
    SUCCESS: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: COLORS.SUCCESS,     // #16a34a
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    }
  };

  // Usos concretos
  export const SEMANTIC_COLORS = {
    // Botones
    BUTTON_PRIMARY: COLOR_VARIANTS.SECONDARY[600],
    BUTTON_SECONDARY: COLORS.WHITE,
    BUTTON_DANGER: COLORS.ERROR,
    BUTTON_DISABLED: COLORS.GRAY[400],

    // Estados
    SUCCESS: COLORS.SUCCESS,
    ERROR: COLORS.ERROR,
    WARNING: COLORS.WARNING,

    // Textos
    TEXT_PRIMARY: COLORS.GRAY[900],
    TEXT_SECONDARY: COLORS.GRAY[600],
    TEXT_MUTED: COLORS.GRAY[500],

    // Bordes
    BORDER_DEFAULT: COLORS.GRAY[200],
    BORDER_FOCUS: COLORS.SECONDARY,
    BORDER_ERROR: COLORS.ERROR,

    // Fondos
    BG_PRIMARY: COLORS.WHITE,
    BG_SECONDARY: COLORS.GRAY[50],
    BG_OVERLAY: 'rgba(0, 0, 0, 0.5)'
  };
