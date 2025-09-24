// src/App.jsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DNIEditor from './components/DNIEditor';
import HomePage from './components/pages/HomePage';
import UploadPage from './components/pages/UploadPage';
import { useDNIFiles } from './hooks/useDNIFiles';
import { useNavigation } from './hooks/useNavigation';
import { useAutoNavigation } from './hooks/useAutoNavigation';
import { VIEWS } from './constants/views';
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
    clearAllFiles,
    hasAllFiles 
  } = useDNIFiles();

  // Estado para controlar si debe hacer auto-navegación al editor
  const [shouldAutoNavigate, setShouldAutoNavigate] = useState(true);

  // Auto-navegación cuando ambos archivos están listos
  useAutoNavigation(frontFile, backFile, currentView, goTo, shouldAutoNavigate);

  // Resetear auto-navegación cuando se suben archivos por primera vez
  useEffect(() => {
    if (frontFile && !backFile && shouldAutoNavigate === false) {
      setShouldAutoNavigate(true);
    }
  }, [frontFile, backFile, shouldAutoNavigate]);

  const handleStartProcess = () => {
    // Cuando se inicia el proceso por primera vez, permitir auto-navegación
    setShouldAutoNavigate(true);
    goTo(VIEWS.UPLOAD_PROCESS);
  };

  const handleBackToHome = () => {
    clearAllFiles();
    setShouldAutoNavigate(true);
    goHome();
  };

  const handleBackToStep = () => {
    // Cuando se regresa desde el editor, NO permitir auto-navegación
    setShouldAutoNavigate(false);
    goTo(VIEWS.UPLOAD_PROCESS);
  };

  const handleContinueToEditor = () => {
    // Ir al editor manualmente
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        onShowHome={goHome}
      />
      
      {renderContent()}
    </div>
  );
}

export default App;