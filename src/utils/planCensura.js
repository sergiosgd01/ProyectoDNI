/**
 * Qué se tapa en cada cara y si hace falta censura manual.
 *
 * Sustituye a modoDeCensura (camposSinDetectar.js) en el editor y hace lo mismo que él cuando la plantilla no encaja,
 * con dos cambios que solo tapan más.
 * 1. Un dato tapado se tapa también donde se repite (CEN-6 y CEN-7). La MRZ repite casi todo el anverso, la ventana
 *    transparente repite el número de soporte en las dos caras y el CLI repite una fecha y una cara pequeña. La MRZ se
 *    tapa entera, porque partirla en líneas dependía de lo ajustada que viniera su caja y una MRZ a medias ya no sirve
 *    para leerla con una máquina.
 * 2. Con la plantilla colocada (plantillaDni.js), lo que el modelo no encuentra se tapa en su sitio en vez de pedirlo a
 *    mano (F9), y una caja fuera de su sitio no cuenta como encontrada (MET-4).
 *
 * Desde la tanda 2 (23/11/2026) las cajas del modelo se tapan con algo de margen (CEN-3), y el domicilio se parte en
 * líneas (lineasDomicilio.js) para tapar la calle y dejar a la vista el municipio y la provincia (CEN-2).
 */
import { CLASES_POR_CARA, DOCUMENTO_POR_CARA, MIN_DETECCIONES, SIEMPRE_A_MANO } from './camposSinDetectar.js';
import { ZONAS, cajaCorta, margenDeZona, zonaEnFoto, zonaExtrapolada } from './plantillaDni.js';

const A = (clase, copia = false) => ({ cara: 'anverso', clase, copia });
const R = (clase, copia = false) => ({ cara: 'reverso', clase, copia });

// Dónde sale cada dato de la interfaz. Lo primero es el dato. Lo que lleva true es una copia, que se tapa si se
// encuentra o si la plantilla dice dónde está, pero que nunca manda por sí sola a censura manual, como hasta ahora.
// DOM_CALLE, DOM_MUNICIPIO y DOM_PROVINCIA son partes de la caja DOMICILIO del modelo, que cubre las tres (CEN-2)
export const DONDE_SALE = {
  nombre: [A('NOMBRE'), R('MRZ', true)],
  apellidos: [A('APELLIDOS'), R('MRZ', true)],
  dni: [A('NUM_DNI'), A('NUM_DNI_MIN', true), R('MRZ', true)],
  fechaNacimiento: [A('NACIMIENTO'), R('MRZ', true)],
  sexo: [A('SEXO'), R('MRZ', true)],
  nacionalidad: [A('NACIONALIDAD'), R('MRZ', true)],
  // El CLI repite la fecha de expedición o la de caducidad, según el DNI
  fechaExpedicion: [A('EMISIÓN'), A('CLI', true)],
  fechaCaducidad: [A('VALIDEZ'), A('CLI', true), R('MRZ', true)],
  numeroSoporte: [A('SOPORTE'), A('SOPORTE_MIN', true), R('SOPORTE_MIN', true), R('MRZ', true)],
  can: [A('CAN')],
  firma: [A('FIRMA')],
  // El CLI lleva también una copia pequeña de la foto
  fotografia: [A('FOTOGRAFIA'), A('CLI', true)],
  cli: [A('CLI')],
  mrz: [R('MRZ')],
  domicilio: [R('DOM_CALLE')],
  municipio: [R('DOM_MUNICIPIO')],
  provincia: [R('DOM_PROVINCIA')],
  lugarNacimiento: [R('LUGAR_NACIMIENTO')],
  equipoExpedidor: [R('EQUIPO')],
  progenitores: [R('HIJO_DE')],
  ventanaSoporte: [R('SOPORTE_MIN')],
};

// Qué se pide en la censura manual cuando no se encuentra una copia. campo es la casilla más parecida y nombre lo que
// lee la persona, que no siempre es el nombre de la casilla
const COPIA_A_MANO = {
  'anverso:NUM_DNI_MIN': { campo: 'dni', nombre: 'Número de DNI pequeño' },
  'anverso:SOPORTE_MIN': { campo: 'numeroSoporte', nombre: 'Ventana del soporte' },
  'anverso:CLI': { campo: 'cli' },
  'reverso:SOPORTE_MIN': { campo: 'ventanaSoporte' },
  'reverso:MRZ': { campo: 'mrz' },
};

