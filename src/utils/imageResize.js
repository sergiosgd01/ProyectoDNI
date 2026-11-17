/**
 * Prepara la foto en el navegador antes de enviarla al servidor de recorte.
 *
 * El servidor devuelve el DNI con 2000 px de lado mayor como mucho y no admite archivos de más
 * de 10 MB. Una foto de 24 o 48 MP lleva mucha más resolución de la que se aprovecha, tarda en subir
 * y a menudo supera ese límite. Aquí se deja en el tamaño de una foto de 12 MP.
 * Al volver a codificar la imagen se pierden también los metadatos EXIF, entre ellos la ubicación.
 *
 * Las fotos de hasta 12 MP no se redimensionan a propósito. Reducirlas más acorta la subida, pero
 * cambia el recorte que hace el servidor y en fotos giradas llega a empeorarlo.
 */

// Lado mayor de la foto que se sube. 4096 px deja pasar sin tocar las fotos de 12 MP de cualquier móvil
export const MAX_UPLOAD_SIDE = 4096;

// Calidad del JPEG que se sube
export const UPLOAD_JPEG_QUALITY = 0.85;

// Una foto que no supera el lado máximo solo se vuelve a codificar si pesa más que esto.
// Es el caso de un PNG grande o de un JPEG guardado con calidad máxima
const RECOMPRESS_ABOVE_BYTES = 3 * 1024 * 1024;

// Sin cambio de tamaño, volver a codificar solo compensa cuando ahorra al menos un 20 %
const MIN_SAVING_WITHOUT_RESIZE = 0.8;

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => resolve({ img, url });
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('No se pudo leer la imagen'));
  };
  img.src = url;
});

/**
 * Comprueba que el lienzo tiene imagen. Algunos navegadores no avisan cuando no pueden dibujar
 * una foto muy grande y dejan el lienzo vacío, que aquí es blanco liso.
 */
const isBlank = (ctx, width, height) => {
  for (let i = 1; i <= 5; i++) {
    for (let j = 1; j <= 5; j++) {
      const x = Math.min(width - 1, Math.floor((width * i) / 6));
      const y = Math.min(height - 1, Math.floor((height * j) / 6));
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      if (r !== 255 || g !== 255 || b !== 255) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Devuelve la foto lista para subir. Si no hace falta tocarla, o si reducirla falla o no compensa,
 * devuelve el archivo original.
 * @param {File} file - Foto elegida por el usuario, ya validada
 * @returns {Promise<File>} Foto en JPEG con el lado mayor limitado, o el archivo original
 */
export async function prepareImageForUpload(file) {
  const { img, url } = await loadImage(file);
  const canvas = document.createElement('canvas');

  try {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const longestSide = Math.max(width, height);

    if (longestSide <= MAX_UPLOAD_SIDE && file.size <= RECOMPRESS_ABOVE_BYTES) {
      return file;
    }

    const scale = Math.min(1, MAX_UPLOAD_SIDE / longestSide);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    // willReadFrequently deja el lienzo en memoria normal, que es más rápida de leer que la de la gráfica
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Fondo blanco. La transparencia de un PNG o WEBP saldría negra en JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (isBlank(ctx, canvas.width, canvas.height)) {
      return file;
    }

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', UPLOAD_JPEG_QUALITY);
    });

    if (!blob) {
      return file;
    }
    if (scale === 1 && blob.size > file.size * MIN_SAVING_WITHOUT_RESIZE) {
      return file;
    }

    // Nombre genérico. El original puede llevar el nombre o el número de la persona
    return new File([blob], 'dni.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    URL.revokeObjectURL(url);
    // Libera la memoria del lienzo sin esperar al recolector
    canvas.width = 0;
    canvas.height = 0;
  }
}
