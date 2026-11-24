import React, { useRef, useEffect, useCallback, useState } from 'react';
import ProjectInfo from '../ProjectInfo';
import MainSection from '../MainSection';
import SecuritySection from '../SecuritySection';
import FAQ from '../FAQ';
import Footer from '../Footer';
import PrivacyNotice from '../PrivacyNotice';
import CameraCapture from '../CameraCapture';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { usePreloadDetector } from '../../hooks/usePreloadDetector';
import { UploadSlotProvider, useUploadSlots } from '../../hooks/useUploadSlots';
import { usePageFileDrop } from '../../hooks/usePageFileDrop';
import { useCloseOnBack } from '../../hooks/useNavigation';
import { ATAJO_PEGAR } from '../../utils/atajos';

export default function UploadPage({
  frontFile,
  backFile,
  onFrontFileSelect,
  onBackFileSelect,
  onClearFrontFile,
  onClearBackFile,
  hasAllFiles,
  onContinueToEditor,
  shouldAutoNavigate = false,
  isProcessMode = false,
  validationError = null,
  isValidating = false,
  onGoHome
}) {
  const backSectionRef = useRef(null);
  const completionMessageRef = useRef(null);

  const previousFrontFile = useRef(frontFile);
  const previousBackFile = useRef(backFile);
  const initialLoadCompleted = useRef(false);

  // Scroll inicial al principio de la página
  useScrollToTop();

  // Preparar el modelo de detección mientras se suben las fotos
  usePreloadDetector();

  // Las fotos se pueden soltar o pegar en cualquier parte de la página, también las dos a la vez
  const slots = useUploadSlots();
  const [aviso, setAviso] = useState(null);
  const recibirFotos = useCallback((files, side) => setAviso(slots.distribute(files, side)), [slots]);
  const arrastre = usePageFileDrop(recibirFotos);

  useEffect(() => {
    if (!aviso) return undefined;
    const timer = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(timer);
  }, [aviso]);

  // Cámara de las dos caras. Está aquí y no en cada recuadro porque, al terminar una cara, su recuadro se cambia por
  // la vista previa y se llevaría la cámara con él. Si la otra cara aún no tiene foto, la cámara sigue con ella sin
  // cerrarse, como quien le da la vuelta al DNI. Si ya la tiene, se cierra al terminar
  const [camara, setCamara] = useState(null);
  const abrirCamara = useCallback((cara) => {
    const otra = cara === 'anverso' ? 'reverso' : 'anverso';
    setCamara({ caras: slots.libre(otra === 'anverso' ? 'front' : 'back') ? [cara, otra] : [cara] });
  }, [slots]);
  const cerrarCamara = useCallback(() => setCamara(null), []);
  // Atrás cierra la cámara y se queda en la subida con las fotos que ya se hayan hecho
  useCloseOnBack(Boolean(camara), cerrarCamara);
  const fotoDeLaCamara = useCallback((file, metadata, cara) => {
    (cara === 'reverso' ? onBackFileSelect : onFrontFileSelect)(file, metadata);
  }, [onFrontFileSelect, onBackFileSelect]);

  const carasLibres = [!frontFile && 'delantera', !backFile && 'trasera'].filter(Boolean);
  let textoArrastre = 'Suelta la foto en el recuadro de su cara';
  if (carasLibres.length === 0) textoArrastre = 'Ya hay una foto en cada cara. Quita la que quieras cambiar';
  else if (carasLibres.length === 1) textoArrastre = `Suelta la foto de la parte ${carasLibres[0]}`;
  else if (arrastre.count >= 2) textoArrastre = 'Suelta las dos fotos en cualquier parte';

  const isMobileView = () => {
    return window.innerWidth < 768;
  };

  // Función para hacer scroll suave a la sección trasera
  const scrollToBackSection = useCallback(() => {
    if (backSectionRef.current && isMobileView()) {
      // Pequeño delay para que se vea la confirmación de la foto delantera
      setTimeout(() => {
        // La subida puede haberse cerrado entretanto, con Atrás o al abrir el editor
        if (!backSectionRef.current) return;
        backSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });

        // Agregar efecto visual temporal de destacado, en el rojo del «2» de la parte trasera. Era azul, un color que la
        // web no usa para nada más (UX-14, punto 11)
        backSectionRef.current.classList.add('ring-2', 'ring-secondary-400', 'ring-opacity-50');
        setTimeout(() => {
          if (backSectionRef.current) {
            backSectionRef.current.classList.remove('ring-2', 'ring-secondary-400', 'ring-opacity-50');
          }
        }, 2000);

      }, 400);
    }
  }, []);

  // Función para hacer scroll al mensaje de finalización
  const scrollToCompletionMessage = useCallback(() => {
    if (completionMessageRef.current && isMobileView()) {
      // Delay para que se vea la confirmación de la foto trasera
      setTimeout(() => {
        if (!completionMessageRef.current) return;
        completionMessageRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        // Agregar efecto visual temporal de destacado, en verde, como el mensaje de que todo ha ido bien. Era azul (UX-14, punto 11)
        completionMessageRef.current.classList.add('ring-2', 'ring-success-400', 'ring-opacity-50');
        setTimeout(() => {
          if (completionMessageRef.current) {
            completionMessageRef.current.classList.remove('ring-2', 'ring-success-400', 'ring-opacity-50');
          }
        }, 3000);

      }, 400);
    }
  }, []);

  // Auto-scroll cuando se sube la foto delantera en móvil (solo si es una nueva subida)
  useEffect(() => {
    // Marcar que la carga inicial está completa en el próximo render
    if (!initialLoadCompleted.current) {
      setTimeout(() => {
        initialLoadCompleted.current = true;
      }, 100);
      return;
    }

    // Solo hacer scroll si realmente cambió de null/undefined a tener archivo
    const wasEmpty = !previousFrontFile.current;
    const nowHasFile = !!frontFile;
    const isNewUpload = wasEmpty && nowHasFile && !backFile;

    if (isNewUpload) {
      scrollToBackSection();
    }

    previousFrontFile.current = frontFile;
  }, [frontFile, backFile, scrollToBackSection]);

  // Auto-scroll cuando ambas fotos estén cargadas en móvil (solo si es una nueva subida)
  useEffect(() => {
    if (!initialLoadCompleted.current) {
      return;
    }

    const wasEmpty = !previousBackFile.current;
    const nowHasFile = !!backFile;
    const isNewUpload = wasEmpty && nowHasFile && frontFile && hasAllFiles;

    if (isNewUpload) {
      scrollToCompletionMessage();
    }

    previousBackFile.current = backFile;
  }, [frontFile, backFile, scrollToCompletionMessage, hasAllFiles]);

  return (
    <>
      <section className="py-4 sm:py-16 flex flex-col items-center justify-center p-4">
        {/* data-arrastrando ilumina los recuadros libres mientras se arrastra una foto por la página */}
        <div
          className="w-full max-w-7xl relative group/subida"
          data-arrastrando={arrastre.active ? 'true' : 'false'}
        >
          {arrastre.active && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-5 py-3 rounded-full bg-gray-900/90 text-white text-sm font-medium shadow-xl flex items-center gap-2 whitespace-nowrap">
              <i className="bi bi-download"></i>
              {textoArrastre}
            </div>
          )}

          {aviso && (
            <div
              role="status"
              className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 px-4 py-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm shadow-lg flex items-start gap-2"
            >
              <i className="bi bi-info-circle-fill mt-0.5"></i>
              <span>{aviso}</span>
            </div>
          )}

          {/* Botón Volver al inicio. Va encima del título y solo se pone a su lado desde 1024 px, porque en tableta se montaba sobre él */}
          <div className="mb-3 sm:mb-4 lg:mb-0 lg:absolute lg:-top-8 lg:left-0 z-10">
            <button
              onClick={onGoHome}
              className="btn btn-sm btn-secundario"
            >
              <i className="bi bi-arrow-left"></i>
              Volver al inicio
            </button>
          </div>

          {/* Header general. En móvil se queda en el título, para que los botones de subir se vean sin bajar */}
          <div className="text-center mb-4 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 sm:mb-4">
              Subir ambas partes del DNI
            </h2>
            {/* Con ratón o trackpad (la misma consulta que FileUploadZone) se pueden soltar o pegar las dos fotos a la
                vez y cada una va a su recuadro, pero nada lo decía. La frase de debajo del título lo dice, con lo
                importante en negrita, porque sin ella pasaba desapercibida y en una franja aparte se veía demasiado.
                Con el dedo sigue la frase de antes. Debajo había dos puntitos con «Parte delantera» y «Parte trasera»,
                que repetían esa frase y los títulos de los recuadros (punto 11 de UX-14) */}
            <p className="hidden sm:block text-base md:text-lg text-gray-600">
              <span className="[@media(hover:hover)_and_(pointer:fine)]:hidden">
                Sube las fotos de la parte delantera y trasera de tu DNI
              </span>
              <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">
                <strong className="font-semibold text-gray-800">Arrastra las dos fotos a la vez</strong> y cada una
                irá a su recuadro, o pégalas con {ATAJO_PEGAR}
              </span>
            </p>
          </div>

          {/* Grid responsive: una columna en móvil, dos columnas en pantallas medianas y grandes */}
          {/* En cada tarjeta, data-upload-side dice a qué cara va una foto soltada encima.
              En móvil el número va a la izquierda del título para ahorrar alto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            {/* Parte Delantera */}
            <div data-upload-side="front" className="bg-white rounded-lg shadow-xl p-4 sm:p-6">
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 mb-4 text-left sm:block sm:text-center sm:mb-6">
                <div className="row-span-2 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full sm:mb-4">
                  <span className="text-lg sm:text-xl font-bold text-primary-800">1</span>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 leading-tight sm:mb-2">
                  Parte delantera
                </h3>
                <p className="text-sm md:text-base text-gray-600">
                  Sube una foto de la <strong>parte delantera</strong> de tu DNI
                </p>
              </div>

              <UploadSlotProvider value={slots.front}>
                <MainSection
                  key="front-section"
                  selectedFile={frontFile}
                  onFileSelect={onFrontFileSelect}
                  onClearImage={onClearFrontFile}
                  onHacerFoto={() => abrirCamara('anverso')}
                  stepInfo={{
                    current: 1,
                    total: 2,
                    side: 'delantera'
                  }}
                />
              </UploadSlotProvider>
            </div>

            {/* Parte Trasera */}
            <div ref={backSectionRef} data-upload-side="back" className="bg-white rounded-lg shadow-xl p-4 sm:p-6 transition-all duration-500">
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 mb-4 text-left sm:block sm:text-center sm:mb-6">
                <div className="row-span-2 inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-secondary-100 rounded-full sm:mb-4">
                  <span className="text-lg sm:text-xl font-bold text-secondary-600">2</span>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 leading-tight sm:mb-2">
                  Parte trasera
                </h3>
                <p className="text-sm md:text-base text-gray-600">
                  Sube una foto de la <strong>parte trasera</strong> de tu DNI
                </p>
              </div>

              <UploadSlotProvider value={slots.back}>
                <MainSection
                  key="back-section"
                  selectedFile={backFile}
                  onFileSelect={onBackFileSelect}
                  onClearImage={onClearBackFile}
                  onHacerFoto={() => abrirCamara('reverso')}
                  stepInfo={{
                    current: 2,
                    total: 2,
                    side: 'trasera'
                  }}
                />
              </UploadSlotProvider>
            </div>
          </div>

          {/* Información básica de protección de datos (primera capa) */}
          <PrivacyNotice />

          {/* Mensaje cuando ambas fotos estén cargadas */}
          {hasAllFiles && (
            <div ref={completionMessageRef} className="text-center mt-8 transition-all duration-500">
              <div className="bg-success-50 border border-success-200 rounded-lg p-6">
                <div className="flex items-center justify-center text-success-800 mb-3">
                  <i className="bi bi-check-circle-fill text-2xl mr-3"></i>
                  <span className="text-lg font-bold">¡Ambas partes cargadas correctamente!</span>
                </div>

                {shouldAutoNavigate ? (
                  <>
                    <p className="text-success-800 mb-4">
                      Dirigiéndote automáticamente al editor para seleccionar los campos...
                    </p>

                    {/* Indicador de carga */}
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success-700 mr-3"></div>
                      <span className="text-success-800 font-medium">
                        {isValidating ? 'Validando documentación...' : 'Procesando...'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-success-800 mb-4">
                      ¿Quieres continuar con estas fotos o cambiar alguna?
                    </p>

                    {/* Botón manual para continuar */}
                    <button
                      onClick={onContinueToEditor}
                      disabled={isValidating}
                      className="btn btn-principal"
                    >
                      <i className="bi bi-arrow-right"></i>
                      {isValidating ? 'Validando...' : 'Continuar al editor'}
                    </button>
                  </>
                )}
                {validationError && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
                    <div className="flex items-center justify-center gap-2">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <span>{validationError}</span>
                    </div>
                    <p className="text-xs text-red-500 mt-2">
                      Revisa la calidad de las imágenes y vuelve a subirlas para intentarlo de nuevo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {camara && (
        <CameraCapture caras={camara.caras} onCapture={fotoDeLaCamara} onClose={cerrarCamara} />
      )}

      {!isProcessMode && (
        <>
          <SecuritySection />
          <FAQ />
          <Footer />
        </>
      )}
    </>
  );
}
