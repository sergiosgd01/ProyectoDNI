// src/services/dniApi.js
import logger from '../utils/logger';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/dni";

export const dniApi = {
  /**
   * Guarda un registro de procesamiento de DNI en la base de datos
   * @param {Object} data - Información del DNI
   * @returns {Promise<Object>} Respuesta del backend
   */
  async saveDniRecord(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Error al guardar DNI: ${response.status}`);
      }

      const result = await response.json();
      logger.sensitive('Registro guardado correctamente', result);
      return result;
    } catch (error) {
      logger.error("❌ Error en dniApi.saveDniRecord:", error);
      // Lanzar error genérico sin exponer detalles internos
      throw new Error('No se pudo guardar el registro. Por favor, inténtalo de nuevo.');
    }
  }
};