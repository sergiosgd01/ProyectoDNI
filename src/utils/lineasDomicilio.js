/**
 * Líneas del domicilio del reverso (CEN-2).
 *
 * El modelo ve el domicilio como un solo bloque (DOMICILIO). Debajo de la etiqueta «DOMICILIO» hay sitio para cuatro
 * líneas, que se llenan de arriba abajo: la calle en una o dos, el municipio y la provincia. Para tapar la calle y dejar a
 * la vista el municipio y la provincia, como pide el perfil Viajes, se buscan las líneas de texto en la parte izquierda
 * del bloque, donde empiezan todas. Las dos últimas son el municipio y la provincia, y todo lo de encima, la etiqueta
 * incluida, es la calle.
 *
 * Solo se parte si se ven la etiqueta y las cuatro líneas. Con tres no se puede saber si es una calle de una línea o si
 * un reflejo ha borrado la provincia, y entonces la última sería el municipio y la segunda línea de la calle quedaba a la
 * vista (revisión del 23/11/2026). Sin la etiqueta tampoco, porque una etiqueta alargada por una mancha podía pasar por
 * la primera línea (tercera revisión). En las fotos reales del banco salen la etiqueta y las cuatro líneas, y en los
 * sintéticos solo tres líneas, que se tapan enteras.
 *
 * Las fotos suelen quedar algo giradas, y la calle es larga. Con 5° de giro su final baja más que el corte medido a la
 * izquierda y quedaba a la vista (B07 en el banco, 23/11/2026). Por eso se mide la inclinación de las líneas, el corte
 * sigue esa inclinación en tiras estrechas y todo lo que queda a la derecha del municipio y la provincia, que son cortos,
 * se tapa de arriba abajo.
 *
 * Solo se usa para dejar a la vista el municipio y la provincia. Si las líneas no salen claras (no hay cuatro, no tienen
 * el mismo alto, no van al mismo paso o están muy inclinadas), no se parte nada y se tapa el bloque entero, como antes.
 */

// Parte del ancho del bloque, desde la izquierda, en la que se buscan las líneas. Todas empiezan ahí, y más a la derecha
// el bloque llega al mapa de España
const ANCHO_ANALISIS = 0.3;
// Filas de más que se miran por encima y por debajo del bloque, en fracción de su alto
const EXTRA_VERTICAL = 0.12;
// Un píxel es tinta si está más cerca del texto que del fondo. El texto es casi negro y la marca de agua «DNI» que hay
// debajo del domicilio es gris claro, así que se queda fuera
const UMBRAL_TINTA = 0.45;
// Una fila es de texto si tiene al menos esta parte de la tinta de la fila más cargada
const FILA_DE_TEXTO = 0.2;
// Líneas que caben debajo de la etiqueta
const LINEAS_DOMICILIO = 4;
// La etiqueta es más baja que las líneas (en el banco, entre 0,34 y 0,65 de su alto) y su centro queda más cerca de la
// primera línea que las líneas entre sí (en las fotos reales, entre 0,69 y 0,78 del paso)
const ETIQUETA_MAXIMA = 0.75;
const PASO_ETIQUETA = [0.5, 0.9];
// Las líneas tienen que tener casi el mismo alto y estar al mismo paso. En las fotos reales del banco varían menos de un
// 5 %
const DIFERENCIA_ALTO = 0.15;
const DIFERENCIA_PASO = 0.12;
// Inclinaciones que se prueban, en píxeles de bajada por píxel de ancho. 0,12 son unos 7°. Si la mejor es la del tope,
// el giro puede ser mayor y no se parte
const INCLINACION_MAXIMA = 0.12;
const PASO_INCLINACION = 0.003;
// Ancho de las tiras en las que se corta la calle, en píxeles
const ANCHO_TIRA = 24;
// La calle baja hasta tres cuartos del hueco con el municipio, para no dejar ni un trazo suyo a la vista
const BAJADA_EN_HUECO = 0.75;

const percentil = (valores, p) => {
  const v = Float32Array.from(valores).sort();
  return v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
};

