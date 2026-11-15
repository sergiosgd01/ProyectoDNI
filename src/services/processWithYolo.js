// Esquinas con las que el servidor ha recortado el DNI, en píxeles de la foto enviada y en orden superior
// izquierda, superior derecha, inferior derecha e inferior izquierda. Sirven para abrir el recorte manual ya
// colocado. Devuelve null si el servidor no las manda o no tienen la forma esperada
function leerEsquinas(cabecera) {
  if (!cabecera) return null;
  try {
    const { ancho, alto, puntos } = JSON.parse(cabecera);
    const valido = ancho > 0 && alto > 0 && Array.isArray(puntos) && puntos.length === 4 &&
      puntos.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));
    return valido ? { ancho, alto, puntos: puntos.map(([x, y]) => ({ x, y })) } : null;
  } catch {
    return null;
  }
}

export async function processWithYolo(file, { url = import.meta.env.VITE_YOLO_API_URL || 'http://localhost:8000/process', timeout = 90000 } = {}) {

  // ✅ Validación básica
  if (!file || !(file instanceof File || file instanceof Blob)) {
    return { ok: false, error: 'invalid_file', message: 'Archivo inválido o no proporcionado' };
  }

  const form = new FormData();
  form.append('file', file);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!res.ok) {
      // ✅ Manejo de errores específicos del backend
      try {
        const json = await res.json();

        // Si el backend devuelve un objeto detail con estructura de error
        if (json.detail && typeof json.detail === 'object') {
          return {
            ok: false,
            errorType: json.detail.error || 'unknown_error',
            message: json.detail.message || 'Error desconocido',
            suggestion: json.detail.suggestion || '',
            action: json.detail.action || 'retry',
            confidence: json.detail.confidence || null,
            minRequired: json.detail.min_required || null
          };
        }

        // Formato de error simple
        return {
          ok: false,
          errorType: 'service_error',
          message: json.detail || json.error || `Error del servidor: ${res.status}`,
          action: 'retry'
        };
      } catch (jsonErr) {
        if (jsonErr instanceof SyntaxError) {
          return {
            ok: false,
            errorType: 'server_error',
            message: `Error del servidor: ${res.status}`,
            action: 'retry'
          };
        }
        throw jsonErr;
      }
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('image')) {
      const blob = await res.blob();
      const confidenceHeader = res.headers.get('x-confidence');
      const confidence = confidenceHeader ? parseFloat(confidenceHeader) : null;
      const blobUrl = URL.createObjectURL(blob);
      const esquinas = leerEsquinas(res.headers.get('x-esquinas'));
      return { ok: true, blob, blobUrl, confidence, esquinas };
    }

    // Si el backend devolvió JSON (error controlado)
    const json = await res.json();
    return {
      ok: false,
      errorType: json.error || 'unknown_error',
      message: json.message || 'Error desconocido',
      action: 'retry'
    };
  } catch (err) {
    clearTimeout(id);

    // ✅ Detectar timeout específicamente
    if (err.name === 'AbortError') {
      return {
        ok: false,
        errorType: 'timeout',
        message: 'Tiempo de espera agotado',
        suggestion: 'El servidor tardó demasiado en responder. Intenta nuevamente.',
        action: 'retry'
      };
    }

    return {
      ok: false,
      errorType: 'network_error',
      message: err.message || String(err),
      suggestion: 'Verifica tu conexión a internet.',
      action: 'retry'
    };
  }
}