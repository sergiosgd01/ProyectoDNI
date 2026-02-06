/**
 * Utilidad para rate limiting de subidas de archivos
 * Previene que un usuario sature el servidor con múltiples peticiones
 */

class RateLimiter {
  constructor(maxRequests = 5, timeWindowMs = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindowMs = timeWindowMs;
    this.requests = [];
  }

  /**
   * Verifica si se puede hacer una nueva petición
   * @returns {boolean} true si se permite, false si se excede el límite
   */
  canMakeRequest() {
    const now = Date.now();

    // Filtrar peticiones antiguas fuera de la ventana de tiempo
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindowMs
    );

    // Verificar si se excede el límite
    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    // Registrar nueva petición
    this.requests.push(now);
    return true;
  }

  /**
   * Obtiene el tiempo restante hasta que se permita una nueva petición
   * @returns {number} Milisegundos hasta poder hacer una petición, 0 si ya se puede
   */
  getTimeUntilNextRequest() {
    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = Math.min(...this.requests);
    const timeElapsed = Date.now() - oldestRequest;
    const timeRemaining = Math.max(0, this.timeWindowMs - timeElapsed);

    return timeRemaining;
  }

  /**
   * Reinicia el rate limiter
   */
  reset() {
    this.requests = [];
  }
}

// Instancia global para subidas de archivos
// Permitir 5 subidas cada 60 segundos
export const fileUploadLimiter = new RateLimiter(5, 60000);

export default RateLimiter;