/**
 * Qué píxeles son tinta en una imagen en gris, o null si no hay contraste.
 * @returns {Uint8Array|null}
 */
export function tinta(gris) {
  const oscuro = percentil(gris, 0.03);
  const fondo = percentil(gris, 0.7);
  if (fondo - oscuro < 30) return null;
  const umbral = oscuro + UMBRAL_TINTA * (fondo - oscuro);
  return Uint8Array.from(gris, (g) => (g < umbral ? 1 : 0));
}

// Tinta de cada fila de las columnas [0, ancho), contando cada píxel en la fila que le toca al enderezar la inclinación
// alrededor de la columna central. Lo que se sale por arriba o por abajo no cuenta
function perfil(mascara, anchoTotal, ancho, alto, pendiente) {
  const filas = new Float32Array(alto);
  const centro = ancho / 2;
  for (let x = 0; x < ancho; x++) {
    const desplazamiento = pendiente * (x - centro);
    for (let y = 0; y < alto; y++) {
      if (!mascara[y * anchoTotal + x]) continue;
      const fila = Math.round(y - desplazamiento);
      if (fila >= 0 && fila < alto) filas[fila]++;
    }
  }
  return filas.map((n) => n / ancho);
}

/**
 * Inclinación de las líneas de texto, la que deja las filas más marcadas (más tinta en unas, casi nada en otras).
 * @returns {number|null} Píxeles de bajada por píxel de ancho, o null si la mejor es la del tope y el texto puede estar
 *   más girado
 */
export function inclinacion(mascara, anchoTotal, ancho, alto) {
  let mejor = 0;
  let nota = -1;
  for (let p = -INCLINACION_MAXIMA; p <= INCLINACION_MAXIMA + 1e-9; p += PASO_INCLINACION) {
    const filas = perfil(mascara, anchoTotal, ancho, alto, p);
    const valor = filas.reduce((s, f) => s + f * f, 0);
    if (valor > nota + 1e-9) {
      nota = valor;
      mejor = p;
    }
  }
  if (Math.abs(mejor) >= INCLINACION_MAXIMA - PASO_INCLINACION / 2) return null;
  return Math.abs(mejor) < 1e-9 ? 0 : mejor;
}

/**
 * Bandas de filas con texto, ya enderezadas.
 * @param {Uint8Array} mascara - Tinta (1) o fondo (0), fila a fila, de anchoTotal columnas
 * @param {number} anchoTotal - Columnas de la máscara
 * @param {number} ancho - Columnas que se miran, desde la izquierda
 * @param {number} alto
 * @param {number} pendiente - Inclinación de las líneas (ver inclinacion)
 * @returns {Array<{y0: number, y1: number, tinta: number}>} y1 no incluida. tinta es la media de la fila
 */
export function bandasDeTexto(mascara, anchoTotal, ancho, alto, pendiente = 0) {
  if (!mascara || !ancho || !alto) return [];
  const filas = perfil(mascara, anchoTotal, ancho, alto, pendiente);
  // Media de tres filas para que un trazo horizontal fino no parta una línea
  const suaves = filas.map((_, y) => (filas[Math.max(0, y - 1)] + filas[y] + filas[Math.min(alto - 1, y + 1)]) / 3);
  const maximo = Math.max(...suaves);
  if (maximo <= 0) return [];
  let bandas = [];
  for (let y = 0; y < alto; y++) {
    if (suaves[y] < FILA_DE_TEXTO * maximo) continue;
    const ultima = bandas.at(-1);
    if (ultima && ultima.y1 === y) ultima.y1 = y + 1;
    else bandas.push({ y0: y, y1: y + 1 });
  }
  if (!bandas.length) return [];
  // Se juntan los cortes muy pequeños dentro de una misma línea y se quitan las motas sueltas
  const altoTipico = percentil(bandas.map((b) => b.y1 - b.y0), 0.75);
  bandas = bandas.reduce((juntas, b) => {
    const ultima = juntas.at(-1);
    if (ultima && b.y0 - ultima.y1 < 0.2 * altoTipico) ultima.y1 = b.y1;
    else juntas.push({ ...b });
    return juntas;
  }, []).filter((b) => b.y1 - b.y0 >= 0.3 * altoTipico);
  return bandas.map((b) => {
    let suma = 0;
    for (let y = b.y0; y < b.y1; y++) suma += filas[y];
    return { ...b, tinta: suma / (b.y1 - b.y0) };
  });
}

