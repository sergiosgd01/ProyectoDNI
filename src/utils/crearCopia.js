// Crea en el navegador los archivos de la copia protegida (nombres y cuentas en copiaProtegida.js). La marca de agua
// se pone como antes al descargar, con addWatermark de watermark.js y JPEG de calidad 0,95. Las imágenes se
// codifican con toBlob, que no para la página, y el PDF lleva esos mismos JPEG sin volver a comprimirlos
import { addWatermark, combineImagesWithWatermark } from './watermark';
import { disponerEnA4 } from './copiaProtegida';

const CALIDAD_JPEG = 0.95;

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error('No se ha podido cargar la imagen procesada'));
    imagen.src = url;
  });
}

function aJpeg(lienzo, calidad = CALIDAD_JPEG) {
  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se ha podido crear la imagen'))),
      'image/jpeg',
      calidad
    );
  });
}

// Una cara con la marca de agua, en JPEG y a su tamaño
export async function caraConMarca(url, marca) {
  const imagen = await cargarImagen(url);
  const lienzo = document.createElement('canvas');
  lienzo.width = imagen.naturalWidth;
  lienzo.height = imagen.naturalHeight;
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(imagen, 0, 0);
  if (marca) addWatermark(lienzo, ctx, { text: marca });
  return { blob: await aJpeg(lienzo), ancho: lienzo.width, alto: lienzo.height };
}

// Una cara en pequeño con la marca de agua, para enseñar cómo queda la hoja. addWatermark calcula la letra y el
// espacio con el tamaño de la imagen, así que la marca sale con las mismas proporciones que en la copia
export async function miniaturaConMarca(url, marca, ancho = 240) {
  const imagen = await cargarImagen(url);
  const escala = ancho / imagen.naturalWidth;
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = Math.round(imagen.naturalHeight * escala);
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  if (marca) addWatermark(lienzo, ctx, { text: marca, strokeWidth: Math.max(0.3, escala) });
  return lienzo.toDataURL('image/jpeg', 0.85);
}

// El PDF, una hoja A4 con las caras ya con la marca de agua (ver disponerEnA4). jsPDF se carga aquí y no al abrir
// la web, porque solo hace falta al terminar de procesar
export async function crearPdf(caras) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { caras: sitios } = disponerEnA4(caras);
  let pagina = 1;
  for (const [i, cara] of caras.entries()) {
    const sitio = sitios[i];
    if (sitio.pagina > pagina) {
      pdf.addPage();
      pagina = sitio.pagina;
    }
    const bytes = new Uint8Array(await cara.blob.arrayBuffer());
    pdf.addImage(bytes, 'JPEG', sitio.x, sitio.y, sitio.ancho, sitio.alto, undefined, 'FAST');
  }
  return pdf.output('blob');
}

// Las dos caras en una sola imagen, una encima de otra y con la marca de agua por encima de las dos
export async function crearImagenDosCaras(urls, marca) {
  const lienzo = await combineImagesWithWatermark(urls, 20, { text: marca });
  return aJpeg(lienzo);
}

// Guarda un archivo en el dispositivo. La dirección temporal se libera un minuto después, porque algunos
// navegadores cancelan la descarga si se libera enseguida
export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
