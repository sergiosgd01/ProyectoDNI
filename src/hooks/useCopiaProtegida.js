import { useCallback, useEffect, useRef, useState } from 'react';
import { NOMBRES_COPIA, disponerEnA4, motivoErrorCompartir, puedeCompartirPdf } from '../utils/copiaProtegida';
import { caraConMarca, crearImagenDosCaras, crearPdf, descargarArchivo, miniaturaConMarca } from '../utils/crearCopia';

// La copia protegida de la zona de descarga (ver ZonaDescarga). Se prepara sola en cuanto hay resultado (las caras
// con la marca de agua, el PDF y su miniatura), así que descargar y compartir son inmediatos y la zona puede enseñar
// cómo queda la hoja, que en la vista previa no se ve porque allí no va la marca. delantera y trasera son las
// imágenes ya tapadas (trasera puede faltar) y marca es el texto de la marca de agua. Si cambia alguna, la copia se
// vuelve a preparar

// Una copia que se deja a medias porque ya no hace falta (otro resultado u otra marca de agua). No es un fallo
class PreparacionCancelada extends Error {}

// sigue dice si la copia aún hace falta. Se mira después de cada paso, para no gastar el móvil en una que se va a tirar
async function preparar({ delantera, trasera, marca }, sigue) {
  const comprobar = () => {
    if (!sigue()) throw new PreparacionCancelada();
  };
  const urls = trasera ? [delantera, trasera] : [delantera];
  const caras = [];
  // Una detrás de otra, para no juntar en el móvil dos imágenes grandes a la vez
  for (const url of urls) {
    caras.push(await caraConMarca(url, marca));
    comprobar();
  }
  const pdf = new File([await crearPdf(caras)], NOMBRES_COPIA.pdf, { type: 'application/pdf' });
  comprobar();
  const miniaturas = [];
  for (const url of urls) miniaturas.push(await miniaturaConMarca(url, marca));
  return { delantera, trasera, marca, caras, pdf, miniaturas, disposicion: disponerEnA4(caras) };
}

// Si una copia (hecha o en preparación) es de estas imágenes y esta marca de agua
const esDe = (copia, { delantera, trasera, marca }) =>
  Boolean(copia) && copia.delantera === delantera && copia.trasera === trasera && copia.marca === marca;

// En el iPhone y el iPad el título llega al menú de compartir como un texto aparte. «Guardar en Archivos» guardaba un
// texto.txt con «DNI protegido» junto al PDF (visto el 18/11/2026 en el simulador de iOS 26.4). Ahí se comparte solo
// el PDF. El iPad se presenta como un Mac, pero con pantalla táctil
const ES_IOS = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const AVISO_FALLO = 'No se ha podido preparar la copia. Vuelve a intentarlo.';
const AVISO_REPETIR = 'Tu copia ya está lista. Pulsa otra vez «Compartir».';
const AVISO_SIN_MENU = 'No se ha podido abrir el menú para compartir. Descarga el PDF y mándalo desde la aplicación que quieras.';

