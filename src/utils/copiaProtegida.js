// La copia protegida que se descarga al terminar. Aquí van los nombres de los archivos y las cuentas, sin nada del
// navegador, para poder probarlas con npm test. Lo que dibuja las imágenes y monta el PDF está en crearCopia.js

// Nombres de los archivos. Son los que ve quien recibe la copia
export const NOMBRES_COPIA = {
  pdf: 'dni-protegido.pdf',
  dosCaras: 'dni-protegido.jpg',
  delantera: 'dni-protegido-delantera.jpg',
  trasera: 'dni-protegido-trasera.jpg'
};

// Hoja A4 en vertical, en milímetros
export const A4 = { ancho: 210, alto: 297, margen: 10, separacion: 10 };

// Dónde va cada cara en el PDF. Cada una ocupa el ancho de la hoja menos los márgenes, con su proporción, y la
// trasera va debajo de la delantera. Si no cabe, pasa a una hoja nueva. Es la disposición que ya tenía el PDF.
// caras es la lista de tamaños de las imágenes ({ ancho, alto }, en píxeles). Devuelve cuántas hojas salen y, en
// milímetros, la hoja y la posición de cada cara
export function disponerEnA4(caras, hoja = A4) {
  const ancho = hoja.ancho - hoja.margen * 2;
  let pagina = 1;
  let y = hoja.margen;
  const colocadas = caras.map((cara, i) => {
    const alto = ancho * (cara.alto / cara.ancho);
    if (i > 0) {
      y += hoja.separacion;
      if (y + alto > hoja.alto - hoja.margen) {
        pagina += 1;
        y = hoja.margen;
      }
    }
    const colocada = { pagina, x: hoja.margen, y, ancho, alto };
    y += alto;
    return colocada;
  });
  return { paginas: pagina, caras: colocadas };
}

// Si el navegador puede abrir el menú del sistema para compartir el PDF (WhatsApp, correo...). Se pregunta con un PDF
// de prueba, porque cada navegador acepta tipos de archivo distintos. Sin navigator.canShare (Firefox en el ordenador,
// navegadores antiguos) no se puede, y entonces solo queda descargar
export function puedeCompartirPdf(nav = globalThis.navigator) {
  try {
    if (typeof nav?.share !== 'function' || typeof nav?.canShare !== 'function') return false;
    const prueba = new File([new Uint8Array([37, 80, 68, 70])], NOMBRES_COPIA.pdf, { type: 'application/pdf' });
    return nav.canShare({ files: [prueba] }) === true;
  } catch {
    return false;
  }
}

// Qué hacer cuando navigator.share falla. 'cancelado' si la persona cerró el menú sin elegir nada, 'repetir' si el
// navegador no lo abrió porque pasó demasiado rato desde que se pulsó (Safari, si la copia aún se estaba preparando)
// y 'fallo' en el resto de casos
export function motivoErrorCompartir(error) {
  if (error?.name === 'AbortError') return 'cancelado';
  if (error?.name === 'NotAllowedError') return 'repetir';
  return 'fallo';
}

// La frase que acompaña a la copia en la zona de descarga
export function describirCopia({ hayTrasera, paginas = 1, marca = '' }) {
  const caras = hayTrasera ? 'Las dos caras' : 'La parte delantera';
  const hojas = paginas > 1 ? 'en dos hojas' : 'en una hoja';
  const texto = marca.trim();
  return `${caras} ${hojas}, ${texto ? `con la marca de agua «${texto}»` : 'sin marca de agua'}.`;
}
