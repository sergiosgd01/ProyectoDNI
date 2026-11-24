/**
 * Plantilla del DNI 4.0, con el sitio de cada dato en el carné.
 *
 * Con fotos reales el modelo de campos se deja a menudo la ventana del soporte, el CLI o alguna fecha, y la cara
 * acababa en censura manual (F9 y CEN-7). Con las cajas que sí encuentra se coloca la plantilla sobre la foto, con una
 * homografía (la forma en que se ve un papel inclinado), y lo que falta se tapa donde dice la plantilla. Si las cajas
 * encontradas no encajan bien con ella, la plantilla no se usa y todo sigue como antes. La plantilla también dice si
 * una caja del modelo está fuera de su sitio (MET-4).
 *
 * Las posiciones van de 0 a 1 en el carné, x de izquierda a derecha e y de arriba abajo. Salen de
 * dni-bench/estudio_plantilla.py con el modelo de public/models/best.onnx (23/11/2026). Con otro modelo hay que
 * repetir el estudio y copiar aquí lo que dé.
 */

// Caja mediana que pone el modelo en las clases que sirven para colocar la plantilla, y qué esquinas valen (0 arriba
// a la izquierda, 1 arriba a la derecha, 2 abajo a la derecha y 3 abajo a la izquierda). Son elementos impresos (ES,
// ESP, ESP_HOLO, OPT_VAR) y datos de largo fijo. De los de largo variable solo valen las esquinas donde empieza el texto
export const ANCLAS = {
  anverso: {
    ES: { caja: [0.026, 0.056, 0.142, 0.185], esquinas: [0, 1, 2, 3] },
    ESP: { caja: [0.167, 0.055, 0.284, 0.189], esquinas: [0, 1, 2, 3] },
    ESP_HOLO: { caja: [0.312, 0.191, 0.393, 0.283], esquinas: [0, 1, 2, 3] },
    OPT_VAR: { caja: [0.878, 0.050, 0.970, 0.140], esquinas: [0, 1, 2, 3] },
    CAN: { caja: [0.770, 0.823, 0.967, 0.920], esquinas: [0, 1, 2, 3] },
    CLI: { caja: [0.822, 0.663, 0.954, 0.723], esquinas: [0, 1, 2, 3] },
    NACIMIENTO: { caja: [0.782, 0.518, 0.974, 0.583], esquinas: [0, 1, 2, 3] },
    SEXO: { caja: [0.388, 0.522, 0.429, 0.581], esquinas: [0, 1, 2, 3] },
    SOPORTE: { caja: [0.380, 0.701, 0.566, 0.759], esquinas: [0, 1, 2, 3] },
    EMISIÓN: { caja: [0.384, 0.612, 0.572, 0.667], esquinas: [0, 3] },
    VALIDEZ: { caja: [0.583, 0.609, 0.776, 0.673], esquinas: [0, 3] },
    NACIONALIDAD: { caja: [0.513, 0.523, 0.587, 0.578], esquinas: [0, 3] },
  },
  reverso: {
    MRZ: { caja: [0.025, 0.655, 0.975, 0.924], esquinas: [0, 1] },
    SOPORTE_MIN: { caja: [0.117, 0.154, 0.229, 0.215], esquinas: [0, 1, 2, 3] },
    EQUIPO: { caja: [0.026, 0.283, 0.079, 0.549], esquinas: [2, 3] },
    DOMICILIO: { caja: [0.259, 0.058, 0.994, 0.250], esquinas: [0] },
    LUGAR_NACIMIENTO: { caja: [0.268, 0.331, 0.734, 0.467], esquinas: [0, 3] },
    HIJO_DE: { caja: [0.276, 0.505, 0.714, 0.596], esquinas: [0, 3] },
  },
};

