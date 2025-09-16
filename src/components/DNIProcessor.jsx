import React, { useState } from 'react';

export default function DNIProcessor({ selectedFile, onBack, onContinue }) {
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('waiting'); // 'waiting', 'processing', 'completed'

  const handleExtractData = async () => {
    setIsProcessing(true);
    setProcessingStep('processing');

    try {
      // Simular procesamiento por ahora
      // AQUÍ es donde integrarás tu WebAssembly con OCR
      setTimeout(() => {
        // Datos de ejemplo - esto lo reemplazarás con tu OCR real
        const mockData = {
          nombre: 'JUAN CARLOS',
          apellidos: 'GARCÍA LÓPEZ',
          dni: '12345678A',
          fechaNacimiento: '01/01/1990',
          sexo: 'M',
          nacionalidad: 'ESP',
          fechaExpedicion: '01/01/2020',
          fechaCaducidad: '01/01/2030',
          equipoExpedidor: 'MADRID',
          numeroSoporte: 'MAD123456789'
        };

        setExtractedData(mockData);
        setProcessingStep('completed');
        setIsProcessing(false);
      }, 3000);

    } catch (error) {
      console.error('Error procesando DNI:', error);
      setIsProcessing(false);
      setProcessingStep('waiting');
    }
  };

  const handleContinueToEdit = () => {
    // Pasar los datos extraídos al siguiente paso
    onContinue(extractedData);
  };

  if (processingStep === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🔍 Extraer Datos del DNI
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Vamos a extraer automáticamente los datos de tu DNI usando tecnología OCR
            </p>
          </div>

          {/* Preview de la imagen */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              DNI seleccionado
            </h2>
            
            <div className="relative bg-gray-50 rounded-lg p-4 mb-6">
              <img
                src={selectedFile instanceof File ? URL.createObjectURL(selectedFile) : selectedFile}
                alt="DNI para procesar"
                className="max-w-full h-auto mx-auto rounded-lg shadow-md"
                style={{ maxHeight: '400px' }}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="text-blue-500 text-xl mr-3">ℹ️</div>
                <div>
                  <h3 className="font-semibold text-blue-800 mb-2">¿Qué vamos a hacer?</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Analizaremos automáticamente tu DNI</li>
                    <li>• Extraeremos todos los datos visibles</li>
                    <li>• Te mostraremos los resultados para verificar</li>
                    <li>• Podrás corregir cualquier error antes de continuar</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onBack}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow-lg"
              >
                <i className="bi bi-arrow-left mr-2"></i>
                Cambiar imagen
              </button>
              
              <button
                onClick={handleExtractData}
                className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg"
              >
                <i className="bi bi-eye mr-2"></i>
                Extraer datos del DNI
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (processingStep === 'processing') {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Procesando DNI...
                </h2>
                <p className="text-gray-600">
                  Analizando la imagen y extrayendo los datos
                </p>
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                  Imagen cargada correctamente
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                  Preprocesando imagen
                </div>
                <div className="flex items-center text-sm text-blue-600">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                  Ejecutando OCR...
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <div className="w-4 h-4 bg-gray-300 rounded-full mr-3"></div>
                  Validando datos extraídos
                </div>
              </div>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <i className="bi bi-clock mr-2"></i>
                  Este proceso puede tardar unos segundos...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (processingStep === 'completed') {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              ✅ Datos Extraídos
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Aquí están los datos que hemos extraído automáticamente de tu DNI
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Imagen original */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">DNI Original</h3>
                <img
                  src={selectedFile instanceof File ? URL.createObjectURL(selectedFile) : selectedFile}
                  alt="DNI original"
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>

              {/* Datos extraídos */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Datos Extraídos</h3>
                
                <div className="space-y-4">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <div key={key} className="border-b border-gray-100 pb-3">
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </label>
                      <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 font-medium">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Alertas y información */}
            <div className="mt-8 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-green-500 text-xl mr-3">✅</div>
                  <div>
                    <h4 className="font-semibold text-green-800">Datos extraídos correctamente</h4>
                    <p className="text-green-700 text-sm">
                      Se han detectado todos los campos principales del DNI. 
                      Puedes proceder al editor para personalizar tu documento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-blue-500 text-xl mr-3">💡</div>
                  <div>
                    <h4 className="font-semibold text-blue-800">Siguiente paso</h4>
                    <p className="text-blue-700 text-sm">
                      Los datos mostrados son de solo lectura. En el editor podrás 
                      personalizar y descargar tu DNI con estos datos extraídos.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                onClick={onBack}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow-lg"
              >
                <i className="bi bi-arrow-left mr-2"></i>
                Cambiar imagen
              </button>
              
              <button
                onClick={handleExtractData}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg"
              >
                <i className="bi bi-arrow-clockwise mr-2"></i>
                Extraer de nuevo
              </button>
              
              <button
                onClick={handleContinueToEdit}
                className="inline-flex items-center justify-center px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-lg"
              >
                <i className="bi bi-check-circle mr-2"></i>
                Continuar al editor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
