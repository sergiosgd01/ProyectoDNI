// src/App.jsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Statistics from './components/Statistics';
import DNIEditor from './components/DNIEditor';
import HomePage from './components/pages/HomePage';
import UploadPage from './components/pages/UploadPage';
import FrontStepPage from './components/pages/FrontStepPage';
import BackStepPage from './components/pages/BackStepPage';
import { useResponsive } from './hooks/useResponsive';
import { useDNIFiles } from './hooks/useDNIFiles';
import { useNavigation } from './hooks/useNavigation';
import { useAutoNavigation } from './hooks/useAutoNavigation';
import { VIEWS } from './constants/views';
import './index.css'; 

function App() {
  const { isMobile } = useResponsive();
  const { currentView, goTo, goHome, goToStatistics } = useNavigation();
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

  // Auto-navegación cuando ambos archivos están listos
  useAutoNavigation(frontFile, backFile, currentView, goTo, isMobile);

  const handleStartProcess = () => {
    goTo(isMobile ? VIEWS.FRONT : VIEWS.UPLOAD);
  };

  const handleBackToHome = () => {
    clearAllFiles();
    goHome();
  };

  const handleBackToStep = () => {
    goTo(isMobile ? VIEWS.BACK : VIEWS.UPLOAD);
  };

  const renderContent = () => {
    switch (currentView) {
      case VIEWS.HOME:
        return (
          <HomePage 
            onStartProcess={handleStartProcess}
          />
        );

      case VIEWS.UPLOAD:
        return (
          <UploadPage
            frontFile={frontFile}
            backFile={backFile}
            onFrontFileSelect={handleFrontFileSelect}
            onBackFileSelect={handleBackFileSelect}
            onClearFrontFile={clearFrontFile}
            onClearBackFile={clearBackFile}
            hasAllFiles={hasAllFiles}
          />
        );

      case VIEWS.FRONT:
        return (
          <FrontStepPage
            frontFile={frontFile}
            onFrontFileSelect={handleFrontFileSelect}
            onClearFrontFile={clearFrontFile}
          />
        );

      case VIEWS.BACK:
        return (
          <BackStepPage
            backFile={backFile}
            onBackFileSelect={handleBackFileSelect}
            onClearBackFile={clearBackFile}
            onBackToFront={() => goTo(VIEWS.FRONT)}
            frontFileLoaded={!!frontFile}
          />
        );
      
      case VIEWS.EDITOR:
        return (
          <DNIEditor
            frontFile={frontFile}
            backFile={backFile}
            onBack={handleBackToHome}
            onBackToStep={handleBackToStep}
          />
        );
      
      case VIEWS.STATISTICS:
        return <Statistics onBackHome={goHome} />;
      
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
        onShowStatistics={goToStatistics}
        onShowHome={goHome}
        currentView={currentView}
      />
      
      {renderContent()}
    </div>
  );
}

export default App;