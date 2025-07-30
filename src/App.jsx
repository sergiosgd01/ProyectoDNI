// src/App.jsx
import React, { useState } from 'react';
import Header from './components/Header';
import FileUploadZone from './components/FileUploadZone';
import DataCheckboxes from './components/DataCheckboxes';
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
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    // Si cancela y no hay imagen recortada, volver a la selección de archivo
    if (!croppedImageUrl) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleRecropImage = () => {
    setShowCropper(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      {/* Sección principal - Aplicación */}
      <section className="py-16 flex flex-col items-center justify-center p-4">

        <div className={`w-full bg-white rounded-lg shadow-xl p-8 transition-all duration-500 ease-in-out ${
          selectedFile ? 'max-w-6xl' : 'max-w-2xl'
        }`}>
          <div className={`flex flex-col gap-8 transition-all duration-500 ease-in-out ${
            selectedFile ? 'md:flex-row' : ''
          }`}>
            {/* Zona de carga y Previsualización */}
            <div className={`flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${
              selectedFile ? 'flex-1' : 'w-full'
            }`}>
              {!selectedFile ? (
                <FileUploadZone onFileSelect={handleFileSelect} />
              ) : (
                <div className="w-full h-80 flex items-center justify-center border border-gray-300 rounded-lg overflow-hidden relative">
                  <img 
                    src={croppedImageUrl || previewUrl} 
                    alt="Previsualización del DNI" 
                    className="max-w-full max-h-full object-contain" 
                  />
                  
                  {/* Botones de acción sobre la imagen */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {croppedImageUrl && (
                      <button
                        onClick={handleRecropImage}
                        className="bg-blue-600 bg-opacity-80 hover:bg-opacity-100 text-white px-3 py-1 rounded-lg text-sm transition-all duration-200"
                        title="Recortar de nuevo"
                      >
                        ✂️ Recortar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setCroppedImageUrl(null);
                      }}
                      className="bg-gray-800 bg-opacity-70 hover:bg-opacity-90 shadow-lg rounded-full p-2 transition-all duration-200 hover:scale-110"
                      title="Eliminar imagen"
                    >
                      <img src="/cancel-icon.svg" alt="Cerrar" className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {!croppedImageUrl && (
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
                      <button
                        onClick={handleRecropImage}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        ✂️ Recortar DNI
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lado derecho: Checkboxes (solo aparece cuando hay imagen) */}
            {selectedFile && (
              <div className="flex-1 flex flex-col justify-start border-l-0 md:border-l border-gray-200 pl-0 md:pl-8 transform transition-all duration-500 ease-in-out">
                <DataCheckboxes />
                <button className="mt-6 w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors">
                  Descargar DNI Editado
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

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
        />
      )}
    </div>
  );
}

export default App;