// Giro de la foto recortada de una cara, para el DNI girado o boca abajo (botón «Girar» del editor)

async function cargarImagen(archivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo);
    } catch {
      // Algunos navegadores no decodifican todos los formatos con createImageBitmap. Se prueba con <img>
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const imagen = new Image();
    imagen.src = url;
    await imagen.decode();
    return imagen;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Gira la foto 90° a la derecha tantas veces como diga cuartos (de 1 a 3) y devuelve un archivo JPEG nuevo.
 * El archivo de partida no se toca, porque la detección guarda sus resultados por archivo
 */
export async function girarFoto(archivo, cuartos = 1) {
  const vueltas = ((cuartos % 4) + 4) % 4;
  const imagen = await cargarImagen(archivo);
  const ancho = imagen.width;
  const alto = imagen.height;
  const tumbada = vueltas % 2 === 1;

  const lienzo = document.createElement('canvas');
  lienzo.width = tumbada ? alto : ancho;
  lienzo.height = tumbada ? ancho : alto;
  const contexto = lienzo.getContext('2d');
  contexto.translate(lienzo.width / 2, lienzo.height / 2);
  contexto.rotate((vueltas * Math.PI) / 2);
  contexto.drawImage(imagen, -ancho / 2, -alto / 2);
  imagen.close?.();

  // Misma calidad que el recorte manual
  const blob = await new Promise((resolve, reject) => {
    lienzo.toBlob((resultado) => (resultado ? resolve(resultado) : reject(new Error('No se pudo girar la foto'))), 'image/jpeg', 0.95);
  });
  lienzo.width = 0;
  lienzo.height = 0;
  return new File([blob], archivo.name, { type: 'image/jpeg', lastModified: Date.now() });
}
