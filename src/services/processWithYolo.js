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

// Mensaje para una respuesta de error sin explicación del servidor de recorte, como la página de error de
// Cloudflare o un fallo de la propia API. El código va al final por si hay que contárselo a alguien
function mensajeDeEstado(status) {
  if (status === 413) return `La foto pesa demasiado para enviarla (error ${status}).`;
  if (status === 429) return `Se han enviado demasiadas fotos seguidas (error ${status}).`;
  if (status >= 500) return `El servidor que recorta la foto no está disponible ahora mismo (error ${status}).`;
  return `El servidor no ha podido recortar la foto (error ${status}).`;
}

const SUGERENCIA_REINTENTAR = 'Vuelve a intentarlo dentro de unos minutos o recorta la foto a mano.';

const sugerenciaDeEstado = (status) =>
  status === 413 ? 'Prueba con otra foto o recórtala a mano.' : SUGERENCIA_REINTENTAR;

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

        // Si el backend devuelve un objeto detail con estructura de error. Si no trae mensaje, como la lista en
        // inglés de los errores de validación de FastAPI, se explica con el código
        if (json.detail && typeof json.detail === 'object') {
          return {
            ok: false,
            errorType: json.detail.error || 'unknown_error',
            message: json.detail.message || mensajeDeEstado(res.status),
            suggestion: json.detail.suggestion || (json.detail.message ? '' : sugerenciaDeEstado(res.status)),
            action: json.detail.action || 'retry',
            confidence: json.detail.confidence || null,
            minRequired: json.detail.min_required || null
          };
        }

        // Formato de error simple. Los textos de la API ya van en español. Si no hay texto se explica con el código
        const texto = typeof json.detail === 'string' ? json.detail : typeof json.error === 'string' ? json.error : '';
        return {
          ok: false,
          errorType: 'service_error',
          message: texto || mensajeDeEstado(res.status),
          suggestion: sugerenciaDeEstado(res.status),
          action: 'retry'
        };
      } catch (jsonErr) {
        if (jsonErr instanceof SyntaxError) {
          return {
            ok: false,
            errorType: 'server_error',
            message: mensajeDeEstado(res.status),
            suggestion: sugerenciaDeEstado(res.status),
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
      message: json.message || 'El servidor no ha podido recortar la foto.',
      action: 'retry'
    };
  } catch (err) {
    clearTimeout(id);

    // ✅ Detectar timeout específicamente
    if (err.name === 'AbortError') {
      return {
        ok: false,
        errorType: 'timeout',
        message: 'El servidor ha tardado demasiado en responder.',
        suggestion: SUGERENCIA_REINTENTAR,
        action: 'retry'
      };
    }

    // El navegador solo dice «Failed to fetch», «Load failed» o «NetworkError...», en inglés y sin más detalle
    console.error('❌ [processWithYolo] Error de red:', err);
    const sinConexion = typeof navigator !== 'undefined' && navigator.onLine === false;
    return {
      ok: false,
      errorType: 'network_error',
      message: sinConexion
        ? 'No tienes conexión a internet.'
        : 'No se ha podido conectar con el servidor que recorta la foto.',
      suggestion: 'Comprueba tu conexión y vuelve a intentarlo, o recorta la foto a mano.',
      action: 'retry'
    };
  }
}