// Dónde puede estar cada dato que se puede tapar sin haberlo encontrado. Juntan las regiones de dos especímenes y lo
// que ocupaban las cajas del modelo en 90 recortes del banco, 15 de ellos de fotos reales. El CLI es la imagen láser
// entera, con su cara pequeña y la fecha, aunque la caja del modelo solo coge la fecha. Faltan a propósito los datos de
// largo variable (nombre, apellidos, domicilio, lugar de nacimiento y progenitores), que pueden salirse de una zona fija,
// y la MRZ, que el modelo casi nunca pierde y que la plantilla coloca peor
export const ZONAS = {
  anverso: {
    CAN: [0.765, 0.810, 0.973, 0.924],
    CLI: [0.815, 0.600, 0.972, 0.790],
    EMISIÓN: [0.376, 0.601, 0.587, 0.675],
    FIRMA: [0.364, 0.757, 0.738, 0.937],
    FOTOGRAFIA: [0.004, 0.240, 0.384, 0.979],
    NACIMIENTO: [0.771, 0.511, 0.986, 0.594],
    NACIONALIDAD: [0.507, 0.517, 0.599, 0.582],
    NUM_DNI: [0.426, 0.143, 0.762, 0.275],
    NUM_DNI_MIN: [0.011, 0.178, 0.179, 0.253],
    SEXO: [0.377, 0.517, 0.432, 0.584],
    SOPORTE: [0.372, 0.694, 0.577, 0.767],
    SOPORTE_MIN: [0.766, 0.153, 0.896, 0.224],
    VALIDEZ: [0.578, 0.598, 0.787, 0.681],
  },
  reverso: {
    SOPORTE_MIN: [0.071, 0.127, 0.230, 0.249],
    EQUIPO: [0.018, 0.258, 0.089, 0.568],
  },
};

// Zonas de los datos de largo variable del anverso. No se tapan nunca sin haberlos encontrado, solo sirven para saber
// si su caja está en su sitio
const ZONAS_SOLO_PARA_COMPROBAR = {
  anverso: {
    APELLIDOS: [0.380, 0.271, 0.660, 0.425],
    NOMBRE: [0.376, 0.417, 0.650, 0.506],
  },
  reverso: {},
};

// Margen alrededor de cada zona, en fracción del carné, cuando hay anclas cerca. Lejos de las anclas que han encajado la
// plantilla se puede equivocar más, sobre todo si faltan varios datos vecinos a la vez. Por eso el margen crece con la
// distancia a la ancla más cercana (apoyo) y, a partir de APOYO_MAXIMO, la zona ya no se tapa sin haberla encontrado
// (ver margenDeZona). Con el código de aquí, en 89 recortes del banco y quitando a la vez hasta cinco datos vecinos,
// todas las zonas rellenadas taparon entera la caja que el modelo sí había encontrado (23/11/2026). Con 0,015 de base
// se quedaba corta una, con un dedo en la esquina (E04). Lejos de las anclas, en esos recortes bastaba un margen de
// 0,0125, y en una simulación con más ruido hacía falta hasta 0,033. Con la distancia más larga que se admite, 0,45, el
// margen llega a 0,05. Así se sigue tapando sola la foto real de la cámara a la que le faltaban cinco datos de la
// derecha (la fecha de nacimiento queda a 0,37 de la ancla más cercana), y con más datos perdidos ya no
export const MARGEN_ZONA = 0.02;
const APOYO_SIN_EXTRA = 0.15;
const MARGEN_POR_APOYO = 0.1;
const APOYO_MAXIMO = 0.45;
// Cuánto puede quedar el centro de una zona fuera del rectángulo que forman las esquinas que han encajado, en fracción
// del carné, para taparla sin haberla encontrado. En el reverso hay pocas anclas y por encima de la ventana solo está la
// esquina del domicilio. Sin ella la plantilla extrapola la ventana desde abajo y la tapaba a medias (en el banco, sin la
// ventana ni el domicilio, hasta el 59 %, y con un poco de ruido en las cajas, hasta el 41 %). Entonces la zona no se
// tapa y se pide a mano, también si es la copia de otro dato (revisiones del 23/11/2026). En el anverso las anclas
// rodean casi todas las zonas y, en el banco, tapar fuera de ellas, como el CAN por debajo, tapa entera la caja que falta
const EXTRAPOLACION_MAXIMA = { anverso: Infinity, reverso: 0 };
// La plantilla solo se usa si las cajas encontradas encajan con ella. El error medio que queda, en fracción del alto
// de la foto, no puede pasar de esto, y hacen falta al menos estas clases distintas. En el estudio los recortes buenos
// quedaron por debajo del 1,5 % y los que no se podían usar (DNI girado o boca abajo) por encima del 2 %
const RESIDUO_MAXIMO = 0.02;
const CLASES_MINIMAS = { anverso: 5, reverso: 4 };
// Al ajustar se descartan los puntos que quedan a más de 2,5 veces el error típico, pero nunca a menos de esto, en
// fracción del alto. Con un 1 % se descartaban esquinas buenas de fotos algo giradas, y el ajuste se podía quedar con
// puntos casi en línea, que no sujetan la plantilla (revisión del 23/11/2026)
const SUELO_DESCARTE = 0.02;
// El ajuste tiene que explicar casi todas las esquinas encontradas, y al menos estas
const FRACCION_MINIMA_PUNTOS = 0.7;
const PUNTOS_MINIMOS = 6;
// El recorte ya es el carné, así que cada esquina del carné colocado tiene que caer cerca de la esquina de la foto, a
// menos de esto en fracción de su diagonal. Un recorte real del S24, girado 4°, tenía una esquina al 10 %, y la
// plantilla deformada de la revisión del 23/11/2026, al 41 %
const DESVIO_MAXIMO_ESQUINA = 0.2;
// Una caja está fuera de su sitio si sus esquinas fijas quedan de media a más de esto de donde dice la plantilla, o si
// su centro cae fuera de su zona más esto, en fracción del carné
const TOLERANCIA_SITIO = 0.03;
// Cajas que no se comprueban. En la mitad de abajo del reverso solo está la MRZ, y la plantilla la coloca peor que el
// modelo. En el banco, con un dedo en la esquina (E04), la daba por mal puesta y mandaba la cara a mano sin motivo
const SITIO_SIN_COMPROBAR = { anverso: [], reverso: ['MRZ'] };

