/**
 * Pasa a JPEG las fotos HEIC, para que sigan el mismo camino que las demás (recorte en el servidor y editor).
 * Este archivo se descarga solo cuando llega una HEIC (import dinámico desde FileUploadZone). La foto no sale
 * del equipo.
 *
 * Si el navegador sabe abrir la HEIC, como Safari desde la versión 17, la abre él. Si no, la descodifica
 * libheif en un worker (src/workers/heic.worker.js).
 *
 * La foto sale como la dejaría la reducción de imageResize.js (VEL-1b), con el lado mayor en MAX_UPLOAD_SIDE
 * como mucho y en JPEG con la misma calidad, así que esa reducción ya no tiene que volver a tocarla.
 * Hacerlo aquí evita además un lienzo con la foto entera, que en un iPhone no puede pasar de 16 MP.
 * Al pasar por el lienzo se pierden los metadatos, entre ellos la ubicación.
 */
import { MAX_UPLOAD_SIDE, UPLOAD_JPEG_QUALITY } from './imageResize';
import { MAX_FILE_SIZE, MAX_IMAGE_DIMENSION } from './fileValidation';

// Si la conversión no termina en este tiempo se da por fallida. Una foto de 24 MP en un móvil lento tarda
// bastante menos
const TIEMPO_MAXIMO_MS = 60000;

// Error con el motivo, como los de fileValidation.js, para que la página explique qué ha pasado
const fallo = (mensaje, motivo) => Object.assign(new Error(mensaje), { motivo });

// El mismo nombre con .jpg, como si se hubiera elegido un JPEG
const nombreJpg = (nombre) => `${(nombre || 'foto').replace(/\.[^.]*$/, '')}.jpg`;

/** Dibuja la imagen en un lienzo, reducida si hace falta, y la devuelve en JPEG */
async function aJpeg(imagen, ancho, alto, original) {
  if (ancho > MAX_IMAGE_DIMENSION || alto > MAX_IMAGE_DIMENSION) {
    throw fallo(`Imagen demasiado grande (${ancho}x${alto})`, 'dimensiones');
  }
  const escala = Math.min(1, MAX_UPLOAD_SIDE / Math.max(ancho, alto));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(ancho * escala);
  lienzo.height = Math.round(alto * escala);

  try {
    const ctx = lienzo.getContext('2d');
    // Fondo blanco. Una parte transparente saldría negra en JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    const blob = await new Promise((resolve) => lienzo.toBlob(resolve, 'image/jpeg', UPLOAD_JPEG_QUALITY));
    if (!blob) throw fallo('El navegador no ha podido crear el JPEG', 'heic');
    return new File([blob], nombreJpg(original.name), { type: 'image/jpeg', lastModified: original.lastModified });
  } finally {
    // Libera la memoria del lienzo sin esperar al recolector
    lienzo.width = 0;
    lienzo.height = 0;
  }
}

/** La HEIC abierta por el propio navegador, o null si no sabe abrirla */
async function abrirConElNavegador(file) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

// Worker de libheif. Se crea con la primera HEIC que el navegador no sabe abrir y se cierra al quedarse sin
// trabajo, para devolver su memoria
let worker = null;
let siguienteId = 1;
// Conversiones que esperan respuesta, por su id
const pendientes = new Map();

const cerrarWorker = () => {
  worker?.terminate();
  worker = null;
};

const fallarPendientes = (error) => {
  const esperando = [...pendientes.values()];
  pendientes.clear();
  esperando.forEach(({ reject }) => reject(error));
};

const crearWorker = () => {
  const nuevo = new Worker(new URL('../workers/heic.worker.js', import.meta.url), { type: 'module' });
  nuevo.onmessage = ({ data }) => {
    const peticion = pendientes.get(data.id);
    if (!peticion) return;
    pendientes.delete(data.id);
    if (data.error) peticion.reject(fallo(data.error, data.motivo));
    else peticion.resolve(data);
  };
  // El archivo del worker no carga o el navegador no admite workers de tipo módulo
  nuevo.onerror = (evento) => {
    evento.preventDefault?.();
    cerrarWorker();
    fallarPendientes(fallo(evento.message || 'No se ha podido arrancar el worker de libheif', 'heic-carga'));
  };
  return nuevo;
};

/** Descodifica la HEIC con libheif. Devuelve { ancho, alto, datos } con los píxeles en RGBA */
async function descodificarConLibheif(file) {
  const datos = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const id = siguienteId++;
    const temporizador = setTimeout(() => {
      // El worker se ha quedado atascado. Se cierra y se dan por fallidas todas las que esperaban
      cerrarWorker();
      fallarPendientes(fallo('La conversión ha tardado demasiado', 'heic'));
    }, TIEMPO_MAXIMO_MS);
    const terminar = (accion) => (valor) => {
      clearTimeout(temporizador);
      if (!pendientes.size) cerrarWorker();
      accion(valor);
    };
    pendientes.set(id, { resolve: terminar(resolve), reject: terminar(reject) });

    try {
      if (!worker) worker = crearWorker();
      // El archivo se entrega al worker sin copiarlo
      worker.postMessage({ id, datos, maxLado: MAX_IMAGE_DIMENSION }, [datos]);
    } catch (error) {
      pendientes.delete(id);
      terminar(reject)(fallo(error?.message || String(error), 'heic-carga'));
    }
  });
}

/**
 * Convierte una foto HEIC en un JPEG listo para seguir con la subida.
 * Los errores llevan en motivo 'peso', 'dimensiones', 'heic' (no se ha podido convertir) o 'heic-carga'
 * (no se ha podido cargar libheif, por ejemplo sin conexión)
 * @param {File} file - Foto HEIC elegida, soltada o pegada
 * @returns {Promise<File>} La misma foto en JPEG
 */
export async function convertirHeicAJpeg(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw fallo(`El archivo (${(file.size / 1024 / 1024).toFixed(2)} MB) pesa más de 30 MB`, 'peso');
  }

  const abierta = await abrirConElNavegador(file);
  if (abierta) {
    try {
      return await aJpeg(abierta, abierta.width, abierta.height, file);
    } finally {
      abierta.close();
    }
  }

  const { ancho, alto, datos } = await descodificarConLibheif(file);
  let imagen;
  try {
    imagen = await createImageBitmap(new ImageData(new Uint8ClampedArray(datos), ancho, alto));
  } catch (error) {
    throw fallo(error?.message || String(error), 'heic');
  }
  try {
    return await aJpeg(imagen, ancho, alto, file);
  } finally {
    imagen.close();
  }
}
