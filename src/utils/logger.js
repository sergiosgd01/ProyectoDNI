/**
 * Logger condicional para prevenir exposición de datos sensibles en producción
 * 
 * En desarrollo (DEV): Todos los logs se muestran
 * En producción (PROD): Solo errores críticos se muestran
 */

const isDev = import.meta.env.DEV;

/**
 * Logger seguro para la aplicación
 */
export const logger = {
  /**
   * Logs de depuración - SOLO en desarrollo
   * Usar para información de debugging, datos sensibles, flujos internos
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Logs de información - SOLO en desarrollo
   * Usar para eventos importantes pero no críticos
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Advertencias - SOLO en desarrollo
   * Usar para situaciones anómalas pero no bloqueantes
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Errores críticos - SIEMPRE se muestran
   * Usar para errores que afectan funcionamiento
   * IMPORTANTE: No incluir datos sensibles en mensajes de error
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Grupos de logs - SOLO en desarrollo
   */
  group: (label) => {
    if (isDev) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },

  /**
   * Utilidad para loggear datos sensibles de forma segura
   * En producción, solo muestra que existe el dato, no el contenido
   */
  sensitive: (label, data) => {
    if (isDev) {
      console.log(`📋 ${label}:`, data);
    } else {
      // En producción solo indicamos que hay datos, no los mostramos
      console.log(`📋 ${label}: [REDACTED]`);
    }
  },

  /**
   * Tabla de datos - SOLO en desarrollo
   */
  table: (data) => {
    if (isDev) {
      console.table(data);
    }
  },
};

/**
 * Utilidad para logging condicional inline
 * Ejemplo: if (logger.isDev) { // código de debug }
 */
logger.isDev = isDev;

export default logger;
