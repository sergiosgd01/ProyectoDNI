/**
 * Utilidades de validación de archivos
 * Proporciona validación robusta para archivos subidos por el usuario
 */

// Configuración de validación
// Peso máximo de la foto que elige el usuario. Antes de subirla se reduce en el navegador
// (ver imageResize.js), por eso puede superar el límite del servidor
export const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
// Peso máximo que acepta el servidor de recorte
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
// Las HEIC no están porque se convierten a JPEG antes de validarlas (ver convertirHeic.js)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Lado máximo de la foto. Llega a las de 200 MP de los móviles (16320 x 12240). Antes de subirla se reduce en el
// navegador (ver imageResize.js), así que al servidor le llega igual que cualquier otra
export const MAX_IMAGE_DIMENSION = 16384;
// Lado máximo de una HEIC, más bajo porque se descodifica entera en la memoria del navegador (ver convertirHeic.js).
// Las del iPhone no pasan de 8064 px
export const MAX_HEIC_DIMENSION = 10000;

// Error con el motivo del rechazo ('formato', 'peso', 'dimensiones' o 'contenido'), para explicárselo a la persona con un texto propio
const errorDeValidacion = (mensaje, motivo) => Object.assign(new Error(mensaje), { motivo });

/**
 * Valida el tipo MIME y el tamaño del archivo
 * @param {File} file - Archivo a validar
 * @throws {Error} Si el archivo no cumple los requisitos
 */
export const validateFile = (file) => {
  if (!file) {
    throw errorDeValidacion('No se proporcionó ningún archivo', 'contenido');
  }

  // Validar tipo MIME exacto (no solo startsWith)
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw errorDeValidacion('Solo se permiten imágenes JPG, PNG o WEBP', 'formato');
  }

  // Validar tamaño del archivo
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    throw errorDeValidacion(`El archivo (${sizeMB}MB) excede el límite de 30MB`, 'peso');
  }

  console.log('✅ Validación básica pasada:', file.name, `(${(file.size / 1024).toFixed(2)}KB)`);
};

/**
 * Valida que el archivo sea realmente una imagen decodificable
 * @param {File} file - Archivo a validar
 * @returns {Promise<boolean>} True si es una imagen válida
 * @throws {Error} Si el archivo no es una imagen válida
 */
export const validateImageContent = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Verificar dimensiones razonables
      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        URL.revokeObjectURL(objectUrl);
        reject(errorDeValidacion(`Imagen demasiado grande (${img.width}x${img.height}). Máximo: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}`, 'dimensiones'));
        return;
      }

      // Verificar que tenga dimensiones válidas
      if (img.width === 0 || img.height === 0) {
        URL.revokeObjectURL(objectUrl);
        reject(errorDeValidacion('La imagen no tiene dimensiones válidas', 'contenido'));
        return;
      }

      console.log('✅ Validación de contenido pasada:', `${img.width}x${img.height}`);
      URL.revokeObjectURL(objectUrl);
      resolve(true);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(errorDeValidacion('El archivo no es una imagen válida o está corrupto', 'contenido'));
    };

    img.src = objectUrl;
  });
};

/**
 * Sanitiza el nombre del archivo removiendo caracteres peligrosos
 * @param {string} filename - Nombre original del archivo
 * @returns {string} Nombre sanitizado
 */
export const sanitizeFileName = (filename) => {
  if (!filename) {
    return 'archivo_sin_nombre.jpg';
  }

  // Remover caracteres peligrosos, mantener solo alfanuméricos, puntos y guiones
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevenir path traversal
  const withoutTraversal = safeName.replace(/\.\./g, '_');

  // Limitar longitud
  const maxLength = 255;
  const truncated = withoutTraversal.slice(0, maxLength);

  console.log('🔒 Nombre sanitizado:', filename, '→', truncated);
  return truncated;
};

/**
 * Validación completa de archivo (combina todas las validaciones)
 * @param {File} file - Archivo a validar
 * @returns {Promise<string>} Nombre sanitizado del archivo
 * @throws {Error} Si alguna validación falla
 */
export const validateFileComplete = async (file) => {
  // 1. Validación básica (tipo y tamaño)
  validateFile(file);

  // 2. Validación de contenido (imagen real)
  await validateImageContent(file);

  // 3. Sanitizar nombre
  const safeName = sanitizeFileName(file.name);

  return safeName;
};
