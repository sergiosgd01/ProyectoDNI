export async function processWithYolo(file, { url = 'https://blotless-krysta-nontemporally.ngrok-free.dev/process', timeout = 20000 } = {}) {
  // ✅ Validación básica
  if (!file || !(file instanceof File || file instanceof Blob)) {
    return { ok: false, error: 'Archivo inválido o no proporcionado' };
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
      // ✅ Mejor manejo de errores JSON
      try {
        const json = await res.json();
        throw new Error(json.detail || json.error || `YOLO service error ${res.status}`);
      } catch (jsonErr) {
        if (jsonErr instanceof SyntaxError) {
          throw new Error(`Error del servidor: ${res.status}`);
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
      return { ok: true, blob, blobUrl, confidence };
    }

    // Si el backend devolvió JSON (ej. {error:...})
    const json = await res.json();
    return { ok: false, error: json.detail || json.error || 'Error desconocido' };
  } catch (err) {
    clearTimeout(id);
    
    // ✅ Detectar timeout específicamente
    if (err.name === 'AbortError') {
      return { ok: false, error: 'Tiempo de espera agotado' };
    }
    
    return { ok: false, error: err.message || String(err) };
  }
}