// Clases que no son datos y que no se protegen al tapar zonas cercanas
const NO_SON_DATOS = new Set(['DOC_DNI', 'DOC_DNI_REV', 'ES', 'ESP', 'ESP_HOLO', 'OPT_VAR']);

// Clase del modelo que contiene cada clase de la interfaz. Las tres partes del domicilio salen de la misma caja
const claseDelModelo = (clase) => (clase.startsWith('DOM_') ? 'DOMICILIO' : clase);

// Margen con el que se tapan las cajas del modelo, en fracción de la foto (CEN-3). Las cajas iban justas, y en una foto
// real se leían las dos últimas letras de los progenitores, que se salían un 2 % por la derecha. Los textos de largo
// variable empiezan siempre en el mismo sitio, así que por la derecha llevan más. Los márgenes no pisan los datos a la
// vista que el modelo haya encontrado (recortarContraVisibles)
const MARGEN_CAJA = 0.01;
const MARGEN_DERECHO_TEXTO_LARGO = 0.04;
const TEXTO_LARGO = new Set(['NOMBRE', 'APELLIDOS', 'HIJO_DE', 'LUGAR_NACIMIENTO', 'DOMICILIO']);

// El CLI entero a partir de la caja del modelo, que solo coge la fecha. La cara pequeña va encima y por debajo de ella
function cliEntero(caja) {
  return {
    x: caja.x - 0.1 * caja.width, y: caja.y - 1.2 * caja.height,
    width: caja.width * 1.3, height: caja.height * 3.5,
  };
}

const rect = (d) => ({ x: d.x, y: d.y, width: d.width, height: d.height });

// Qué hay que tapar en una cara con las casillas marcadas, como clase → { campo, clase, copia }. Una clase pedida como
// dato y como copia cuenta como dato
function requisitosDeCara(cara, campos) {
  const requisitos = new Map();
  for (const caraCampos of ['anverso', 'reverso']) {
    for (const [campo, tapar] of Object.entries(campos?.[caraCampos] || {})) {
      if (tapar !== true) continue;
      for (const r of DONDE_SALE[campo] || [{ cara: caraCampos, clase: campo.toUpperCase(), copia: false }]) {
        if (r.cara !== cara) continue;
        const previo = requisitos.get(r.clase);
        if (!previo || (previo.copia && !r.copia)) requisitos.set(r.clase, { campo, clase: r.clase, copia: r.copia });
      }
    }
  }
  return requisitos;
}

/**
 * Copias de lo marcado que hay en una cara, para avisar de ellas cuando la cara va entera a censura manual. Quien tapa
 * a mano sabe qué ha marcado, pero no que la ventana transparente repite el número de soporte, el CLI una fecha y la
 * cara pequeña, o la MRZ casi todo el anverso. Antes no se decía y, por ejemplo, con Viajes y la trasera boca abajo la
 * ventana se quedaba a la vista. Una zona marcada también como dato no sale, porque ya se tapa como tal. En una cara
 * parcial no hace falta, porque planDeCara ya pide en faltan las copias que no encuentra
 * @param {'anverso'|'reverso'} cara
 * @param {{anverso: Object, reverso: Object}} campos - Casillas de las dos caras, true = tapar
 * @returns {Array<{campo: string, nombre?: string}>} Como faltan, con nombre si la copia no se llama como su casilla
 */
export function copiasDeLoMarcado(cara, campos) {
  const copias = [];
  for (const { campo, clase, copia } of requisitosDeCara(cara, campos).values()) {
    if (!copia) continue;
    const aMano = COPIA_A_MANO[`${cara}:${clase}`] || { campo };
    if (!copias.some((c) => c.campo === aMano.campo && c.nombre === aMano.nombre)) copias.push(aMano);
  }
  return copias;
}