const esquinasDe = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const esquinasDeCaja = (d) => esquinasDe([d.x, d.y, d.x + d.width, d.y + d.height]);

// Resuelve el sistema A·x = b por eliminación de Gauss con pivote parcial. Devuelve null si no tiene solución única
function resolver(A, b) {
  const n = b.length;
  const M = A.map((fila, i) => [...fila, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[p][c])) p = f;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let f = c + 1; f < n; f++) {
      const k = M[f][c] / M[c][c];
      for (let j = c; j <= n; j++) M[f][j] -= k * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let f = n - 1; f >= 0; f--) {
    let s = M[f][n];
    for (let j = f + 1; j < n; j++) s -= M[f][j] * x[j];
    x[f] = s / M[f][f];
  }
  return x;
}

/**
 * Homografía que lleva los puntos del carné a los de la foto, por mínimos cuadrados.
 * @param {Array<{carne: number[], foto: number[]}>} pares - Al menos cuatro, la foto en unidades parecidas al carné
 * @returns {number[][]|null} Matriz 3 x 3, o null si los puntos no bastan
 */
export function homografia(pares) {
  const AtA = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const Atb = new Array(8).fill(0);
  const sumar = (fila, valor) => {
    for (let i = 0; i < 8; i++) {
      Atb[i] += fila[i] * valor;
      for (let j = 0; j < 8; j++) AtA[i][j] += fila[i] * fila[j];
    }
  };
  for (const { carne: [u, v], foto: [x, y] } of pares) {
    sumar([u, v, 1, 0, 0, 0, -u * x, -v * x], x);
    sumar([0, 0, 0, u, v, 1, -u * y, -v * y], y);
  }
  const h = pares.length >= 4 ? resolver(AtA, Atb) : null;
  return h && [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}

function aplicar(H, u, v) {
  const w = H[2][0] * u + H[2][1] * v + H[2][2];
  return [(H[0][0] * u + H[0][1] * v + H[0][2]) / w, (H[1][0] * u + H[1][1] * v + H[1][2]) / w, w];
}

function inversa(H) {
  const [[a, b, c], [d, e, f], [g, h, i]] = H;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

const mediana = (valores) => {
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

// Ajuste quitando poco a poco los puntos que no encajan. altoRelativo es el alto de la foto en las unidades de la foto
// de los pares. Devuelve la homografía, el error medio en fracción del alto, los puntos del carné que se han usado y
// cuántos había
function ajusteRobusto(pares, minimoClases, altoRelativo) {
  let usar = pares.map(() => true);
  let H = null;
  let residuos = [];
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    const activos = pares.filter((_, i) => usar[i]);
    if (new Set(activos.map((p) => p.clase)).size < minimoClases) return null;
    H = homografia(activos);
    if (!H) return null;
    residuos = pares.map(({ carne: [u, v], foto: [x, y] }) => {
      const [px, py] = aplicar(H, u, v);
      return Math.hypot(px - x, py - y);
    });
    const limite = Math.max(2.5 * 1.4826 * mediana(residuos.filter((_, i) => usar[i])), SUELO_DESCARTE * altoRelativo);
    const nuevo = residuos.map((r) => r <= limite);
    if (nuevo.every((u, i) => u === usar[i])) break;
    usar = nuevo;
  }
  const usados = pares.filter((_, i) => usar[i]);
  const clases = new Set(usados.map((p) => p.clase)).size;
  if (clases < minimoClases) return null;
  const errores = residuos.filter((_, i) => usar[i]);
  const residuo = Math.sqrt(errores.reduce((s, r) => s + r * r, 0) / errores.length) / altoRelativo;
  return { H, residuo, clases, usados: usados.map((p) => p.carne), puntos: usados.length, total: pares.length };
}

// La plantilla colocada tiene que parecerse al recorte, que ya es el carné. Sus esquinas tienen que formar un
// cuadrilátero sin cruces, con el mismo sentido que el carné, un área parecida a la de la foto y cada una cerca de la
// esquina de la foto que le toca. Un ajuste con los puntos casi en línea encaja con ellos pero deforma el resto
function colocacionRazonable(aFoto, ancho, alto) {
  const p = esquinasDe([0, 0, 1, 1]).map(([u, v]) => aFoto(u, v));
  if (p.some((q) => !Number.isFinite(q[0]) || !Number.isFinite(q[1]) || q[2] <= 0)) return false;
  const diagonal = Math.hypot(ancho, alto);
  const esquinasFoto = esquinasDe([0, 0, ancho, alto]);
  if (p.some((q, i) => Math.hypot(q[0] - esquinasFoto[i][0], q[1] - esquinasFoto[i][1]) > DESVIO_MAXIMO_ESQUINA * diagonal)) {
    return false;
  }
  const giros = p.map((q, i) => {
    const r = p[(i + 1) % 4];
    const s = p[(i + 2) % 4];
    return (r[0] - q[0]) * (s[1] - r[1]) - (r[1] - q[1]) * (s[0] - r[0]);
  });
  if (!giros.every((g) => g > 0)) return false;
  const area = Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % 4][1] - p[(i + 1) % 4][0] * q[1], 0)) / 2;
  const proporcion = area / (ancho * alto);
  return proporcion > 0.5 && proporcion < 1.6;
}

