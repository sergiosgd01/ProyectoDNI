import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import DNIEditor from './components/DNIEditor';
import HomePage from './components/pages/HomePage';
import UploadPage from './components/pages/UploadPage';
import JornadasPage from './components/pages/JornadasPage';
import AvisoLegalPage from './components/pages/AvisoLegalPage';
import PrivacidadPage from './components/pages/PrivacidadPage';
import ProcessingLoader from './components/ProcessingLoader';
import { useDNIFiles } from './hooks/useDNIFiles';
import { useNavigation, NavigationContext } from './hooks/useNavigation';
import { useAutoNavigation } from './hooks/useAutoNavigation';
import { VIEWS } from './constants/views';
import { DEMO_MODE } from './config/demoMode';
import { girarFoto } from './utils/girarFoto';
import './index.css';

function App() {
  const {
    frontFile,
    backFile,
    handleFrontFileSelect,
    handleBackFileSelect,
    clearFrontFile,
    clearBackFile,
    hasAllFiles,
    frontMetadata,
    backMetadata
  } = useDNIFiles();

  // Estado para controlar si debe hacer auto-navegación al editor
  const [shouldAutoNavigate, setShouldAutoNavigate] = useState(true);

  // El editor necesita las dos fotos. Si faltan, por ejemplo tras recargar la página o al ir con Adelante
  // después de quitar una, se muestra la subida
  const hasBothFiles = Boolean(frontFile && backFile);
  const resolveView = useCallback(
    (view) => (view === VIEWS.EDITOR && !hasBothFiles ? VIEWS.UPLOAD_PROCESS : view),
    [hasBothFiles]
  );

  // Con Atrás o Adelante no se salta solo al editor. Si no, al volver del editor a la subida
  // con las dos fotos puestas se abriría otra vez el editor
  const handleHistoryNavigate = useCallback(() => setShouldAutoNavigate(false), []);

  const { currentView, goTo, goBack, goHome } = useNavigation({
    resolveView,
    onHistoryNavigate: handleHistoryNavigate
  });

  // Para los enlaces del pie, que cambian de vista sin recargar la página
  const navegacion = useMemo(() => ({ currentView, goTo }), [currentView, goTo]);

  // Estado para controlar el loader de procesamiento (solo en modo demo)
  const [showProcessingLoader, setShowProcessingLoader] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [preOcrData, setPreOcrData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Resetear auto-navegación cuando se sube la primera de las dos fotos. Puede ser la trasera,
  // porque al soltar las dos a la vez se procesan a la par y cualquiera puede terminar antes
  useEffect(() => {
    if (Boolean(frontFile) !== Boolean(backFile) && shouldAutoNavigate === false) {
      setShouldAutoNavigate(true);
    }
  }, [frontFile, backFile, shouldAutoNavigate]);

  useEffect(() => {
    setPreOcrData(null);
    setValidationResult(null);
    setValidationError(null);
  }, [frontFile, backFile]);

  // const performPreValidation = useCallback(async () => {
  //   if (!frontFile || !backFile) {
  //     const message = 'Debes subir ambas caras del DNI antes de continuar.';
  //     setValidationError(message);
  //     return { ok: false, message };
  //   }

  //   if (preOcrData && validationResult?.ok) {
  //     return {
  //       ok: true,
  //       ocr: preOcrData,
  //       validation: validationResult
  //     };
  //   }

  //   try {
  //     setIsValidating(true);
  //     setValidationError(null);

  //     const ocr = await extractDniText(frontFile, backFile);
  //     const validation = validateDniConsistency(ocr);

  //     if (!validation?.ok) {
  //       setPreOcrData(null);
  //       setValidationResult(validation);
  //       setValidationError(validation?.message || 'Los datos del DNI no coinciden. Vuelve a subir las imágenes.');
  //       return {
  //         ok: false,
  //         message: validation?.message,
  //         validation
  //       };
  //     }

  //     setPreOcrData(ocr);
  //     setValidationResult(validation);
  //     setValidationError(null);

  //     return {
  //       ok: true,
  //       ocr,
  //       validation
  //     };
  //   } catch (error) {
  //     const message = error?.message || 'Error ejecutando OCR. Intenta de nuevo.';
  //     setPreOcrData(null);
  //     setValidationResult(null);
  //     setValidationError(message);
  //     return {
  //       ok: false,
  //       message,
  //       error
  //     };
  //   } finally {
  //     setIsValidating(false);
  //   }
  // }, [frontFile, backFile, preOcrData, validationResult]);

  const performPreValidation = useCallback(async () => {
    if (!frontFile || !backFile) {
      const message = 'Debes subir ambas caras del DNI antes de continuar.';
      setValidationError(message);
      return { ok: false, message };
    }

    // ============================================
    // VALIDACIÓN OCR DESHABILITADA TEMPORALMENTE
    // ============================================
    console.log('⚠️ Validación OCR deshabilitada - Pasando directamente al editor');

    return {
      ok: true,
      ocr: null,
      validation: { ok: true, message: 'Validación omitida (desarrollo)' }
    };

    /* CÓDIGO ORIGINAL DE VALIDACIÓN COMENTADO
    if (preOcrData && validationResult?.ok) {
      return {
        ok: true,
        ocr: preOcrData,
        validation: validationResult
      };
    }

    try {
      setIsValidating(true);
      setValidationError(null);

      const ocr = await extractDniText(frontFile, backFile);
      const validation = validateDniConsistency(ocr);

      if (!validation?.ok) {
        setPreOcrData(null);
        setValidationResult(validation);
        setValidationError(validation?.message || 'Los datos del DNI no coinciden. Vuelve a subir las imágenes.');
        return {
          ok: false,
          message: validation?.message,
          validation
        };
      }

      setPreOcrData(ocr);
      setValidationResult(validation);
      setValidationError(null);

      return {
        ok: true,
        ocr,
        validation
      };
    } catch (error) {
      const message = error?.message || 'Error ejecutando OCR. Intenta de nuevo.';
      setPreOcrData(null);
      setValidationResult(null);
      setValidationError(message);
      return {
        ok: false,
        message,
        error
      };
    } finally {
      setIsValidating(false);
    }
    */
  }, [frontFile, backFile]);

  // Auto-navegación cuando ambos archivos están listos
  // Si DEMO_MODE está activo, pasar el setter del loader
  useAutoNavigation(
    frontFile,
    backFile,
    currentView,
    goTo,
    shouldAutoNavigate,
    DEMO_MODE.enabled ? setShowProcessingLoader : null,  // Solo pasar si demo está activo
    performPreValidation,
    (result) => {
      setShouldAutoNavigate(false);
      if (result?.message) {
        setValidationError(result.message);
      }
    }
  );

  const handleStartProcess = () => {
    // Cuando se inicia el proceso por primera vez, permitir auto-navegación
    setShouldAutoNavigate(false);
    goTo(VIEWS.UPLOAD_PROCESS);
  };

  // Recorte de una cara corregido a mano desde el editor. Cuenta como recorte manual y guarda las esquinas
  // elegidas, para que un segundo ajuste empiece donde se dejó el primero.
  // Si la cara se había girado, el recorte nuevo se gira igual, porque el ajuste se hace sobre la foto original
  const handleAdjustCrop = useCallback(async (side, file, esquinas) => {
    const [metadata, select] = side === 'front'
      ? [frontMetadata, handleFrontFileSelect]
      : [backMetadata, handleBackFileSelect];
    const giro = metadata?.recorteSinGirar ? metadata.giro || 0 : 0;
    let girado = null;
    if (giro) {
      try {
        girado = await girarFoto(file, giro);
      } catch (error) {
        console.error('❌ No se pudo girar el recorte ajustado:', error);
      }
    }
    select(girado || file, {
      ...metadata,
      manualCrop: true,
      recorteAjustado: true,
      esquinas,
      giro: girado ? giro : 0,
      recorteSinGirar: girado ? file : null
    });
  }, [frontMetadata, backMetadata, handleFrontFileSelect, handleBackFileSelect]);

  // Gira 90° a la derecha la foto recortada de una cara. Siempre se gira el recorte sin girar, para no perder
  // calidad al volver a comprimir, y se crea un archivo nuevo sin tocar el anterior. Al cuarto giro vuelve el recorte de partida
  const handleRotate = useCallback(async (side) => {
    const [file, metadata, select] = side === 'front'
      ? [frontFile, frontMetadata, handleFrontFileSelect]
      : [backFile, backMetadata, handleBackFileSelect];
    if (!file) return;
    const sinGirar = metadata?.recorteSinGirar || file;
    const giro = ((metadata?.recorteSinGirar ? metadata.giro || 0 : 0) + 1) % 4;
    const girado = giro === 0 ? sinGirar : await girarFoto(sinGirar, giro);
    select(girado, { ...metadata, giro, recorteSinGirar: giro === 0 ? null : sinGirar });
  }, [frontFile, backFile, frontMetadata, backMetadata, handleFrontFileSelect, handleBackFileSelect]);

  // El editor ha visto al procesar que una cara llegaba boca abajo o de lado y la ha girado (FLU-2). Se pone la foto que
  // ya ha girado y detectado el editor, para no repetir la detección. Cuenta como tantos giros de «Girar» como cuartos
  // de vuelta, así que un giro a mano después sigue desde el recorte sin girar
  const handleEnderezar = useCallback((side, girada, cuartos = 2) => {
    const [file, metadata, select] = side === 'front'
      ? [frontFile, frontMetadata, handleFrontFileSelect]
      : [backFile, backMetadata, handleBackFileSelect];
    if (!file || !girada) return;
    const sinGirar = metadata?.recorteSinGirar || file;
    const giro = ((metadata?.recorteSinGirar ? metadata.giro || 0 : 0) + cuartos) % 4;
    select(girada, { ...metadata, giro, recorteSinGirar: sinGirar });
  }, [frontFile, backFile, frontMetadata, backMetadata, handleFrontFileSelect, handleBackFileSelect]);

  // Cambia el anverso por el reverso con todo lo de cada cara (foto original, esquinas, giro...).
  // Se intercambian los mismos archivos, sin copiarlos
  const handleSwapSides = useCallback(() => {
    handleFrontFileSelect(backFile, backMetadata);
    handleBackFileSelect(frontFile, frontMetadata);
  }, [frontFile, backFile, frontMetadata, backMetadata, handleFrontFileSelect, handleBackFileSelect]);

  const handleBackToStep = () => {
    // Cuando se regresa desde el editor, NO permitir auto-navegación
    setShouldAutoNavigate(false);
    // Si se llegó al editor desde la subida, se vuelve a esa entrada del historial como con Atrás
    goBack(VIEWS.UPLOAD_PROCESS);
  };

  const handleContinueToEditor = async () => {
    if (isValidating) {
      return;
    }

    const result = await performPreValidation();
    if (!result?.ok) {
      setShouldAutoNavigate(false);
      return;
    }

    // Si está en modo demo, mostrar loader
    if (DEMO_MODE.enabled) {
      setShowProcessingLoader(true);

      // Esperar a que termine la animación del loader
      await new Promise(resolve => {
        setTimeout(resolve, DEMO_MODE.timings.processingSteps);
      });

      setShowProcessingLoader(false);
    }

    // Ir al editor (con o sin demo)
    goTo(VIEWS.EDITOR);
  };

  const renderContent = () => {
    switch (currentView) {
      case VIEWS.HOME:
        return (
          <HomePage
            onStartProcess={handleStartProcess}
          />
        );

      case VIEWS.UPLOAD_PROCESS:
        // Vista unificada responsive: lado a lado en desktop, uno debajo del otro en móvil
        return (
          <UploadPage
            frontFile={frontFile}
            backFile={backFile}
            onFrontFileSelect={handleFrontFileSelect}
            onBackFileSelect={handleBackFileSelect}
            onClearFrontFile={clearFrontFile}
            onClearBackFile={clearBackFile}
            hasAllFiles={hasAllFiles}
            onContinueToEditor={handleContinueToEditor}
            shouldAutoNavigate={shouldAutoNavigate}
            isProcessMode={true}
            validationError={validationError}
            isValidating={isValidating}
            onGoHome={goHome}
          />
        );

      case VIEWS.EDITOR:
        // Determinar si hubo detección manual en alguna de las caras
        const isManualDetection = frontMetadata?.manualCrop || backMetadata?.manualCrop || false;

        return (
          <DNIEditor
            frontFile={frontFile}
            backFile={backFile}
            frontMetadata={frontMetadata}
            backMetadata={backMetadata}
            onAdjustCrop={handleAdjustCrop}
            onRotate={handleRotate}
            onEnderezar={handleEnderezar}
            onSwapSides={handleSwapSides}
            manualDetection={isManualDetection}
            onBack={handleBackToStep}
            onProcess={handleDNIProcess}
            initialOcrData={preOcrData}
            initialValidation={validationResult}
            onGoHome={goHome}
          />
        );

      // Carteles en JPEG de 1400 px, de 0,9 y 1 MB. Los PNG de 8 y 9,5 MB que se cargaban antes siguen en public por si
      // alguien enlazó la imagen directamente (UX-5, 24/11/2026)
      case VIEWS.JORNADAS_CACERES:
        return <JornadasPage imageSrc="/jornadasCaceres.jpg" />;

      case VIEWS.JORNADAS_MERIDA:
        return <JornadasPage imageSrc="/jornadasMerida.jpg" />;

      case VIEWS.AVISO_LEGAL:
        return <AvisoLegalPage onGoHome={goHome} />;

      case VIEWS.PRIVACIDAD:
        return <PrivacidadPage onGoHome={goHome} />;

      default:
        return (
          <HomePage
            onStartProcess={handleStartProcess}
          />
        );
    }
  };

  const handleDNIProcess = async (frontFile, backFile, selectedFields) => {
    // Manejar el procesamiento con WebAssembly
    console.log('Iniciando procesamiento...', { frontFile, backFile, selectedFields });
  };

  return (
    <NavigationContext.Provider value={navegacion}>
      <div className="min-h-screen bg-gray-100">
        {/* Loader de procesamiento - SOLO SE MUESTRA EN MODO DEMO */}
        {DEMO_MODE.enabled && showProcessingLoader && (
          <ProcessingLoader onComplete={() => setShowProcessingLoader(false)} />
        )}

        {/* Renderizar Header solo en la vista inicial */}
        {currentView === VIEWS.HOME && (
          <Header onShowHome={goHome} onStartProcess={handleStartProcess} />
        )}

        {renderContent()}
      </div>
    </NavigationContext.Provider>
  );
}

export default App;
