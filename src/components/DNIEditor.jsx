import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import ProfileSelector from './ProfileSelector';
import { DNI_PROFILES } from '../../shared/constants/dniProfiles';
import { useColors } from '../theme/useColors';
import { useScrollToTop } from '../hooks/useScrollToTop';
import { detectDniFromCanvas } from './dni_scripts/dni_detector';
import { detectWithFlatLight } from '../utils/flatLight';
import ZonaDescarga, { AccionesCopia } from './ZonaDescarga';
import { useCopiaProtegida } from '../hooks/useCopiaProtegida';
import { censorDniComplete } from './dni_scripts/dni_censor'
import { copiasDeLoMarcado, planDeCara } from '../utils/planCensura';
import { ajustarPlantilla } from '../utils/plantillaDni';
import { lineasDelDomicilio } from '../utils/lineasDomicilio';
import WatermarkInput from './WatermarkInput';
import Aviso from './Aviso';
import { useCloseOnBack } from '../hooks/useNavigation';
import { DEMO_MODE } from '../config/demoMode';
import ManualCensorModal from './ManualCensorModal';
import ManualCropModal from './ManualCropModal';
// Importamos la API
import { dniApi } from '../services/dniApi';
import { completarCampos, construirDeteccion, obtenerVersionModelo } from '../utils/metricasDeteccion';

// Detecciones del modelo de campos para cada foto, guardadas por la identidad de su File o Blob.
// «Procesar de nuevo» y procesar con otra selección las reutilizan y solo vuelven a tapar, sin pasar otra vez el modelo.
// El contrato es que la imagen de un File no cambia nunca. Todo lo que cambia la imagen de una cara (subir otra foto,
// «Ajustar recorte» o «Girar») crea un File nuevo, e «Intercambiar caras» intercambia los File de las dos caras.
// Así las detecciones guardadas de un File siguen valiendo para él, esté en la cara que esté.
// Cada entrada apunta también en qué caras ('front' o 'back') se ha contado ya esa foto en un registro de métricas.
// El registro dice por cara si se encontró el documento y si se censuró sola, así que después de «Intercambiar caras»
// las dos fotos se cuentan otra vez en su cara nueva, con las mismas detecciones.
// Se apuntan cuando un procesado termina bien, justo al decidir si se envían sus métricas, para que cada foto
// cuente una sola vez en cada cara. Con un WeakMap la entrada desaparece cuando la web deja de usar la foto.
const deteccionesPorFoto = new WeakMap();

// Guarda las detecciones de una foto, si no estaban, y apunta que ya se ha contado en esa cara
function apuntarDetecciones(foto, detecciones, cara) {
  const guardadas = deteccionesPorFoto.get(foto);
  if (guardadas) guardadas.caras.add(cara);
  else deteccionesPorFoto.set(foto, { detecciones, caras: new Set([cara]) });
}

// Ancho y alto de cada foto, que hacen falta para colocar sobre ella la plantilla del DNI (utils/plantillaDni.js).
// Se miden igual que las mira el detector, con createImageBitmap, así que salen en los mismos píxeles que sus cajas
const tamanosPorFoto = new WeakMap();

async function tamanoDeFoto(foto) {
  if (!tamanosPorFoto.has(foto)) {
    try {
      const bitmap = await createImageBitmap(foto);
      tamanosPorFoto.set(foto, { ancho: bitmap.width, alto: bitmap.height });
      bitmap.close?.();
    } catch (error) {
      // Sin tamaño no se coloca la plantilla y se tapa como antes, solo con lo que encuentre el modelo
      console.error('[DNIEditor] No se ha podido medir la foto:', error);
      return null;
    }
  }
  return tamanosPorFoto.get(foto);
}

// La imagen tapada que devuelve censorDniComplete (una URL data: en JPEG) como archivo, para abrirla en la censura
// manual. Se pasa a bytes aquí y no con fetch, que la política de contenido de la web podría no dejar
function dataUrlAArchivo(dataUrl, nombre) {
  const [cabecera, datos] = dataUrl.split(',');
  const tipo = cabecera.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg';
  const binario = atob(datos);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new File([bytes], nombre, { type: tipo });
}

// Clases del modelo que corresponden a elementos de seguridad del anverso
const HOLOGRAM_CLASSES = ['ESP', 'ESP_HOLO', 'ES', 'OPT_VAR'];

// Explicación corta que va bajo el nombre de las casillas que no se entienden solas. Las tres repiten otros datos y la web
// intenta taparlas también cuando se tapan esos datos (ver DONDE_SALE en utils/planCensura.js). Dice «intenta» porque
// solo lo consigue si el modelo las encuentra o si la plantilla del DNI encaja
const AYUDA_CAMPOS = {
  cli: 'Es la imagen pequeña de la parte delantera que cambia al inclinar el DNI. Repite una fecha y tu cara, así que la web intenta taparla también si tapas la fecha de expedición, la de caducidad o la fotografía.',
  mrz: 'Son las tres líneas de letras y números de abajo. Repiten nombre, número, fechas, sexo y nacionalidad, así que la web intenta taparlas también si tapas alguno de esos datos.',
  ventanaSoporte: 'Es la ventanita transparente con el número de soporte. La web intenta taparla también si tapas el número de soporte.'
};