/**
 * Coloca la plantilla de una cara sobre su foto con las cajas que ha encontrado el modelo.
 * @param {Array} detecciones - Cajas del modelo en píxeles de la foto ({ label, x, y, width, height })
 * @param {'anverso'|'reverso'} cara
 * @param {{ancho: number, alto: number}} tamano - Tamaño de la foto en píxeles
 * @returns {Object} fiable dice si se puede usar. Si lo es, aFoto y aCarne pasan puntos de un sitio al otro y
 *   enSuSitio dice si una caja detectada está donde le toca. motivo lo explica en la consola
 */
export function ajustarPlantilla(detecciones, cara, tamano) {
  const anclas = ANCLAS[cara];
  const { ancho, alto } = tamano || {};
  if (!anclas || !ancho || !alto) return { fiable: false, motivo: 'sin plantilla ni tamaño de la foto' };
  // La foto se pasa a unidades parecidas a las del carné para que las cuentas no pierdan precisión
  const escala = Math.max(ancho, alto);
  const pares = [];
  for (const d of detecciones) {
    const ancla = anclas[d.label];
    if (!ancla) continue;
    const carne = esquinasDe(ancla.caja);
    const foto = esquinasDeCaja(d);
    for (const e of ancla.esquinas) {
      pares.push({ clase: d.label, carne: carne[e], foto: [foto[e][0] / escala, foto[e][1] / escala] });
    }
  }
  const minimo = CLASES_MINIMAS[cara];
  const aFotoDe = (H) => (u, v) => {
    const [x, y, w] = aplicar(H, u, v);
    return [x * escala, y * escala, w];
  };
  // Por qué no vale un ajuste, o null si vale
  const fallo = (a) => {
    if (!a) return `menos de ${minimo} clases para colocar la plantilla`;
    if (a.residuo > RESIDUO_MAXIMO) return `la plantilla no encaja (error del ${Math.round(a.residuo * 1000) / 10} % del alto)`;
    if (a.puntos < PUNTOS_MINIMOS || a.puntos < FRACCION_MINIMA_PUNTOS * a.total) {
      return `solo encajan ${a.puntos} de ${a.total} esquinas`;
    }
    if (!inversa(a.H) || !colocacionRazonable(aFotoDe(a.H), ancho, alto)) return 'la plantilla queda deformada sobre la foto';
    return null;
  };
  // La plantilla colocada con un ajuste: pasar puntos de un sitio a otro y saber si una caja está en su sitio
  const colocar = (a) => {
    const Hinv = inversa(a.H);
    const aFoto = aFotoDe(a.H);
    const aCarne = (x, y) => aplicar(Hinv, x / escala, y / escala).slice(0, 2);
    const enSuSitio = (d) => {
      if (SITIO_SIN_COMPROBAR[cara]?.includes(d.label)) return true;
      const ancla = anclas[d.label];
      if (ancla) {
        const carne = esquinasDe(ancla.caja);
        const foto = esquinasDeCaja(d);
        const desvio = ancla.esquinas.reduce((suma, e) => {
          const [x, y] = aFoto(...carne[e]);
          return suma + Math.hypot((foto[e][0] - x) / ancho, (foto[e][1] - y) / alto);
        }, 0) / ancla.esquinas.length;
        return desvio <= TOLERANCIA_SITIO;
      }
      const zona = ZONAS[cara]?.[d.label] || ZONAS_SOLO_PARA_COMPROBAR[cara]?.[d.label];
      if (!zona) return true;
      const [u, v] = aCarne(d.x + d.width / 2, d.y + d.height / 2);
      return u >= zona[0] - TOLERANCIA_SITIO && u <= zona[2] + TOLERANCIA_SITIO
        && v >= zona[1] - TOLERANCIA_SITIO && v <= zona[3] + TOLERANCIA_SITIO;
    };
    return { aFoto, aCarne, enSuSitio };
  };

  let ajuste = ajusteRobusto(pares, minimo, alto / escala);
  const motivoInicial = fallo(ajuste);
  if (motivoInicial) {
    // Una caja muy mal puesta puede arrastrar todo el ajuste. Se prueba sin cada clase y, de los que valen, se queda el
    // que deja en su sitio más cajas de las encontradas, como hace RANSAC. Quedarse solo con el de menos error premiaba
    // al que menos sujeta la plantilla, y quedarse con el de más esquinas quitaba una caja buena de una sola esquina, como
    // el domicilio de una foto real del S24 (revisión del 23/11/2026). Si empatan, gana el de menos error. Desempatar por
    // más esquinas quitaba en el reverso el domicilio, la única ancla por encima de la ventana, en vez de la caja mal
    // puesta, y la ventana se tapaba desplazada (segunda revisión del 23/11/2026)
    const comprobables = detecciones.filter((d) => anclas[d.label] || ZONAS[cara]?.[d.label]
      || ZONAS_SOLO_PARA_COMPROBAR[cara]?.[d.label]);
    let mejor = null;
    for (const clase of new Set(pares.map((p) => p.clase))) {
      const otro = ajusteRobusto(pares.filter((p) => p.clase !== clase), minimo, alto / escala);
      if (fallo(otro)) continue;
      otro.enSitio = comprobables.filter(colocar(otro).enSuSitio).length;
      if (!mejor || otro.enSitio > mejor.enSitio || (otro.enSitio === mejor.enSitio && (otro.residuo < mejor.residuo
        || (otro.residuo === mejor.residuo && otro.puntos > mejor.puntos)))) mejor = otro;
    }
    if (!mejor) return { fiable: false, motivo: motivoInicial };
    ajuste = mejor;
  }
  const { aFoto, aCarne, enSuSitio } = colocar(ajuste);
  const residuo = Math.round(ajuste.residuo * 1000) / 10;

  // Distancia, en el carné, del centro de una zona a la esquina más cercana de las que han encajado
  const apoyo = ([u0, v0, u1, v1]) => {
    const cu = (u0 + u1) / 2;
    const cv = (v0 + v1) / 2;
    return Math.min(...ajuste.usados.map(([u, v]) => Math.hypot(u - cu, v - cv)));
  };
  // Cuánto queda el centro de una zona fuera del rectángulo de las esquinas que han encajado, en el carné. 0 si está dentro
  const extrapolacion = ([u0, v0, u1, v1]) => {
    const cu = (u0 + u1) / 2;
    const cv = (v0 + v1) / 2;
    const us = ajuste.usados.map(([u]) => u);
    const vs = ajuste.usados.map(([, v]) => v);
    return Math.max(0, Math.min(...us) - cu, cu - Math.max(...us), Math.min(...vs) - cv, cv - Math.max(...vs));
  };

  return {
    fiable: true,
    motivo: `plantilla colocada con ${ajuste.clases} clases y ${ajuste.puntos} de ${ajuste.total} esquinas (error del ${residuo} % del alto)`,
    residuo: ajuste.residuo,
    clases: ajuste.clases,
    cara,
    ancho,
    alto,
    aFoto,
    aCarne,
    enSuSitio,
    apoyo,
    extrapolacion,
  };
}