export function useCopiaProtegida({ delantera, trasera, marca }) {
  const [puedeCompartir] = useState(() => puedeCompartirPdf());
  const [copia, setCopia] = useState(null);
  // Qué se está preparando a petición de la persona ('compartir', 'pdf', 'dosCaras', 'delantera' o 'trasera')
  const [ocupado, setOcupado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const enCurso = useRef(null);
  // Los datos de ahora, para dejar a medias la copia de otros que se estuviera preparando
  const actuales = useRef(null);

  // La copia de los datos de ahora. Si ya se está preparando, devuelve esa misma promesa en vez de empezar otra
  const obtener = useCallback(() => {
    const datos = { delantera, trasera, marca };
    if (esDe(enCurso.current, datos)) return enCurso.current.promesa;
    const promesa = preparar(datos, () => esDe(actuales.current, datos));
    enCurso.current = { ...datos, promesa };
    promesa.catch(() => {
      if (enCurso.current?.promesa === promesa) enCurso.current = null;
    });
    return promesa;
  }, [delantera, trasera, marca]);

  useEffect(() => {
    actuales.current = { delantera, trasera, marca };
    setAviso(null);
    if (!delantera) {
      setCopia(null);
      return undefined;
    }
    let vigente = true;
    // Espera un poco para no rehacerla con cada letra de la marca de agua ni justo cuando aparece el resultado
    const espera = setTimeout(() => {
      obtener()
        .then((lista) => {
          if (vigente) setCopia(lista);
        })
        .catch((error) => {
          if (!(error instanceof PreparacionCancelada)) console.error('No se ha podido preparar la copia protegida:', error);
        });
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [delantera, trasera, marca, obtener]);

  const lista = esDe(copia, { delantera, trasera, marca }) ? copia : null;

  // Hace una acción de la persona con su rueda en el botón y, si falla, deja el aviso
  const ejecutar = async (accion, tarea) => {
    setAviso(null);
    setOcupado(accion);
    try {
      await tarea();
    } catch (error) {
      if (error instanceof PreparacionCancelada) return;
      console.error('No se ha podido preparar la copia protegida:', error);
      setAviso(AVISO_FALLO);
    } finally {
      setOcupado(null);
    }
  };

  // La copia ya hecha o, si aún se está preparando, la que salga
  const copiaHecha = async () => lista ?? (await obtener());

  // Abre el menú del sistema para mandar el PDF (WhatsApp, correo...) sin tener que descargarlo y buscarlo. Safari
  // solo lo abre si se pide justo al pulsar, así que, con la copia ya hecha, se pide sin esperar a nada. Si aún se
  // estaba preparando, se espera a que termine. Si para entonces el navegador ya no lo deja, se pide pulsar otra vez
  const compartir = async () => {
    setAviso(null);
    let archivo = lista?.pdf;
    if (!archivo) {
      setOcupado('compartir');
      try {
        archivo = (await obtener()).pdf;
      } catch (error) {
        if (!(error instanceof PreparacionCancelada)) {
          console.error('No se ha podido preparar la copia protegida:', error);
          setAviso(AVISO_FALLO);
        }
        return;
      } finally {
        setOcupado(null);
      }
    }
    try {
      await navigator.share(ES_IOS ? { files: [archivo] } : { files: [archivo], title: 'DNI protegido' });
    } catch (error) {
      const motivo = motivoErrorCompartir(error);
      if (motivo === 'repetir') setAviso(AVISO_REPETIR);
      if (motivo === 'fallo') {
        console.error('No se ha podido compartir la copia:', error);
        setAviso(AVISO_SIN_MENU);
      }
    }
  };

  const descargarPdf = () => ejecutar('pdf', async () => {
    descargarArchivo((await copiaHecha()).pdf, NOMBRES_COPIA.pdf);
  });

  const descargarCara = (lado) => ejecutar(lado, async () => {
    const { caras } = await copiaHecha();
    descargarArchivo(caras[lado === 'trasera' ? 1 : 0].blob, NOMBRES_COPIA[lado]);
  });

  const descargarDosCaras = () => ejecutar('dosCaras', async () => {
    descargarArchivo(await crearImagenDosCaras([delantera, trasera].filter(Boolean), marca), NOMBRES_COPIA.dosCaras);
  });

  // La miniatura se enseña si es de estas imágenes. Si solo ha cambiado la marca de agua, se queda la de antes
  // hasta que llega la nueva
  const miniatura = copia && copia.delantera === delantera && copia.trasera === trasera
    ? { imagenes: copia.miniaturas, disposicion: copia.disposicion }
    : null;

  return {
    hayTrasera: Boolean(trasera),
    miniatura,
    ocupado,
    aviso,
    cerrarAviso: () => setAviso(null),
    puedeCompartir,
    compartir,
    descargarPdf,
    descargarCara,
    descargarDosCaras
  };
}
