// src/App.jsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ProjectInfo from './components/ProjectInfo';
import MainSection from './components/MainSection';
import DataSelectionModal from './components/DataSelectionModal';
import BeforeAfter from './components/BeforeAfter';
import SecuritySection from './components/SecuritySection';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import ImageCropper from './components/ImageCropper';
import './index.css'; 

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    // Crear una URL para previsualizar la imagen
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCroppedImageUrl(null);
    setShowCropper(true); // Mostrar el recortador automáticamente
    console.log('Archivo seleccionado:', file.name);
  };

  const handleCropComplete = (croppedUrl) => {
    setCroppedImageUrl(croppedUrl);
    setShowCropper(false);
    // Automáticamente abrir el modal de selección de datos después del recorte
    setShowDataModal(true);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    // Si cancela y no hay imagen recortada, volver a la selección de archivo
    if (!croppedImageUrl) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCroppedImageUrl(null);
  };

  const handleRecropImage = () => {
    setShowCropper(true);
  };

  const handleRetakePhoto = () => {
    setShowCropper(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCroppedImageUrl(null);
  };

  const handleDataModalApply = (selections) => {
    console.log('Datos seleccionados:', selections);
    // Aquí puedes procesar la selección y generar la descarga
  };

  const handleOpenDataModal = () => {
    setShowDataModal(true);
  };

  // Efecto para bloquear el scroll cuando hay modales abiertos
  useEffect(() => {
    if (showCropper || showDataModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup al desmontar el componente
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCropper, showDataModal]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <ProjectInfo />
      
      {/* Sección principal - Aplicación */}
      <MainSection
        selectedFile={selectedFile}
        previewUrl={previewUrl}
        croppedImageUrl={croppedImageUrl}
        onFileSelect={handleFileSelect}
        onRecropImage={handleRecropImage}
        onClearImage={handleClearImage}
        onOpenDataModal={handleOpenDataModal}
      />

      {/* Sección Antes y Después */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <BeforeAfter 
            originalImage="/dni-blanco-negro.png"
            processedImage="/dni.png"
          />
        </div>
      </section>

      <SecuritySection />
      <FAQ />
      <Footer />
      
      {/* Componente de recorte modal */}
      {showCropper && previewUrl && (
        <ImageCropper
          imageUrl={previewUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          onRetakePhoto={handleRetakePhoto}
        />
      )}
      
      {/* Modal de selección de datos */}
      {showDataModal && croppedImageUrl && (
        <DataSelectionModal
          isOpen={showDataModal}
          onClose={() => setShowDataModal(false)}
          onApply={handleDataModalApply}
          imageUrl={croppedImageUrl}
        />
      )}
    </div>
  );
}

export default App;