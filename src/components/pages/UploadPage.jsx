import React, { useRef, useEffect, useCallback } from 'react';
import ProjectInfo from '../ProjectInfo';
import MainSection from '../MainSection';
import SecuritySection from '../SecuritySection';
import FAQ from '../FAQ';
import Footer from '../Footer';
import { useScrollToTop } from '../../hooks/useScrollToTop';

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
  isProcessMode = false
}) {
  const backSectionRef = useRef(null);
  const completionMessageRef = useRef(null);
  
  const previousFrontFile = useRef(frontFile);
  const previousBackFile = useRef(backFile);
  const initialLoadCompleted = useRef(false);

  // Scroll inicial al principio de la página
  useScrollToTop();

  const isMobileView = () => {
    return window.innerWidth < 768; 
  };

  // Función para hacer scroll suave a la sección trasera
  const scrollToBackSection = useCallback(() => {
    if (backSectionRef.current && isMobileView()) {
      // Pequeño delay para que se vea la confirmación de la foto delantera
      setTimeout(() => {
        backSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
        
        // Agregar efecto visual temporal de destacado
        backSectionRef.current.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-50');
        setTimeout(() => {
          if (backSectionRef.current) {
            backSectionRef.current.classList.remove('ring-2', 'ring-blue-400', 'ring-opacity-50');
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
        completionMessageRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        
        // Agregar efecto visual temporal de destacado
        completionMessageRef.current.classList.add('ring-2', 'ring-green-400', 'ring-opacity-50');
        setTimeout(() => {
          if (completionMessageRef.current) {
            completionMessageRef.current.classList.remove('ring-2', 'ring-green-400', 'ring-opacity-50');
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
      {!isProcessMode && <ProjectInfo />}
      
      {/* Vista combinada: ambos pasos lado a lado */}
      <section className="py-16 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-7xl">
          {/* Header general */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              📄 Subir ambas partes del DNI
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-2">
              Sube las fotos de la parte delantera y trasera de tu DNI
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${frontFile ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Parte delantera</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${backFile ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Parte trasera</span>
              </div>
            </div>
          </div>

          {/* Grid responsive: una columna en móvil, dos columnas en pantallas medianas y grandes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Parte Delantera */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                  Parte Delantera
                </h3>
                <p className="text-sm md:text-base text-gray-600">
                  Sube una foto de la <strong>parte frontal</strong> de tu DNI
                </p>
              </div>
              
              <MainSection
                key="front-section"
                selectedFile={frontFile}
                onFileSelect={onFrontFileSelect}
                onClearImage={onClearFrontFile}
                stepInfo={{
                  current: 1,
                  total: 2,
                  side: 'delantera'
                }}
              />
            </div>

            {/* Parte Trasera */}
            <div ref={backSectionRef} className="bg-white rounded-lg shadow-xl p-6 transition-all duration-500">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <span className="text-xl font-bold text-green-600">2</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                  Parte Trasera
                </h3>
                <p className="text-sm md:text-base text-gray-600">
                  Sube una foto de la <strong>parte posterior</strong> de tu DNI
                </p>
              </div>
              
              <MainSection
                key="back-section"
                selectedFile={backFile}
                onFileSelect={onBackFileSelect}
                onClearImage={onClearBackFile}
                stepInfo={{
                  current: 2,
                  total: 2,
                  side: 'trasera'
                }}
              />
            </div>
          </div>

          {/* Mensaje cuando ambas fotos estén cargadas */}
          {hasAllFiles && (
            <div ref={completionMessageRef} className="text-center mt-8 transition-all duration-500">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-center text-green-700 mb-3">
                  <i className="bi bi-check-circle-fill text-2xl mr-3"></i>
                  <span className="text-lg font-bold">¡Ambas partes cargadas correctamente!</span>
                </div>
                
                {shouldAutoNavigate ? (
                  <>
                    <p className="text-green-600 mb-4">
                      Dirigiéndote automáticamente al editor para seleccionar los campos...
                    </p>
                    
                    {/* Indicador de carga */}
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
                      <span className="text-primary-600 font-medium">Procesando...</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-green-600 mb-4">
                      ¿Quieres continuar con estas fotos o cambiar alguna?
                    </p>
                    
                    {/* Botón manual para continuar */}
                    <button
                      onClick={onContinueToEditor}
                      className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors duration-200"
                    >
                      <i className="bi bi-arrow-right mr-2"></i>
                      Continuar al editor
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

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