// Etiqueta de cada cara en la vista previa. Si se puede, lleva al lado el botón para corregir su recorte
// y el de girar la foto. girando dice si se está girando esta cara y ocupado si se está girando alguna
function EtiquetaCara({ texto, colores, nombreCara, onAjustar, onGirar, girando = false, ocupado = false }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
      <div className={`${colores} text-xs sm:text-sm font-medium px-2 py-1 rounded inline-block`}>
        {texto}
      </div>
      {(onGirar || onAjustar) && (
        <div className="flex flex-wrap items-center gap-2">
          {onGirar && (
            <button
              type="button"
              onClick={onGirar}
              disabled={girando || ocupado}
              aria-label={`Girar la parte ${nombreCara} 90 grados a la derecha`}
              className={CLASES_BOTON_CARA}
            >
              <i className={`bi bi-arrow-clockwise ${girando ? 'animate-spin' : ''}`}></i>
              Girar
            </button>
          )}
          {onAjustar && (
            <button
              type="button"
              onClick={onAjustar}
              aria-label={`Ajustar recorte de la parte ${nombreCara}`}
              className={CLASES_BOTON_CARA}
            >
              <i className="bi bi-crop"></i>
              Ajustar recorte
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Botones pequeños de cada cara y el de intercambiar caras (ver .btn en index.css)
const CLASES_BOTON_CARA = 'btn btn-sm btn-secundario';

// Entre las dos caras, para cuando el anverso y el reverso se subieron cambiados
function BotonIntercambiar({ onClick }) {
  return (
    <div className="flex justify-center -mt-2 mb-2">
      <button type="button" onClick={onClick} title="Cambiar la parte delantera por la trasera" className={CLASES_BOTON_CARA}>
        <i className="bi bi-arrow-down-up"></i>
        Intercambiar caras
      </button>
    </div>
  );
}

export default function DNIEditor({
  frontFile,
  backFile,
  frontMetadata = null,
  backMetadata = null,
  onAdjustCrop,
  onRotate,
  onSwapSides,
  onBack,
  onProcessed,
  initialOcrData = null,
  initialValidation = null,
  manualDetection = false,
  onGoHome
}) {
  const colors = useColors();
  const [cachedOcrData, setCachedOcrData] = useState(initialOcrData);
  const [cachedValidation, setCachedValidation] = useState(initialValidation);

  const [manualCensorList, setManualCensorList] = useState(null);

  // Scroll inicial al principio de la página
  useScrollToTop();

  // Campos disponibles para configuración front
  const frontfields = [
    'nombre',
    'apellidos',
    'dni',
    'fechaNacimiento',
    'sexo',
    'nacionalidad',
    'fechaExpedicion',
    'fechaCaducidad',
    'numeroSoporte',
    'can',
    'firma',
    'fotografia',
    'cli'
  ];

  // Campos disponibles para configuración back
  const backfields = [
    'mrz',
    'domicilio',
    'municipio',
    'provincia',
    'lugarNacimiento',
    'equipoExpedidor',
    'progenitores',
    'ventanaSoporte'
  ];

  // Combinar todos los campos
  const availableFields = [...frontfields, ...backfields];
  const totalFields = availableFields.length;

  const [selectedProfile, setSelectedProfile] = useState('viajes');
  const [selectedFrontFields, setSelectedFrontFields] = useState(
    DNI_PROFILES.VIAJES.frontFields
  );

  const [selectedBackFields, setSelectedBackFields] = useState(
    DNI_PROFILES.VIAJES.backFields
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState(null);
  const [processingError, setProcessingError] = useState(null);
  const [validationPopup, setValidationPopup] = useState(null);

  // Cara cuyo recorte se está corrigiendo a mano ('front' o 'back'). Se puede si se guardó la foto que se envió
  // al servidor, y no mientras se procesa, porque el resultado que llegase sería de la foto anterior
  const [cropSide, setCropSide] = useState(null);
  const metadataDe = (side) => (side === 'front' ? frontMetadata : side === 'back' ? backMetadata : null);
  const ajustarCara = (side) =>
    !DEMO_MODE.enabled && onAdjustCrop && metadataDe(side)?.original && !isProcessing
      ? () => setCropSide(side)
      : null;

  // Cara cuya foto se está girando ('front' o 'back'). Mientras tanto no se puede volver a girar ni intercambiar
  const [girando, setGirando] = useState(null);

  const handleCropAdjusted = async (croppedFile, esquinas) => {
    const side = cropSide;
    setCropSide(null);
    // Con la foto nueva el resultado anterior ya no vale y hay que procesar otra vez
    setProcessedResult(null);
    setManualCensorList(null);
    setProcessingError(null);
    // Si la cara se había girado, el recorte nuevo se gira igual antes de ponerlo. Mientras, cuenta como girando
    setGirando(side);
    try {
      await onAdjustCrop(side, croppedFile, esquinas);
    } finally {
      setGirando(null);
    }
  };

  // Atrás cierra la censura o el recorte manual en vez de salir del editor. Cerrar la censura es como «Cancelar»
  const cancelarCensuraManual = () => {
    setManualCensorList(null);
    setProcessedResult(null); // Resetear para volver a mostrar imágenes originales
  };
  useCloseOnBack(Boolean(manualCensorList), cancelarCensuraManual);
  useCloseOnBack(Boolean(cropSide), () => setCropSide(null));

  // «Girar» e «Intercambiar caras» arreglan a mano el DNI girado, boca abajo o con las caras cambiadas, que si no
  // acaba en censura manual. Como con «Ajustar recorte», no se puede mientras se procesa y el resultado anterior se borra
  const [avisoGiro, setAvisoGiro] = useState(null);
  const olvidarResultado = () => {
    setProcessedResult(null);
    setManualCensorList(null);
    setProcessingError(null);
  };

  const girarCara = (side) =>
    !DEMO_MODE.enabled && onRotate && !isProcessing && (side === 'front' ? frontFile : backFile)
      ? async () => {
        setGirando(side);
        setAvisoGiro(null);
        try {
          await onRotate(side);
          olvidarResultado();
        } catch (error) {
          console.error('❌ No se pudo girar la foto:', error);
          setAvisoGiro('No se ha podido girar la foto. Vuelve a intentarlo.');
        } finally {
          setGirando(null);
        }
      }
      : null;

  // Mientras se gira una cara no se puede procesar, porque se procesaría la foto de antes del giro
  const procesarBloqueado = isProcessing || Boolean(girando);
  const puedeIntercambiar = Boolean(!DEMO_MODE.enabled && onSwapSides && frontFile && backFile && !isProcessing && !girando);
  const intercambiarCaras = () => {
    onSwapSides();
    olvidarResultado();
  };

  const selectedFrontCount = Object.values(selectedFrontFields).filter(Boolean).length;
  const selectedBackCount = Object.values(selectedBackFields).filter(Boolean).length;
  const selectedCount = selectedFrontCount + selectedBackCount;

  // Si cambia lo que se tapa después de procesar, el resultado deja de corresponder a la selección y se quita, como al
  // girar o ajustar el recorte. Si no, se descargaba la copia tapada con la selección de antes y con la marca de agua
  // del perfil nuevo, que se pone al descargar. Va en useLayoutEffect para que no llegue a verse el resultado viejo
  const claveSeleccion = [
    frontfields.map((campo) => (selectedFrontFields[campo] ? 1 : 0)).join(''),
    backfields.map((campo) => (selectedBackFields[campo] ? 1 : 0)).join('')
  ].join('|');
  const seleccionAnterior = useRef(claveSeleccion);
  useLayoutEffect(() => {
    if (seleccionAnterior.current === claveSeleccion) return;
    seleccionAnterior.current = claveSeleccion;
    setProcessedResult(null);
    setProcessingError(null);
  }, [claveSeleccion]);

  const [watermarkText, setWatermarkText] = useState('Uso exclusivo para Viajes');

  useEffect(() => {
    if (processedResult) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [processedResult]);

  useEffect(() => {
    setCachedOcrData(initialOcrData);
  }, [initialOcrData]);

  useEffect(() => {
    setCachedValidation(initialValidation);
  }, [initialValidation]);

  useEffect(() => {
    if (initialValidation?.ok) {
      setValidationPopup({
        type: 'success',
        message: initialValidation.message
      });
    }
  }, [initialValidation]);

  useEffect(() => {
    if (validationPopup?.type !== 'success') {
      return undefined;
    }

    const timer = setTimeout(() => setValidationPopup(null), 4000);
    return () => clearTimeout(timer);
  }, [validationPopup]);

  // Verificar si la configuración actual coincide con algún perfil
  useEffect(() => {
    // No hacer nada si ya hay un perfil seleccionado explícitamente
    if (selectedProfile) {
      const profile = DNI_PROFILES.getProfileById(selectedProfile);
      if (profile) {
        const profileFront = profile.frontFields || profile.fields || {};
        const profileBack = profile.backFields || {};

        const frontMatch = JSON.stringify(profileFront) === JSON.stringify(selectedFrontFields);
        const backMatch = JSON.stringify(profileBack) === JSON.stringify(selectedBackFields);

        // Si coincide exactamente, mantener el perfil seleccionado
        if (frontMatch && backMatch) {
          return;
        }
      }
    }

    // Solo buscar coincidencias si no hay perfil seleccionado o si los campos no coinciden
    const checkProfileMatch = () => {
      const profiles = ['viajes', 'salud', 'administrativo', 'financiero'];

      for (const profileId of profiles) {
        const profile = DNI_PROFILES.getProfileById(profileId);
        if (profile) {
          const profileFront = profile.frontFields || profile.fields || {};
          const profileBack = profile.backFields || {};

          const frontMatch = JSON.stringify(profileFront) === JSON.stringify(selectedFrontFields);
          const backMatch = JSON.stringify(profileBack) === JSON.stringify(selectedBackFields);

          if (frontMatch && backMatch) {
            setSelectedProfile(profileId);
            return;
          }
        }
      }

      setSelectedProfile(null);
    };

    checkProfileMatch();
  }, [selectedFrontFields, selectedBackFields]);

  useEffect(() => {
    if (selectedProfile) {
      const profile = DNI_PROFILES.getProfileById(selectedProfile);
      if (profile) {
        setWatermarkText(`Uso exclusivo para ${profile.name}`);
      }
    } else {
      setWatermarkText('Uso exclusivo para verificación');
    }
  }, [selectedProfile]);

  const dismissValidationPopup = () => setValidationPopup(null);

  // Actualizar campos cuando se selecciona un perfil
  const handleProfileSelect = (profileId) => {
    const profile = DNI_PROFILES.getProfileById(profileId);
    if (profile) {
      setSelectedProfile(profileId);
      setSelectedFrontFields(profile.frontFields || profile.fields || {});
      setSelectedBackFields(profile.backFields || {});
    }
  };

  const handleFieldToggle = (fieldName) => {
    if (frontfields.includes(fieldName)) {
      setSelectedFrontFields(prev => ({
        ...prev,
        [fieldName]: !prev[fieldName]
      }));
    } else if (backfields.includes(fieldName)) {
      setSelectedBackFields(prev => ({
        ...prev,
        [fieldName]: !prev[fieldName]
      }));
    }
  };

  const handleSelectAll = () => {
    setSelectedFrontFields(frontfields.reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {}));

    setSelectedBackFields(backfields.reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {}));

    setSelectedProfile('complete');
  };

  const handleDeselectAll = () => {
    setSelectedFrontFields(frontfields.reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {}));

    setSelectedBackFields(backfields.reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {}));

    setSelectedProfile(null);
  };

  const handleManualCensorComplete = (result) => {
    console.log('[+] Censura manual completada:', result);
    setManualCensorList(null);

    setProcessedResult(prev => ({
      ...prev,
      frontImageUrl: result.frontImageUrl || prev?.frontImageUrl,
      backImageUrl: result.backImageUrl || prev?.backImageUrl,
      success: true,
      manualCensor: true
    }));
  };

  // Cada «Procesar» lleva un número. Si mientras procesa se cierra el editor, se sale de la vista o cambia la foto
  // de alguna cara, ese número deja de ser el vigente y el procesado ya no aplica su resultado ni guarda métricas.
  // Va en useLayoutEffect para que el número cambie en el mismo momento en que se quita el editor, no un poco después
  const ejecucionRef = useRef(0);
  const enCursoRef = useRef(null);
  useLayoutEffect(() => () => {
    ejecucionRef.current += 1;
  }, [frontFile, backFile]);

  // Registro anónimo de uso que se envía a /save, uno por cada detección nueva (ver handleProcessDNI).
  // Lleva qué se eligió tapar y cómo fue el procesado, nunca datos leídos del DNI.
  // caras.front y caras.back traen las detecciones de esa cara, también cuando salen de la caché,
  // y manual, que dice si esa cara va a censura manual. caras.back es null si no hay reverso.
  // plantilla trae la plantilla colocada y el plan de la cara, y en el reverso si se separó la calle (MET-4).
  // modelo es la versión del modelo de campos (ver obtenerVersionModelo en metricasDeteccion.js).
  // Los datos nuevos se añaden aquí
  const armarMetricas = (caras, modelo) => ({
    profileUsed: selectedProfile || 'personalizado',
    // Siempre los 13 campos del anverso y los 8 del reverso, a true los que se tapan
    hiddenFields: {
      frontFields: completarCampos(frontfields, selectedFrontFields),
      backFields: completarCampos(backfields, selectedBackFields)
    },
    manualCensor: caras.front.manual || Boolean(caras.back?.manual),
    manualDetection: manualDetection,
    hologramReadable: caras.front.detecciones.some(d => HOLOGRAM_CLASSES.includes(d.label)),
    watermarkText: watermarkText,
    // Qué clases encontró el detector en cada cara y con qué confianza, sin cajas ni textos
    deteccion: construirDeteccion({
      anverso: caras.front.detecciones,
      reverso: caras.back ? caras.back.detecciones : null,
      anversoAutomatico: !caras.front.manual,
      reversoAutomatico: Boolean(caras.back) && !caras.back.manual,
      anversoPlantilla: caras.front.plantilla,
      reversoPlantilla: caras.back?.plantilla,
      modelo
    })
  });

  const handleProcessDNI = async () => {
    // Una segunda pulsación mientras se procesa no lanza otro procesado
    if (enCursoRef.current === ejecucionRef.current) return;
    const ejecucion = ++ejecucionRef.current;
    enCursoRef.current = ejecucion;
    const vigente = () => ejecucionRef.current === ejecucion;

    try {
      setIsProcessing(true);
      setProcessingError(null);
      setValidationPopup(null);
      setProcessedResult(null);
      // La versión del modelo se pide ya, a la vez que la detección, para tenerla lista al guardar
      obtenerVersionModelo();

      let frontFileToProcess = frontFile;
      let backFileToProcess = backFile || null;

      // DEMO MODE
      if (DEMO_MODE.enabled) {
        const frontResponse = await fetch('/demo/front-image.jpg');
        const frontBlob = await frontResponse.blob();
        frontFileToProcess = new File([frontBlob], 'front-demo.jpg', { type: 'image/jpeg' });

        if (backFile) {
          const backResponse = await fetch('/demo/back-image.jpg');
          const backBlob = await backResponse.blob();
          backFileToProcess = new File([backBlob], 'back-demo.jpg', { type: 'image/jpeg' });
        }
      }

      const result = {
        success: true,
        manualCensor: false
      };

      // Si la foto ya se detectó en un procesado anterior, sus detecciones salen de la caché.
      // Los campos se buscan en la foto y en una copia con la luz aplanada, porque con la luz desigual de las fotos
      // de la cámara el detector se deja campos pequeños (ver utils/flatLight.js)
      const frontGuardadas = deteccionesPorFoto.get(frontFileToProcess);
      const frontDetections = frontGuardadas?.detecciones
        || await detectWithFlatLight(frontFileToProcess, detectDniFromCanvas);
      if (!vigente()) return;

      let backDetections = [];
      let backGuardadas = null;
      if (backFileToProcess) {
        backGuardadas = deteccionesPorFoto.get(backFileToProcess);
        backDetections = backGuardadas?.detecciones
          || await detectWithFlatLight(backFileToProcess, detectDniFromCanvas);
        if (!vigente()) return;
      }

      // Cada cara se tapa sola ('auto'), se tapa con lo encontrado y pide a mano lo que falta ('parcial') o se tapa
      // entera a mano ('manual'). Cada dato se tapa también donde se repite, y lo que el modelo no encuentra se tapa en
      // su sitio si la plantilla del DNI encaja con lo encontrado. Ver utils/planCensura.js y utils/plantillaDni.js
      const campos = { anverso: selectedFrontFields, reverso: selectedBackFields };
      const [frontTamano, backTamano] = await Promise.all([
        tamanoDeFoto(frontFileToProcess),
        backFileToProcess ? tamanoDeFoto(backFileToProcess) : null
      ]);
      if (!vigente()) return;
      const frontAjuste = ajustarPlantilla(frontDetections, 'anverso', frontTamano);
      const modos = {
        front: planDeCara({ cara: 'anverso', campos, detecciones: frontDetections, ajuste: frontAjuste, tamano: frontTamano })
      };
      // Lo que se envía de la plantilla en las métricas (MET-4)
      const plantillas = { front: { ajuste: frontAjuste, plan: modos.front }, back: null };
      console.log(`🔍 [ANVERSO] ${frontDetections.length} detecciones, ${frontAjuste.motivo} → censura ${modos.front.modo} (${modos.front.motivo})`);
      if (backFileToProcess) {
        const backAjuste = ajustarPlantilla(backDetections, 'reverso', backTamano);
        // Para tapar la calle y dejar a la vista el municipio y la provincia (Viajes) hay que separar las líneas del
        // domicilio. Solo se intenta con una única caja DOMICILIO. Si no salen claras, se tapa el bloque entero
        let lineasDomicilio = null;
        const cajasDomicilio = backDetections.filter((d) => d.label === 'DOMICILIO');
        const soloLaCalle = selectedBackFields.domicilio === true && selectedBackFields.municipio !== true
          && selectedBackFields.provincia !== true;
        const domicilioPedido = soloLaCalle && cajasDomicilio.length === 1;
        if (domicilioPedido) {
          lineasDomicilio = await lineasDelDomicilio(backFileToProcess, cajasDomicilio[0]).catch((error) => {
            console.error('[DNIEditor] No se han podido separar las líneas del domicilio:', error);
            return null;
          });
          if (!vigente()) return;
        }
        modos.back = planDeCara({
          cara: 'reverso', campos, detecciones: backDetections, ajuste: backAjuste, tamano: backTamano, lineasDomicilio
        });
        plantillas.back = {
          ajuste: backAjuste,
          plan: modos.back,
          // Si se pidió tapar solo la calle y la cara no fue entera a mano, si se pudo. Con más de una caja DOMICILIO no
          // se intenta y se tapa el bloque entero, así que cuenta como no partido
          domicilioPartido: soloLaCalle && modos.back.modo !== 'manual' && cajasDomicilio.length > 0
            ? Boolean(lineasDomicilio) : null,
        };
        console.log(`🔍 [REVERSO] ${backDetections.length} detecciones, ${backAjuste.motivo} → censura ${modos.back.modo} (${modos.back.motivo})`);
      }

      // Se tapa cada cara una sola vez. La que va entera a censura manual se salta. La parcial se tapa con lo encontrado
      // y después la censura manual pide solo lo que falta (FUN-2)
      const censurado = await censorDniComplete(
        modos.front.modo === 'manual' ? null : frontFileToProcess,
        modos.back && modos.back.modo !== 'manual' ? backFileToProcess : null,
        { frontFields: selectedFrontFields, backFields: selectedBackFields },
        { cajas: { front: modos.front.cajas, back: modos.back?.cajas } }
      );
      if (!vigente()) return;

      // Lo que va a la censura manual. Una cara entera lleva su foto sin tapar y una parcial la foto ya tapada con lo
      // encontrado, y en faltan los campos que hay que tapar a mano en esa cara, con su nombre en la interfaz. Una copia
      // de un dato (la ventana del soporte, el número pequeño...) trae su propio nombre. En copias van, de cada cara entera,
      // las zonas que repiten algo marcado, para avisar de ellas (ver copiasDeLoMarcado)
      const manualFiles = {};
      const faltan = {};
      const copias = {};
      const fotos = { front: frontFileToProcess, back: backFileToProcess };
      const urlDe = { front: 'frontImageUrl', back: 'backImageUrl' };
      Object.entries(modos).forEach(([lado, { modo, faltan: pendientes }]) => {
        if (modo === 'auto') {
          result[urlDe[lado]] = censurado[urlDe[lado]];
        } else if (modo === 'parcial') {
          manualFiles[lado] = dataUrlAArchivo(censurado[urlDe[lado]], `${lado === 'front' ? 'anverso' : 'reverso'}-tapado.jpg`);
          faltan[lado] = pendientes.map(({ campo, nombre }) => ({ campo, nombre: nombre || formatFieldName(campo) }));
        } else {
          manualFiles[lado] = fotos[lado];
          copias[lado] = copiasDeLoMarcado(lado === 'front' ? 'anverso' : 'reverso', campos)
            .map(({ campo, nombre }) => ({ campo, nombre: nombre || formatFieldName(campo) }));
        }
      });

      // --- GUARDAR EN BACKEND ---
      // Métricas de uso y el texto de la marca de agua (el campo avisa de que no se pongan datos personales).
      // Nunca se envía el número de DNI ni ningún dato leído del documento.
      // Un solo registro por foto y cara. Solo se guarda si alguna foto no se ha contado aún en la cara en la que está.
      // Volver a tapar las mismas fotos con otra selección no guarda otro. Después de subir otra foto, «Ajustar recorte»,
      // «Girar» o «Intercambiar caras» sí, salvo si al cuarto giro vuelve la foto de partida y ya estaba contada.
      // No se espera la respuesta. El resultado ya está listo y el guardado tarda entre
      // 0,7 s y 2 s, según el backend esté o no en frío. Si falla, solo se registra el error
      if (!frontGuardadas?.caras.has('front') || (backFileToProcess && !backGuardadas?.caras.has('back'))) {
        console.log("💾 Guardando métricas de uso...");
        const caras = {
          front: { detecciones: frontDetections, manual: Boolean(manualFiles.front), plantilla: plantillas.front },
          back: backFileToProcess
            ? { detecciones: backDetections, manual: Boolean(manualFiles.back), plantilla: plantillas.back }
            : null
        };
        // Normalmente la versión del modelo ya llegó. Si no, se espera como mucho 3 s (ver metricasDeteccion.js)
        obtenerVersionModelo().then((modelo) => dniApi.saveDniRecord(armarMetricas(caras, modelo)))
          .then(() => {
            console.log("✅ Métricas anónimas guardadas");
          })
          .catch((saveError) => {
            console.error("❌ Error al guardar en backend:", saveError);
          });
      }
      apuntarDetecciones(frontFileToProcess, frontDetections, 'front');
      if (backFileToProcess) apuntarDetecciones(backFileToProcess, backDetections, 'back');
      // --------------------------

      if (Object.keys(manualFiles).length > 0) {
        console.log(`📋 [RESULTADO] Censura manual necesaria para: ${Object.keys(manualFiles).map((lado) => `${lado} (${modos[lado].modo})`).join(', ')}`);
        console.log(`📋 [RESULTADO] Ya censurado automáticamente: ${[result.frontImageUrl ? 'anverso' : null, result.backImageUrl ? 'reverso' : null].filter(Boolean).join(', ') || 'ninguno'
          }`);
        setManualCensorList({ ...manualFiles, faltan, copias });
        setProcessedResult(result);
        return;
      }
      console.log('🎉 [RESULTADO] Censura 100% automática — no se necesita intervención manual');

      setProcessedResult(result);

    } catch (error) {
      if (!vigente()) return;
      console.error('Error procesando DNI:', error);
      // Los fallos del modelo y de OpenCV traen mensajes en inglés o solo un número. El detalle queda en la consola
      setProcessingError('No se ha podido procesar el DNI. Vuelve a intentarlo.');
    } finally {
      if (enCursoRef.current === ejecucion) {
        enCursoRef.current = null;
        setIsProcessing(false);
      }
    }
  };

  const handleReprocess = async () => {
    setProcessedResult(null);
    setProcessingError(null);
    await handleProcessDNI();
  };

  // La copia protegida que se descarga, con la marca de agua (ver useCopiaProtegida y ZonaDescarga). Mientras falta
  // tapar a mano alguna cara no hay copia que preparar
  const copia = useCopiaProtegida({
    delantera: manualCensorList ? null : processedResult?.frontImageUrl ?? null,
    trasera: manualCensorList ? null : processedResult?.backImageUrl ?? null,
    marca: watermarkText
  });

  const formatFieldName = (fieldName) => {
    const fieldNames = {
      nombre: 'Nombre',
      apellidos: 'Apellidos',
      dni: 'DNI',
      fechaNacimiento: 'Fecha de nacimiento',
      sexo: 'Sexo',
      nacionalidad: 'Nacionalidad',
      fechaExpedicion: 'Fecha de expedición',
      fechaCaducidad: 'Fecha de caducidad',
      numeroSoporte: 'Número de soporte',
      can: 'CAN',
      firma: 'Firma',
      fotografia: 'Fotografía',
      cli: 'Imagen láser (CLI)',
      mrz: 'MRZ',
      domicilio: 'Domicilio',
      municipio: 'Municipio',
      provincia: 'Provincia',
      lugarNacimiento: 'Lugar de nacimiento',
      equipoExpedidor: 'Equipo expedidor',
      ventanaSoporte: 'Ventana del soporte'
    };

    // Un campo sin nombre propio sale de su clave, con mayúscula solo en la primera palabra
    return fieldNames[fieldName] || fieldName
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^./, str => str.toUpperCase());
  };

  // Obtener el estado del campo (front o back)
  const isFieldSelected = (fieldName) => {
    if (frontfields.includes(fieldName)) {
      return selectedFrontFields[fieldName] || false;
    } else if (backfields.includes(fieldName)) {
      return selectedBackFields[fieldName] || false;
    }
    return false;
  };

  return (
    <>
      {/* Overlay de carga global */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div
                className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 mx-auto"
                style={{ borderTopColor: colors.primary }}
              ></div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Procesando DNI
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Estamos analizando y censurando los campos seleccionados...
            </p>
            <div className="flex items-center justify-center gap-1">
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: colors.primary, animationDelay: '0ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: colors.primary, animationDelay: '150ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: colors.primary, animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {validationPopup && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-xs sm:max-w-sm rounded-lg shadow-lg px-4 py-3 text-sm sm:text-base flex items-start gap-3 ${validationPopup.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
            }`}
        >
          <div className="flex-1">
            <span className="block text-sm font-semibold mb-1">
              {validationPopup.type === 'success'
                ? 'Validación correcta'
                : 'Validación fallida'}
            </span>
            <span className="block text-xs sm:text-sm leading-snug">
              {validationPopup.message}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissValidationPopup}
            className="ml-2 text-white/80 hover:text-white focus:outline-none"
            aria-label="Cerrar notificación"
          >
            <i className="bi bi-x-circle-fill"></i>
          </button>
        </div>
      )}
      {/* Abajo deja sitio para la barra fija del móvil */}
      <div className="min-h-screen bg-gray-100 pt-4 sm:pt-8 pb-28 lg:pb-8">
        <div className="container mx-auto px-4 max-w-7xl relative">
          {/* Inicio y Cambiar fotos. Van encima del título y solo se ponen a su lado desde 1024 px,
              porque en tableta se montaban sobre él */}
          <div className="mb-4 lg:mb-0 flex flex-wrap gap-3 lg:absolute lg:-top-4 lg:left-4 z-10">
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="btn btn-sm btn-secundario"
              >
                <i className="bi bi-house-door"></i>
                Inicio
              </button>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="btn btn-sm btn-secundario"
              >
                <i className="bi bi-arrow-left"></i>
                Cambiar fotos
              </button>
            )}
          </div>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
              Configurar DNI
            </h1>
            <p className="text-sm sm:text-lg text-gray-600 max-w-4xl mx-auto leading-tight">
              Elige un perfil predefinido o personaliza qué campos mostrar
            </p>
          </div>

          <div className="max-w-none mx-auto space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">

            {/* Vista previa */}
            <div className="order-2 lg:order-1 bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col h-fit">
              <div className="flex items-center mb-4 flex-shrink-0">
                <i className="bi bi-eye text-gray-600 text-lg sm:text-xl mr-2"></i>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Vista previa</h3>
              </div>

              {avisoGiro && (
                <Aviso tipo="girar" onCerrar={() => setAvisoGiro(null)} className="mb-4">
                  {avisoGiro}
                </Aviso>
              )}

              {/* MOSTRAR resultado procesado si existe */}
              {processedResult ? (
                <div className="space-y-4">
                  <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                    <div className="flex items-center text-success-800 text-sm font-medium">
                      <i className="bi bi-check-circle-fill text-success-600 mr-2"></i>
                      DNI procesado correctamente
                    </div>
                  </div>

                  {/* Mostrar imágenes procesadas */}
                  <div className="mb-4">
                    <EtiquetaCara
                      texto="Parte delantera procesada"
                      colores="bg-primary-100 text-primary-800"
                      nombreCara="delantera"
                      onAjustar={ajustarCara('front')}
                      onGirar={girarCara('front')}
                      girando={girando === 'front'}
                      ocupado={Boolean(girando)}
                    />
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                      <img
                        src={processedResult.frontImageUrl}
                        alt="Parte delantera del DNI procesada"
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  </div>

                  {puedeIntercambiar && processedResult.backImageUrl && <BotonIntercambiar onClick={intercambiarCaras} />}

                  {processedResult.backImageUrl && (
                    <div className="mb-4">
                      <EtiquetaCara
                        texto="Parte trasera procesada"
                        colores="bg-secondary-100 text-secondary-800"
                        nombreCara="trasera"
                        onAjustar={ajustarCara('back')}
                        onGirar={girarCara('back')}
                        girando={girando === 'back'}
                        ocupado={Boolean(girando)}
                      />
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                        <img
                          src={processedResult.backImageUrl}
                          alt="Parte trasera del DNI procesada"
                          className="w-full h-auto rounded-lg shadow-md"
                        />
                      </div>
                    </div>
                  )}

                  {/* Descarga de la copia protegida. Mientras falta tapar a mano alguna cara no hay copia */}
                  {!manualCensorList && <ZonaDescarga copia={copia} marca={watermarkText} />}

                </div>
              ) : (
                <>
                  {/* Mostrar imágenes originales */}
                  <div className="mb-4 flex-shrink-0">
                    <EtiquetaCara
                      texto="Parte delantera"
                      colores="bg-primary-100 text-primary-800"
                      nombreCara="delantera"
                      onAjustar={ajustarCara('front')}
                      onGirar={girarCara('front')}
                      girando={girando === 'front'}
                      ocupado={Boolean(girando)}
                    />
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                      <img
                        src={DEMO_MODE.enabled ? '/demo/front-image.jpg' : URL.createObjectURL(frontFile)}
                        alt="Parte delantera del DNI"
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  </div>

                  {puedeIntercambiar && <BotonIntercambiar onClick={intercambiarCaras} />}

                  {backFile && (
                    <div className="mb-4 flex-shrink-0">
                      <EtiquetaCara
                        texto="Parte trasera"
                        colores="bg-secondary-100 text-secondary-800"
                        nombreCara="trasera"
                        onAjustar={ajustarCara('back')}
                        onGirar={girarCara('back')}
                        girando={girando === 'back'}
                        ocupado={Boolean(girando)}
                      />
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                        <img
                          src={DEMO_MODE.enabled ? '/demo/back-image.jpg' : URL.createObjectURL(backFile)}
                          alt="Parte trasera del DNI"
                          className="w-full h-auto rounded-lg shadow-md"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Mostrar error si existe */}
              {processingError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center text-red-800 text-sm">
                    <i className="bi bi-exclamation-triangle-fill mr-2"></i>
                    Error: {processingError}
                  </div>
                </div>
              )}

              {/* Información del perfil seleccionado */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 mt-4">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Configuración actual</h4>
                <div className="space-y-1 text-xs sm:text-sm text-gray-700">
                  <div>
                    <strong>Perfil:</strong> {
                      selectedProfile
                        ? DNI_PROFILES.getProfileById(selectedProfile)?.name
                        : 'Personalizado'
                    }
                  </div>
                  <div>
                    <strong>Estado:</strong>
                    <span className={processedResult ? "text-success-700 font-medium" : ""}>
                      {processedResult ? ' Procesado' : ' Listo para procesar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración */}
            <div className="order-1 lg:order-2 bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col">
              <div className="flex items-center mb-4 flex-shrink-0">
                <i className="bi bi-sliders text-gray-600 text-lg sm:text-xl mr-2"></i>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Configuración</h3>
              </div>

              {/* Selector de perfiles */}
              <div className="flex-shrink-0">
                <ProfileSelector
                  selectedProfile={selectedProfile}
                  onProfileSelect={handleProfileSelect}
                  selectedFrontFields={selectedFrontFields}
                  selectedBackFields={selectedBackFields}
                />
              </div>

              {/* El único contador del editor. Cuenta las casillas marcadas de las dos caras, que son los datos que se tapan,
                  y cambia con los perfiles, «Censurar todo», «Mostrar todo» y cada casilla */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex-shrink-0">
                <div className="flex items-center text-gray-700 text-xs sm:text-sm" aria-live="polite">
                  <i className="bi bi-info-circle mr-2"></i>
                  Tapas {selectedCount} de {totalFields} datos
                </div>
              </div>

              {/* Lista de campos con checkboxes */}
              <div className="mb-4 flex-1 flex flex-col">
                <div className="mb-3 flex-shrink-0">
                  <h4 className="font-medium text-gray-700 mb-1 text-sm sm:text-base">Campos individuales</h4>
                  <p className="text-xs text-gray-500">
                    <i className="bi bi-info-circle mr-1.5"></i>
                    Marca los campos que deseas <strong className="text-secondary-600">censurar (ocultar)</strong> del documento
                  </p>
                </div>

                {/* Campos Front. En cada casilla la etiqueta es la caja entera, con su borde y su relleno, así se marca
                    pulsando en cualquier parte de la caja y no solo en la línea del texto, de 16 px en el móvil (UX-15) */}
                <div className="mb-4">
                  <h5 className="text-xs font-semibold text-gray-600 mb-2">Parte delantera</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {frontfields.map((fieldName) => (
                      <div key={fieldName} className="h-fit">
                        <label className="flex items-center cursor-pointer border border-gray-200 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isFieldSelected(fieldName)}
                              onChange={() => handleFieldToggle(fieldName)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${isFieldSelected(fieldName) ? 'shadow-md' : ''
                              }`}
                              style={{
                                backgroundColor: isFieldSelected(fieldName) ? '#EF4444' : 'white',
                                borderColor: isFieldSelected(fieldName) ? '#EF4444' : colors.border.default
                              }}
                              onMouseEnter={(e) => {
                                if (!isFieldSelected(fieldName)) {
                                  e.target.style.borderColor = '#EF4444';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isFieldSelected(fieldName)) {
                                  e.target.style.borderColor = colors.border.default;
                                }
                              }}
                            >
                              {isFieldSelected(fieldName) && (
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="ml-3 sm:ml-4 flex-1">
                            <div className="font-medium text-gray-800 text-xs sm:text-sm">
                              {formatFieldName(fieldName)}
                            </div>
                            {AYUDA_CAMPOS[fieldName] && (
                              <div className="mt-0.5 text-xs leading-snug text-gray-500">
                                {AYUDA_CAMPOS[fieldName]}
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campos Back */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-600 mb-2">Parte trasera</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {backfields.map((fieldName) => (
                      <div key={fieldName} className="h-fit">
                        <label className="flex items-center cursor-pointer border border-gray-200 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isFieldSelected(fieldName)}
                              onChange={() => handleFieldToggle(fieldName)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${isFieldSelected(fieldName) ? 'shadow-md' : ''
                              }`}
                              style={{
                                backgroundColor: isFieldSelected(fieldName) ? '#EF4444' : 'white',
                                borderColor: isFieldSelected(fieldName) ? '#EF4444' : colors.border.default
                              }}
                              onMouseEnter={(e) => {
                                if (!isFieldSelected(fieldName)) {
                                  e.target.style.borderColor = '#EF4444';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isFieldSelected(fieldName)) {
                                  e.target.style.borderColor = colors.border.default;
                                }
                              }}
                            >
                              {isFieldSelected(fieldName) && (
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="ml-3 sm:ml-4 flex-1">
                            <div className="font-medium text-gray-800 text-xs sm:text-sm">
                              {formatFieldName(fieldName)}
                            </div>
                            {AYUDA_CAMPOS[fieldName] && (
                              <div className="mt-0.5 text-xs leading-snug text-gray-500">
                                {AYUDA_CAMPOS[fieldName]}
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="mb-4 sm:mb-6 flex-shrink-0">
                <h4 className="font-medium text-gray-700 mb-3 text-sm sm:text-base">Acciones rápidas</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="btn btn-sm btn-secundario"
                  >
                    <i className="bi bi-x-circle-fill text-secondary-600"></i>
                    Censurar todo
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="btn btn-sm btn-secundario"
                  >
                    <i className="bi bi-check-circle-fill text-success-600"></i>
                    Mostrar todo
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex-shrink-0">

                <WatermarkInput
                  value={watermarkText}
                  onChange={setWatermarkText}
                  maxLength={50}
                />

                {/* En móvil y tablet «Procesar DNI» va en la barra fija de abajo. «Procesar de nuevo» se ve aquí en todas
                    las pantallas y es secundario, porque con el resultado lo principal es la copia (ver ZonaDescarga) */}
                {!processedResult ? (
                  <button
                    onClick={handleProcessDNI}
                    disabled={procesarBloqueado}
                    className="btn btn-principal w-full hidden lg:flex"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-gear-fill text-lg"></i>
                        Procesar DNI
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleReprocess}
                    disabled={procesarBloqueado}
                    className="btn btn-secundario w-full"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-repeat text-lg"></i>
                        Procesar de nuevo
                      </>
                    )}
                  </button>
                )}

                <div className="text-center text-xs sm:text-sm text-gray-600 my-3">
                  {selectedProfile
                    ? `Configuración: ${DNI_PROFILES.getProfileById(selectedProfile)?.name}`
                    : 'Configuración personalizada'
                  }
                </div>

                {/* Botón de regreso */}
                <button
                  onClick={onBack}
                  className="btn btn-secundario w-full"
                >
                  <i className="bi bi-arrow-left"></i>
                  Cambiar fotos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra fija en móvil y tablet con la acción principal, para no tener que bajar hasta el final.
          Primero «Procesar DNI» y, con el resultado, «Compartir» y «Descargar PDF» (ver ZonaDescarga) */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {processedResult && !manualCensorList ? (
          <div className="max-w-xl mx-auto">
            {copia.aviso && (
              <Aviso tipo="copia" onCerrar={copia.cerrarAviso} className="mb-3">
                {copia.aviso}
              </Aviso>
            )}
            <AccionesCopia copia={copia} compartirPrimero />
          </div>
        ) : (
          <button
            onClick={handleProcessDNI}
            disabled={procesarBloqueado}
            className="btn btn-principal flex w-full max-w-xl mx-auto"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                <i className="bi bi-gear-fill text-lg"></i>
                Procesar DNI
              </>
            )}
          </button>
        )}
      </div>

      {manualCensorList && (
        <ManualCensorModal
          frontFile={manualCensorList?.front}
          backFile={manualCensorList?.back}
          faltan={manualCensorList?.faltan}
          copias={manualCensorList?.copias}
          onComplete={handleManualCensorComplete}
          onCancel={cancelarCensuraManual}
        />
      )}

      {/* Corregir el recorte de una cara sobre la foto original, empezando en las esquinas que usó el servidor */}
      {cropSide && metadataDe(cropSide)?.original && (
        <ManualCropModal
          file={metadataDe(cropSide).original}
          initialCorners={metadataDe(cropSide).esquinas}
          titulo="Ajustar recorte"
          subtitulo={`Parte ${cropSide === 'front' ? 'delantera' : 'trasera'} del DNI`}
          onCrop={handleCropAdjusted}
          onCancel={() => setCropSide(null)}
        />
      )}
    </>
  );
}