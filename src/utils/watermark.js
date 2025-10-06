/**
 * Añade una marca de agua a un canvas (patrón repetido)
 * @param {HTMLCanvasElement} canvas - Canvas donde añadir la marca de agua
 * @param {CanvasRenderingContext2D} ctx - Contexto 2D del canvas
 * @param {Object} options - Opciones de configuración
 */
export const addWatermark = (canvas, ctx, options = {}) => {
  const {
    text, // Sin valor por defecto - OBLIGATORIO pasarlo
    fontSize = 26,
    fontFamily = "Arial",
    fontWeight = "bold",
    fillColor = "rgba(255, 255, 255, 0.35)",
    strokeColor = "rgba(0, 0, 0, 0.25)",
    strokeWidth = 1,
    rotation = -45,
    pattern = true,
    spacingX = 300,
    spacingY = 150
  } = options;

  // Validar que se pasó el texto
  if (!text) {
    console.warn('No se proporcionó texto para la marca de agua');
    return;
  }

  ctx.save();
  
  // Configurar el texto
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
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
    
    // Calcular cuántas repeticiones necesitamos (con margen extra)
    const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
    const cols = Math.ceil(diagonal / spacingX) + 2;
    const rows = Math.ceil(diagonal / spacingY) + 2;
    
    // Dibujar el patrón
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        ctx.save();
        
        const x = col * spacingX;
        const y = row * spacingY;
        
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
  
  // Calcular dimensiones totales
  let totalHeight = 0;
  let maxWidth = 0;
  
  images.forEach((img, index) => {
    totalHeight += img.height;
    if (index < images.length - 1) {
      totalHeight += spacing;
    }
    maxWidth = Math.max(maxWidth, img.width);
  });
  
  // Configurar canvas
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  
  // Fondo blanco
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Dibujar imágenes
  let currentY = 0;
  images.forEach((img) => {
    ctx.drawImage(img, 0, currentY);
    currentY += img.height + spacing;
  });
  
  // Añadir marca de agua
  addWatermark(canvas, ctx, watermarkOptions);
  
  return canvas;
};