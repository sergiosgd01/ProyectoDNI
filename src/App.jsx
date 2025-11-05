import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DNIEditor from './components/DNIEditor';
import HomePage from './components/pages/HomePage';
import UploadPage from './components/pages/UploadPage';
import ProcessingLoader from './components/ProcessingLoader';
import { useDNIFiles } from './hooks/useDNIFiles';
import { useNavigation } from './hooks/useNavigation';
import { useAutoNavigation } from './hooks/useAutoNavigation';
import { VIEWS } from './constants/views';
import { DEMO_MODE } from './config/demoMode';
import './index.css'; 

function App() {
  const { currentView, goTo, goHome } = useNavigation();
  const { 
    frontFile, 
    backFile, 
    handleFrontFileSelect, 
    handleBackFileSelect,
    clearFrontFile,
    clearBackFile,
    hasAllFiles 
  } = useDNIFiles();

  // Estado para controlar si debe hacer auto-navegación al editor
  const [shouldAutoNavigate, setShouldAutoNavigate] = useState(true);
  
  // Estado para controlar el loader de procesamiento (solo en modo demo)
  const [showProcessingLoader, setShowProcessingLoader] = useState(false);

  // Auto-navegación cuando ambos archivos están listos
  // Si DEMO_MODE está activo, pasar el setter del loader
  useAutoNavigation(
    frontFile, 
    backFile, 
    currentView, 
    goTo, 
    shouldAutoNavigate,
    DEMO_MODE.enabled ? setShowProcessingLoader : null  // Solo pasar si demo está activo
  );

  // Resetear auto-navegación cuando se suben archivos por primera vez
  useEffect(() => {
    if (frontFile && !backFile && shouldAutoNavigate === false) {
      setShouldAutoNavigate(true);
    }
  }, [frontFile, backFile, shouldAutoNavigate]);

  const handleStartProcess = () => {
    // Cuando se inicia el proceso por primera vez, permitir auto-navegación
    setShouldAutoNavigate(false);
    goTo(VIEWS.UPLOAD_PROCESS);
  };

  const handleBackToStep = () => {
    // Cuando se regresa desde el editor, NO permitir auto-navegación
    setShouldAutoNavigate(false);
    goTo(VIEWS.UPLOAD_PROCESS);
  };

  const handleContinueToEditor = async () => {
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
          />
        );

      case VIEWS.EDITOR:
        return (
          <DNIEditor
            frontFile={frontFile}
            backFile={backFile}
            onBack={handleBackToStep}
            onProcess={handleDNIProcess}
          />
        );
      
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
      
      <Header 
        onShowHome={goHome}
      />
      
      {renderContent()}
    </div>
  );
}

export default App;