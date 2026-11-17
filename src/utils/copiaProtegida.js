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

// La frase que acompaña a la copia en la zona de descarga
export function describirCopia({ hayTrasera, paginas = 1, marca = '' }) {
  const caras = hayTrasera ? 'Las dos caras' : 'La parte delantera';
  const hojas = paginas > 1 ? 'en dos hojas' : 'en una hoja';
  const texto = marca.trim();
  return `${caras} ${hojas}, ${texto ? `con la marca de agua «${texto}»` : 'sin marca de agua'}.`;
}