/**
 * Encoge una zona para no tapar las cajas de datos que se dejan a la vista, sin meterse nunca en su núcleo (la zona
 * sin margen), que es donde está el dato que se tapa. Si una caja visible pisa el núcleo, la zona se queda como está.
 */
export function recortarContraVisibles(zona, nucleo, visibles) {
  let x0 = zona.x;
  let y0 = zona.y;
  let x1 = zona.x + zona.width;
  let y1 = zona.y + zona.height;
  const nx0 = nucleo.x;
  const ny0 = nucleo.y;
  const nx1 = nucleo.x + nucleo.width;
  const ny1 = nucleo.y + nucleo.height;
  for (const v of visibles) {
    const vx0 = v.x;
    const vy0 = v.y;
    const vx1 = v.x + v.width;
    const vy1 = v.y + v.height;
    if (vx1 <= x0 || vx0 >= x1 || vy1 <= y0 || vy0 >= y1) continue;
    if (vx0 >= nx1) x1 = Math.max(nx1, Math.min(x1, vx0));
    else if (vx1 <= nx0) x0 = Math.min(nx0, Math.max(x0, vx1));
    else if (vy0 >= ny1) y1 = Math.max(ny1, Math.min(y1, vy0));
    else if (vy1 <= ny0) y0 = Math.min(ny0, Math.max(y0, vy1));
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Plan de censura de una cara.
 * @param {Object} opciones
 * @param {'anverso'|'reverso'} opciones.cara
 * @param {{anverso: Object, reverso: Object}} opciones.campos - Casillas de las dos caras, true = tapar. Hacen falta
 *   las dos porque un dato de una cara puede repetirse en la otra
 * @param {Array} opciones.detecciones - Cajas del modelo en esta cara, en píxeles de su foto
 * @param {Object|null} opciones.ajuste - La plantilla colocada sobre la foto (ajustarPlantilla) o null
 * @param {{ancho: number, alto: number}|null} opciones.tamano - Tamaño de la foto, para los márgenes. Sin él, las cajas
 *   se tapan justas, como antes
 * @param {{calle: Array}|null} opciones.lineasDomicilio - Las tiras que tapan la calle (lineasDelDomicilio), o null si
 *   no se ha podido separar del municipio y la provincia. Solo se usan para dejar a la vista esos dos
 * @returns {{modo: 'auto'|'parcial'|'manual', faltan: Array<{campo: string, nombre?: string}>, motivo: string,
 *   cajas: Array, rellenadas: string[], ampliadas: string[], fueraDeSitio: string[]}} cajas son los rectángulos que
 *   se tapan, rellenadas las clases tapadas con la plantilla, ampliadas las encontradas con una caja corta que se han
 *   tapado además con su zona (cajaCorta) y fueraDeSitio las que el modelo puso donde no van
 */
export function planDeCara({ cara, campos, detecciones, ajuste = null, tamano = null, lineasDomicilio = null }) {
  const documento = DOCUMENTO_POR_CARA[cara];
  if (!detecciones.some((d) => d.label === documento)) {
    return { modo: 'manual', faltan: [], motivo: `no se detectó el documento ${documento}`, cajas: [],
      rellenadas: [], ampliadas: [], fueraDeSitio: [] };
  }
  const minimo = MIN_DETECCIONES[cara];
  if (detecciones.length < minimo) {
    return { modo: 'manual', faltan: [], motivo: `solo ${detecciones.length} detecciones, mínimo ${minimo}`,
      cajas: [], rellenadas: [], ampliadas: [], fueraDeSitio: [] };
  }

  const requisitos = requisitosDeCara(cara, campos);
  const fiable = Boolean(ajuste?.fiable);
  // Sin la plantilla no se puede saber si una caja está en su sitio, y se fía de todas como antes
  const enSuSitio = (d) => !fiable || ajuste.enSuSitio(d);
  // Del domicilio solo se tapa la calle si es lo único que se pide y las líneas se han podido separar. Si se pide el
  // municipio o la provincia, se tapa el bloque entero, que es lo seguro
  const partesDomicilio = [...requisitos.keys()].filter((c) => c.startsWith('DOM_'));
  const soloCalle = partesDomicilio.length === 1 && partesDomicilio[0] === 'DOM_CALLE'
    && Boolean(lineasDomicilio?.calle?.length);
  const tapadas = new Set([...requisitos.keys()].map(claseDelModelo));
  // Con solo la calle tapada, la caja del domicilio protege el municipio y la provincia de los márgenes de al lado
  if (soloCalle) tapadas.delete('DOMICILIO');
  // Datos que se dejan a la vista y que el modelo ha encontrado en su sitio. Las zonas tapadas con la plantilla no los
  // pisan
  const visibles = detecciones.filter((d) => !NO_SON_DATOS.has(d.label) && !tapadas.has(d.label) && enSuSitio(d));
  const posibles = new Set(CLASES_POR_CARA[cara] || []);
  const siempreAMano = new Set(SIEMPRE_A_MANO[cara] || []);

  // Una caja del modelo con su margen, sin pisar los datos a la vista ni salirse de la foto. La calle va sin margen por
  // abajo, porque ya se corta a mitad del hueco con el municipio
  const conMargen = (d, { abajo = true } = {}) => {
    if (!tamano?.ancho || !tamano?.alto) return rect(d);
    const mx = MARGEN_CAJA * tamano.ancho;
    const my = MARGEN_CAJA * tamano.alto;
    const derecha = (TEXTO_LARGO.has(d.label) ? MARGEN_DERECHO_TEXTO_LARGO : MARGEN_CAJA) * tamano.ancho;
    const x0 = Math.max(0, d.x - mx);
    const y0 = Math.max(0, d.y - my);
    const x1 = Math.min(tamano.ancho, d.x + d.width + derecha);
    const y1 = Math.min(tamano.alto, d.y + d.height + (abajo ? my : 0));
    return recortarContraVisibles({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, rect(d), visibles);
  };

  const cajas = [];
  const rellenadas = [];
  const fueraDeSitio = new Set();
  // Clases encontradas con una caja corta que se han tapado además con su zona
  const ampliadas = [];
  const sinTapar = [];
  let domicilioTapado = false;
  for (const { campo, clase, copia } of requisitos.values()) {
    const delModelo = claseDelModelo(clase);
    const encontradas = detecciones.filter((d) => d.label === delModelo);
    const enSitio = encontradas.filter(enSuSitio);
    encontradas.filter((d) => !enSitio.includes(d)).forEach((d) => fueraDeSitio.add(d.label));
    // Lo que ha encontrado el modelo se tapa siempre, también lo que parece fuera de sitio. Mejor tapar de más
    if (clase === 'CLI') {
      encontradas.forEach((d) => cajas.push({ ...recortarContraVisibles(cliEntero(d), conMargen(d), visibles), clase }));
    } else if (delModelo === 'DOMICILIO') {
      if (soloCalle && encontradas.length) {
        // Las tiras de la calle siguen la inclinación de las líneas. Llevan el margen de las cajas por arriba y por los
        // lados de fuera, pero no por abajo, donde empiezan el municipio y la provincia
        const izquierda = Math.min(...lineasDomicilio.calle.map((r) => r.x));
        const derecha = Math.max(...lineasDomicilio.calle.map((r) => r.x + r.width));
        for (const tira of lineasDomicilio.calle) {
          const conBordes = conMargen({ ...tira, label: 'DOMICILIO' }, { abajo: false });
          const x0 = tira.x > izquierda ? tira.x : conBordes.x;
          const x1 = tira.x + tira.width < derecha ? tira.x + tira.width : conBordes.x + conBordes.width;
          cajas.push({ x: x0, y: conBordes.y, width: x1 - x0, height: conBordes.height, clase });
        }
      } else if (!domicilioTapado) {
        encontradas.forEach((d) => cajas.push({ ...conMargen(d), clase: 'DOMICILIO' }));
        domicilioTapado = encontradas.length > 0;
      }
    } else {
      encontradas.forEach((d) => cajas.push({ ...conMargen(d), clase }));
      // Una caja en su sitio pero corta se ha dejado parte del dato, por ejemplo con un reflejo encima (C01). Con la
      // plantilla colocada se tapa además su zona entera, igual que cuando no se encuentra. Mejor tapar de más
      const zonaCorta = fiable ? ZONAS[cara]?.[clase] : null;
      if (zonaCorta && enSitio.some((d) => cajaCorta(ajuste, d))) {
        const margenCorta = margenDeZona(ajuste, zonaCorta);
        if (margenCorta !== null) {
          const tapa = recortarContraVisibles(zonaEnFoto(ajuste, zonaCorta, margenCorta), zonaEnFoto(ajuste, zonaCorta), visibles);
          cajas.push({ ...tapa, clase, plantilla: true });
          ampliadas.push(clase);
        }
      }
    }
    if (enSitio.length > 0) continue;

    // No está, o está fuera de su sitio. Con la plantilla colocada se tapa donde dice ella, si hay anclas cerca
    const zona = ZONAS[cara]?.[clase];
    const margen = fiable && zona ? margenDeZona(ajuste, zona) : null;
    if (margen !== null) {
      // La ventana del reverso no se recorta contra el domicilio, que es la única ancla que tiene por encima. Si su caja
      // llega más a la izquierda, la plantilla se desplaza con ella y el recorte dejaba la ventana a medias. A lo sumo se
      // tapa una letra del principio del domicilio (tercera revisión del 23/11/2026)
      const contra = cara === 'reverso' && clase === 'SOPORTE_MIN'
        ? visibles.filter((v) => v.label !== 'DOMICILIO') : visibles;
      const tapa = recortarContraVisibles(zonaEnFoto(ajuste, zona, margen), zonaEnFoto(ajuste, zona), contra);
      cajas.push({ ...tapa, clase, plantilla: true });
      rellenadas.push(clase);
      continue;
    }
    // Las clases que el modelo no tiene no se piden, igual que antes. Las que casi nunca encuentra (el CLI) y las
    // copias no mandan por sí solas a censura manual, pero se piden si la cara ya va a mano. Una copia que la plantilla
    // solo sabría colocar extrapolando, como la ventana del reverso sin el domicilio, sí manda, porque tapada a ojo
    // quedaba desplazada (tercera revisión del 23/11/2026)
    if (!copia && !posibles.has(delModelo) && !siempreAMano.has(campo)) continue;
    const extrapolada = copia && fiable && Boolean(zona) && zonaExtrapolada(ajuste, zona);
    const bloquea = (!copia || extrapolada) && posibles.has(delModelo) && !siempreAMano.has(campo);
    const aMano = copia ? (COPIA_A_MANO[`${cara}:${clase}`] || { campo }) : { campo };
    sinTapar.push({ ...aMano, bloquea, clase });
  }

  // Sin repetir. Una copia con nombre propio (la ventana del soporte) se pide aunque falte también su dato
  const unicos = (lista) => lista
    .filter((f, i) => lista.findIndex((g) => g.campo === f.campo && g.nombre === f.nombre) === i)
    .map(({ campo, nombre }) => (nombre ? { campo, nombre } : { campo }));
  const bloqueantes = sinTapar.filter((f) => f.bloquea);
  const comun = { cajas, rellenadas, ampliadas, fueraDeSitio: [...fueraDeSitio] };
  if (bloqueantes.length > 0) {
    return {
      modo: 'parcial',
      faltan: unicos([...bloqueantes, ...sinTapar.filter((f) => !f.bloquea)]),
      motivo: `no se han encontrado: ${unicos(bloqueantes).map((f) => f.campo).join(', ')}`,
      ...comun,
    };
  }
  const notas = [
    rellenadas.length ? `tapado con la plantilla: ${rellenadas.join(', ')}` : '',
    ampliadas.length ? `caja corta ampliada con la plantilla: ${ampliadas.join(', ')}` : '',
    sinTapar.length ? `copias sin encontrar: ${sinTapar.map((f) => f.clase).join(', ')}` : '',
    fueraDeSitio.size ? `fuera de sitio: ${[...fueraDeSitio].join(', ')}` : '',
  ].filter(Boolean);
  return { modo: 'auto', faltan: [], motivo: ['están todos los campos que se tapan', ...notas].join('. '), ...comun };
}
