// src/services/dniApi.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/dni";

export const dniApi = {
  /**
   * Guarda un registro de procesamiento de DNI en la base de datos
   * @param {Object} data - Información del DNI
   * @returns {Promise<Object>} Respuesta del backend
   */
  async saveDniRecord(data) {
    try {
      console.log(`🌐 [API] POST ${API_BASE_URL}/save`);
      const response = await fetch(`${API_BASE_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error(`❌ [API] Error status: ${response.status}`);
        throw new Error(`Error al guardar DNI: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Registro guardado correctamente:", result);
      return result;
    } catch (error) {
      console.error("❌ Error en dniApi.saveDniRecord:", error);
      throw error;
    }
  },

  /**
   * Obtiene todos los DNIs registrados
   */
  async getAll() {
    const res = await fetch(API_BASE_URL);
    return res.json();
  },

  /**
   * Obtiene un DNI por su número
   */
  async getByNumber(dniNumber) {
    const res = await fetch(`${API_BASE_URL}/${dniNumber}`);
    return res.json();
  },

  /**
   * Elimina un DNI por número
   */
  async deleteByNumber(dniNumber) {
    const res = await fetch(`${API_BASE_URL}/${dniNumber}`, { method: "DELETE" });
    return res.json();
  },

  async getHistory(dniNumber) {
    const res = await fetch(`${API_BASE_URL}/history/${dniNumber}`);
    return res.json();
  },
};