const altoDe = (banda) => banda.y1 - banda.y0;
const mediana = (valores) => {
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

/**
 * Parte las bandas del domicilio en calle, municipio y provincia, o null si no salen claras. Hacen falta la etiqueta y
 * las cuatro líneas.
 * @param {Array<{y0: number, y1: number, tinta: number}>} bandas - De arriba abajo (bandasDeTexto)
 * @param {number} alto - Alto de la zona analizada, para que la calle empiece arriba del todo y la provincia acabe abajo
 * @returns {{calle: number[], municipio: number[], provincia: number[], hueco: number}|null} Filas [y0, y1) de cada
 *   parte, enderezadas, y el hueco entre la última línea de la calle y el municipio
 */
export function partirBandas(bandas, alto) {
  if (bandas.length !== LINEAS_DOMICILIO + 1) return null;
  const [etiqueta, ...lineas] = bandas;
  const altoMedio = mediana(lineas.map(altoDe));
  if (lineas.some((x) => Math.abs(altoDe(x) - altoMedio) > DIFERENCIA_ALTO * altoMedio)) return null;
  const centro = (x) => (x.y0 + x.y1) / 2;
  const centros = lineas.map(centro);
  const pasos = centros.slice(1).map((c, i) => c - centros[i]);
  const paso = mediana(pasos);
  if (paso <= 0 || pasos.some((p) => Math.abs(p - paso) > DIFERENCIA_PASO * paso)) return null;
  // La primera banda tiene que ser la etiqueta
  const pasoEtiqueta = centros[0] - centro(etiqueta);
  if (altoDe(etiqueta) > ETIQUETA_MAXIMA * altoMedio) return null;
  if (pasoEtiqueta < PASO_ETIQUETA[0] * paso || pasoEtiqueta > PASO_ETIQUETA[1] * paso) return null;
  // Todas tienen que ser texto de verdad, no manchas más claras
  const tintaMedia = mediana(lineas.map((x) => x.tinta));
  if (lineas.some((x) => x.tinta < 0.35 * tintaMedia)) return null;
  const [, calle, municipio, provincia] = lineas;
  const corteCalle = Math.round((calle.y1 + municipio.y0) / 2);
  const corteProvincia = Math.round((municipio.y1 + provincia.y0) / 2);
  return {
    calle: [0, corteCalle], municipio: [corteCalle, corteProvincia], provincia: [corteProvincia, alto],
    hueco: Math.max(0, municipio.y0 - calle.y1),
  };
}

/**
 * Hasta dónde llegan, por la derecha, el municipio y la provincia. Se recorren las columnas desde la izquierda y el texto
 * acaba donde hay un hueco sin tinta de más de tres altos de línea, para no llegar al mapa de España.
 * @returns {number} Primera columna después del texto
 */
export function finDelTexto(mascara, anchoTotal, alto, pendiente, centro, desde, hasta, altoLinea) {
  let fin = 0;
  for (let x = 0; x < anchoTotal; x++) {
    const desplazamiento = pendiente * (x - centro);
    let n = 0;
    for (let fila = desde; fila < hasta; fila++) {
      const y = Math.round(fila + desplazamiento);
      if (y >= 0 && y < alto && mascara[y * anchoTotal + x]) n++;
    }
    if (n >= 2) fin = x + 1;
    else if (x - fin > 3 * altoLinea) break;
  }
  return fin;
}

/**
 * Rectángulos que tapan la calle sin tapar el municipio ni la provincia, en las coordenadas de la zona analizada. centro
 * es la columna alrededor de la que se enderezaron las líneas.
 * @returns {Array<{x: number, y: number, width: number, height: number}>}
 */
export function tirasDeLaCalle(anchoTotal, alto, pendiente, centro, partes, finMunicipio) {
  const corte = partes.calle[1] + (BAJADA_EN_HUECO - 0.5) * partes.hueco;
  const bajo = (x) => corte + pendiente * (x - centro);
  const tiras = [];
  // Hasta donde acaban el municipio y la provincia, tiras estrechas que siguen la inclinación
  const limite = Math.min(anchoTotal, finMunicipio + ANCHO_TIRA);
  for (let x = 0; x < limite; x += ANCHO_TIRA) {
    const x1 = Math.min(limite, x + ANCHO_TIRA);
    // Hasta el punto más bajo del corte en la tira, para que la calle no asome por el lado que baja
    const y1 = Math.min(alto, Math.max(0, Math.max(bajo(x), bajo(x1))));
    if (y1 > 0) tiras.push({ x, y: 0, width: x1 - x, height: y1 });
  }
  // A la derecha del municipio y la provincia solo puede seguir la calle, y se tapa de arriba abajo
  if (limite < anchoTotal) tiras.push({ x: limite, y: 0, width: anchoTotal - limite, height: alto });
  return tiras;
}

/**
 * Rectángulos que tapan la calle del domicilio dentro de la foto, o null si no se puede separar del municipio y la
 * provincia.
 * @param {Blob} foto - La foto del reverso, la misma en la que se detectó la caja
 * @param {{x: number, y: number, width: number, height: number}} caja - Caja DOMICILIO del modelo
 * @returns {Promise<{calle: Array<{x: number, y: number, width: number, height: number}>, pendiente: number}|null>}
 */
export async function lineasDelDomicilio(foto, caja) {
  const mapa = await createImageBitmap(foto);
  try {
    const y0 = Math.max(0, Math.floor(caja.y - EXTRA_VERTICAL * caja.height));
    const y1 = Math.min(mapa.height, Math.ceil(caja.y + caja.height * (1 + EXTRA_VERTICAL)));
    const x0 = Math.max(0, Math.floor(caja.x));
    const x1 = Math.min(mapa.width, Math.ceil(caja.x + caja.width));
    const ancho = x1 - x0;
    const alto = y1 - y0;
    const anchoAnalisis = Math.round(ANCHO_ANALISIS * ancho);
    if (anchoAnalisis < 8 || alto < 8) return null;
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(mapa, x0, y0, ancho, alto, 0, 0, ancho, alto);
    const { data } = ctx.getImageData(0, 0, ancho, alto);
    const gris = new Float32Array(ancho * alto);
    for (let i = 0; i < gris.length; i++) gris[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    // El contraste se mide en la parte izquierda, la del texto
    const izquierda = new Float32Array(anchoAnalisis * alto);
    for (let y = 0; y < alto; y++) izquierda.set(gris.subarray(y * ancho, y * ancho + anchoAnalisis), y * anchoAnalisis);
    const mascaraIzquierda = tinta(izquierda);
    if (!mascaraIzquierda) return null;
    const pendiente = inclinacion(mascaraIzquierda, anchoAnalisis, anchoAnalisis, alto);
    if (pendiente === null) return null;
    const bandas = bandasDeTexto(mascaraIzquierda, anchoAnalisis, anchoAnalisis, alto, pendiente);
    const partes = partirBandas(bandas, alto);
    if (!partes) return null;
    // Con el mismo umbral, la tinta de todo el ancho, para saber hasta dónde llegan el municipio y la provincia
    const oscuro = percentil(izquierda, 0.03);
    const fondo = percentil(izquierda, 0.7);
    const umbral = oscuro + UMBRAL_TINTA * (fondo - oscuro);
    const mascara = Uint8Array.from(gris, (g) => (g < umbral ? 1 : 0));
    const altoLinea = bandas.at(-1).y1 - bandas.at(-1).y0;
    const centro = anchoAnalisis / 2;
    const fin = finDelTexto(mascara, ancho, alto, pendiente, centro, partes.municipio[0], partes.provincia[1], altoLinea);
    const tiras = tirasDeLaCalle(ancho, alto, pendiente, centro, partes, fin);
    return { calle: tiras.map((t) => ({ ...t, x: t.x + x0, y: t.y + y0 })), pendiente };
  } finally {
    mapa.close?.();
  }
}