/**
 * Si una zona queda tan fuera de las esquinas que han encajado que la plantilla solo podría colocarla extrapolando.
 * @param {Object} ajuste - Lo que devuelve ajustarPlantilla, fiable
 * @param {number[]} zona - [x0, y0, x1, y1] de 0 a 1 en el carné
 * @returns {boolean}
 */
export function zonaExtrapolada(ajuste, zona) {
  return ajuste.extrapolacion(zona) > (EXTRAPOLACION_MAXIMA[ajuste.cara] ?? 0);
}

/**
 * Margen con el que se tapa una zona sin haberla encontrado, o null si queda demasiado lejos de las anclas que han
 * encajado, o fuera de ellas donde no se puede extrapolar, y no se debe tapar a ciegas.
 * @param {Object} ajuste - Lo que devuelve ajustarPlantilla, fiable
 * @param {number[]} zona - [x0, y0, x1, y1] de 0 a 1 en el carné
 * @returns {number|null} En fracción del carné
 */
export function margenDeZona(ajuste, zona) {
  const distancia = ajuste.apoyo(zona);
  if (distancia > APOYO_MAXIMO || zonaExtrapolada(ajuste, zona)) return null;
  return MARGEN_ZONA + MARGEN_POR_APOYO * Math.max(0, distancia - APOYO_SIN_EXTRA);
}

/**
 * Rectángulo de la foto que ocupa una zona de la plantilla, con un margen alrededor y sin salirse de la foto.
 * @param {Object} ajuste - Lo que devuelve ajustarPlantilla, fiable
 * @param {number[]} zona - [x0, y0, x1, y1] de 0 a 1 en el carné
 * @param {number} margen - En fracción del carné
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function zonaEnFoto(ajuste, [u0, v0, u1, v1], margen = 0) {
  const p = esquinasDe([u0 - margen, v0 - margen, u1 + margen, v1 + margen]).map(([u, v]) => ajuste.aFoto(u, v));
  const x0 = Math.max(0, Math.min(...p.map((q) => q[0])));
  const y0 = Math.max(0, Math.min(...p.map((q) => q[1])));
  const x1 = Math.min(ajuste.ancho, Math.max(...p.map((q) => q[0])));
  const y1 = Math.min(ajuste.alto, Math.max(...p.map((q) => q[1])));
  return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
}
