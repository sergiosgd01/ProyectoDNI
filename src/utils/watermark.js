/**
 * Añade una marca de agua a un canvas (patrón repetido)
 * @param {HTMLCanvasElement} canvas - Canvas donde añadir la marca de agua
 * @param {CanvasRenderingContext2D} ctx - Contexto 2D del canvas
 * @param {Object} options - Opciones de configuración
 */
export const addWatermark = (canvas, ctx, options = {}) => {
  const {
    text,
    fontSize = null,       // null = proporcional a la imagen
    fontSizeRatio = 0.03,  // 3% de la dimensión menor del canvas
    fontFamily = "Arial",
    fontWeight = "bold",
    fillColor = "rgba(255, 255, 255, 0.35)",
    strokeColor = "rgba(0, 0, 0, 0.25)",
    strokeWidth = 1,
    rotation = -45,
    pattern = true,
    spacingX = null,  // null = proporcional
    spacingY = null   // null = proporcional
  } = options;

  // Validar que se pasó el texto
  if (!text) {
    console.warn('No se proporcionó texto para la marca de agua');
    return;
  }

  // Tamaño de fuente y espaciado proporcionales al canvas
  const smallerDim = Math.min(canvas.width, canvas.height);
  const computedFontSize = fontSize ?? Math.round(smallerDim * fontSizeRatio);
  const computedSpacingX = spacingX ?? Math.round(smallerDim * 0.28);
  const computedSpacingY = spacingY ?? Math.round(smallerDim * 0.16);

  ctx.save();

  // Ajustar tamaño de fuente según longitud del texto
  let adjustedFontSize = computedFontSize;
  if (text.length > 35) {
    adjustedFontSize = Math.max(Math.round(computedFontSize * 0.7), computedFontSize - Math.floor((text.length - 35) / 3));
  } else if (text.length > 25) {
    adjustedFontSize = Math.max(Math.round(computedFontSize * 0.8), computedFontSize - 3);
  }

  // Configurar el texto
  ctx.font = `${fontWeight} ${adjustedFontSize}px ${fontFamily}`;
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Añadir desenfoque para mayor difuminado
  ctx.shadowBlur = 3;
  ctx.shadowColor = "rgba(0, 0, 0, 0.1)";

  if (pattern) {
    // Patrón repetido por toda la imagen
    const rotationRad = rotation * Math.PI / 180;

    // Ajustar espaciado según longitud del texto
    const adjustedSpacingX = text.length > 30 ? computedSpacingX * 1.1 : computedSpacingX;
    const adjustedSpacingY = text.length > 30 ? computedSpacingY * 1.1 : computedSpacingY;

    // Calcular cuántas repeticiones necesitamos (con margen extra)
    const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
    const cols = Math.ceil(diagonal / adjustedSpacingX) + 3; // ✅ +3 en vez de +2 para más repeticiones
    const rows = Math.ceil(diagonal / adjustedSpacingY) + 3; // ✅ +3 en vez de +2 para más repeticiones

    // Dibujar el patrón
    for (let row = -2; row < rows; row++) { // ✅ Empezar desde -2 en vez de -1
      for (let col = -2; col < cols; col++) { // ✅ Empezar desde -2 en vez de -1
        ctx.save();

        const x = col * adjustedSpacingX;
        const y = row * adjustedSpacingY;

        ctx.translate(x, y);
        ctx.rotate(rotationRad);

        // Dibujar el texto con borde y relleno
        ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);

        ctx.restore();
      }
    }
  } else {
    // Marca de agua única (comportamiento original)
    let x, y;

    // Calcular posición para marca única
    x = canvas.width / 2;
    y = canvas.height / 2;

    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);

    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
  }

  ctx.restore();
};

/**
 * Convierte una imagen en canvas con marca de agua
 * @param {string} imageUrl - URL de la imagen
 * @param {Object} watermarkOptions - Opciones para la marca de agua (DEBE incluir 'text')
 * @returns {Promise<string>} - Data URL de la imagen con marca de agua
 */
export const imageToCanvasWithWatermark = async (imageUrl, watermarkOptions = {}) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujar imagen
      ctx.drawImage(img, 0, 0);

      // Añadir marca de agua
      addWatermark(canvas, ctx, watermarkOptions);

      // Convertir a data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      resolve(dataUrl);
    };

    img.onerror = (error) => {
      reject(error);
    };

    img.src = imageUrl;
  });
};

/**
 * Descarga una imagen con marca de agua
 * @param {string} imageUrl - URL de la imagen
 * @param {string} filename - Nombre del archivo a descargar
 * @param {Object} watermarkOptions - Opciones para la marca de agua (DEBE incluir 'text')
 */
export const downloadImageWithWatermark = async (imageUrl, filename, watermarkOptions = {}) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    canvas.width = img.width;
    canvas.height = img.height;

    // Dibujar imagen
    ctx.drawImage(img, 0, 0);

    // Añadir marca de agua
    addWatermark(canvas, ctx, watermarkOptions);

    // Descargar
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);

  } catch (error) {
    console.error('Error al añadir marca de agua:', error);
    throw error;
  }
};

/**
 * Combina múltiples imágenes en un canvas con marca de agua
 * @param {Array<string>} imageUrls - Array de URLs de imágenes
 * @param {number} spacing - Espacio entre imágenes en px
 * @param {Object} watermarkOptions - Opciones para la marca de agua (DEBE incluir 'text')
 * @returns {Promise<HTMLCanvasElement>} - Canvas con las imágenes combinadas
 */
export const combineImagesWithWatermark = async (imageUrls, spacing = 20, watermarkOptions = {}) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Cargar todas las imágenes
  const images = await Promise.all(
    imageUrls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    })
  );

  // Ancho objetivo = el mayor ancho entre todas las imágenes
  const targetWidth = Math.max(...images.map(img => img.width));

  // Calcular altura de cada imagen escalada al targetWidth (mantener proporción)
  const scaledHeights = images.map(img => Math.round((img.height / img.width) * targetWidth));

  // Calcular altura total del canvas
  const totalHeight = scaledHeights.reduce((sum, h) => sum + h, 0) + spacing * (images.length - 1);

  // Configurar canvas
  canvas.width = targetWidth;
  canvas.height = totalHeight;

  // Fondo blanco
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar imágenes escaladas al mismo ancho
  let currentY = 0;
  images.forEach((img, index) => {
    ctx.drawImage(img, 0, currentY, targetWidth, scaledHeights[index]);
    currentY += scaledHeights[index] + spacing;
  });

  // Añadir marca de agua
  addWatermark(canvas, ctx, watermarkOptions);

  return canvas;
};
