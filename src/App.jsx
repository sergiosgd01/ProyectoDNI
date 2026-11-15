import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DNIEditor from './components/DNIEditor';
import HomePage from './components/pages/HomePage';
import UploadPage from './components/pages/UploadPage';
import JornadasPage from './components/pages/JornadasPage';
import AvisoLegalPage from './components/pages/AvisoLegalPage';
import PrivacidadPage from './components/pages/PrivacidadPage';
import ProcessingLoader from './components/ProcessingLoader';
import { useDNIFiles } from './hooks/useDNIFiles';
import { useNavigation } from './hooks/useNavigation';
import { useAutoNavigation } from './hooks/useAutoNavigation';
import { VIEWS } from './constants/views';
import { DEMO_MODE } from './config/demoMode';
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
            manualDetection={isManualDetection}
            onBack={handleBackToStep}
            onProcess={handleDNIProcess}
            initialOcrData={preOcrData}
            initialValidation={validationResult}
            onGoHome={goHome}
          />
        );

      case VIEWS.JORNADAS_CACERES:
        return <JornadasPage imageSrc="/jornadasCaceres.png" />;

      case VIEWS.JORNADAS_MERIDA:
        return <JornadasPage imageSrc="/jornadasMerida.png" />;

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
  );
}

export default App;
