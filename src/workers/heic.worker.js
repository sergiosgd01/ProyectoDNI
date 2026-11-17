/**
 * Descodifica fotos HEIC con libheif (WebAssembly) fuera del hilo principal, para los navegadores que no saben
 * abrirlas (Chrome, Firefox, Edge y Safari antes de la versión 17). En un Mac una foto de 12 MP tarda 0,3 s y
 * una de 48 MP 1,8 s, en un móvil más, y en el hilo principal la página se quedaría parada todo ese tiempo.
 *
 * El worker y el .wasm se descargan de la propia web la primera vez que llega una HEIC (ver
 * public/licencias/LEEME.txt). Se cierra al terminar para devolver la memoria, que con una foto de 24 MP
 * pasa de 200 MB (140 MB de libheif y la copia de los píxeles).
 *
 * Recibe { id, datos, maxLado }, con datos el archivo entero en un ArrayBuffer.
 * Responde { id, ancho, alto, datos } con los píxeles en RGBA, o { id, error, motivo }. El motivo es
 * 'heic-carga' si no se ha podido cargar libheif, 'dimensiones' si la foto es demasiado grande y 'heic' si
 * libheif no ha podido descodificarla.
 *
 * Al compilar, Vite avisa de que el cargador de libheif pide fs, path y crypto. Solo los usa en Node.
 */
import crearLibheif from 'libheif-js/libheif-wasm/libheif.js';
import urlWasm from 'libheif-js/libheif-wasm/libheif.wasm?url';

const fallo = (mensaje, motivo) => Object.assign(new Error(mensaje), { motivo });

// Se guarda la promesa de carga, para que dos fotos seguidas compartan la misma
let carga = null;

const cargarLibheif = () => {
  if (!carga) {
    carga = (async () => {
      const respuesta = await fetch(urlWasm);
      if (!respuesta.ok) throw new Error(`No se ha podido descargar libheif (${respuesta.status})`);
      const wasmBinary = await respuesta.arrayBuffer();
      // Con el .wasm ya descargado, libheif arranca sin esperas y avisa antes de devolver el módulo
      let avisar;
      let fallar;
      const iniciado = new Promise((resolve, reject) => {
        avisar = resolve;
        fallar = reject;
      });
      const libheif = crearLibheif({
        wasmBinary,
        onRuntimeInitialized: () => avisar(),
        onAbort: (motivo) => fallar(new Error(`libheif se ha parado: ${motivo}`)),
      });
      await iniciado;
      return libheif;
    })().catch((error) => {
      // Si falla, por ejemplo sin conexión, la siguiente foto lo vuelve a intentar
      carga = null;
      throw fallo(error?.message || String(error), 'heic-carga');
    });
  }
  return carga;
};

const descodificar = async (libheif, datos, maxLado) => {
  const decodificador = new libheif.HeifDecoder();
  let imagenes = [];
  try {
    imagenes = decodificador.decode(datos);
    // Las imágenes van en el orden del archivo, y la principal no siempre es la primera
    const imagen = imagenes.find((candidata) => candidata.is_primary()) || imagenes[0];
    if (!imagen) throw fallo('libheif no encuentra ninguna imagen en el archivo', 'heic');

    const ancho = imagen.get_width();
    const alto = imagen.get_height();
    if (ancho > maxLado || alto > maxLado) {
      throw fallo(`Imagen demasiado grande (${ancho}x${alto}). Máximo: ${maxLado}x${maxLado}`, 'dimensiones');
    }

    // Lo mismo que hace display() de libheif-js, pero con los errores a la vista. display() no avisa
    // si la descodificación lanza una excepción y la conversión se quedaría esperando para siempre.
    // libheif aplica el giro y el volteo que guarda la foto, como el visor del móvil
    const descodificada = await libheif.heif_js_decode_image2(
      imagen.handle,
      libheif.heif_colorspace.heif_colorspace_RGB,
      libheif.heif_chroma.heif_chroma_interleaved_RGBA
    );
    if (!descodificada || descodificada.code) throw fallo('libheif no ha podido descodificar la imagen', 'heic');

    try {
      const canal = descodificada.channels.find((c) => c.id === libheif.heif_channel.heif_channel_interleaved);
      if (!canal) throw fallo('libheif no ha devuelto los píxeles en RGBA', 'heic');
      // Cada fila puede llevar relleno al final (stride). Se copia sin él
      const fila = canal.width * 4;
      const pixeles = new Uint8ClampedArray(fila * canal.height);
      if (canal.stride === fila) {
        pixeles.set(canal.data.subarray(0, pixeles.length));
      } else {
        for (let y = 0; y < canal.height; y++) {
          pixeles.set(canal.data.subarray(y * canal.stride, y * canal.stride + fila), y * fila);
        }
      }
      return { ancho: canal.width, alto: canal.height, pixeles };
    } finally {
      libheif.heif_image_release(descodificada.image);
    }
  } finally {
    imagenes.forEach((candidata) => candidata.free());
    if (decodificador.decoder) libheif.heif_context_free(decodificador.decoder);
  }
};

const atender = async ({ id, datos, maxLado }) => {
  try {
    const libheif = await cargarLibheif();
    const { ancho, alto, pixeles } = await descodificar(libheif, new Uint8Array(datos), maxLado);
    self.postMessage({ id, ancho, alto, datos: pixeles.buffer }, [pixeles.buffer]);
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error), motivo: error?.motivo || 'heic' });
  }
};

// Las fotos se descodifican de una en una, para no tener dos en memoria a la vez
let cola = Promise.resolve();
self.onmessage = ({ data }) => {
  cola = cola.then(() => atender(data));
};
