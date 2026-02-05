import React, { useState, useEffect } from 'react';
import ProfileSelector from './ProfileSelector';
import { DNI_PROFILES } from '../../shared/constants/dniProfiles';
import { useColors } from '../theme/useColors';
import { useScrollToTop } from '../hooks/useScrollToTop';
import { detectDniFromFile } from './dni_scripts/dni_detector';
import jsPDF from 'jspdf';
import { downloadImageWithWatermark, combineImagesWithWatermark, imageToCanvasWithWatermark } from '../utils/watermark';
import { censorDniComplete } from './dni_scripts/dni_censor'
import WatermarkInput from './WatermarkInput';
import { DEMO_MODE } from '../config/demoMode';
import ManualCensorModal from './ManualCensorModal';
import { validateDniConsistencyFlags } from '../utils/OCRhelpers'
// Importamos la API
import { dniApi } from '../services/dniApi';

export default function DNIEditor({
  frontFile,
  backFile,
  onBack,
  onProcessed,
  initialOcrData = null,
  initialValidation = null,
  manualDetection = false
}) {
  const colors = useColors();
  const [cachedOcrData, setCachedOcrData] = useState(initialOcrData);
  const [cachedValidation, setCachedValidation] = useState(initialValidation);

  const [manualCensorList, setManualCensorList] = useState(null);

  // Scroll inicial al principio de la página
  useScrollToTop();

  // Campos disponibles para configuración front
  const frontfields = [
    'nombre',
    'apellidos',
    'dni',
    'fechaNacimiento',
    'sexo',
    'nacionalidad',
    'fechaExpedicion',
    'fechaCaducidad',
    'numeroSoporte',
    'can',
    'firma',
    'cli'
  ];

  // Campos disponibles para configuración back
  const backfields = [
    'mrz',
    'domicilio',
    'municipio',
    'provincia',
    'lugarNacimiento',
    'equipoExpedidor',
    'progenitores',
    'ventanaSoporte'
  ];

  // Combinar todos los campos
  const availableFields = [...frontfields, ...backfields];
  const totalFields = availableFields.length;

  const [selectedProfile, setSelectedProfile] = useState('viajes');
  const [selectedFrontFields, setSelectedFrontFields] = useState(
    DNI_PROFILES.VIAJES.frontFields
  );

  const [selectedBackFields, setSelectedBackFields] = useState(
    DNI_PROFILES.VIAJES.backFields
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState(null);
  const [processingError, setProcessingError] = useState(null);
  const [validationPopup, setValidationPopup] = useState(null);

  const selectedFrontCount = Object.values(selectedFrontFields).filter(Boolean).length;
  const selectedBackCount = Object.values(selectedBackFields).filter(Boolean).length;
  const selectedCount = selectedFrontCount + selectedBackCount;

  const [watermarkText, setWatermarkText] = useState('Uso exclusivo para Viajes');

  useEffect(() => {
    if (processedResult) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [processedResult]);

  useEffect(() => {
    setCachedOcrData(initialOcrData);
  }, [initialOcrData]);

  useEffect(() => {
    setCachedValidation(initialValidation);
  }, [initialValidation]);

  useEffect(() => {
    if (initialValidation?.ok) {
      setValidationPopup({
        type: 'success',
        message: initialValidation.message
      });
    }
  }, [initialValidation]);

  useEffect(() => {
    if (validationPopup?.type !== 'success') {
      return undefined;
    }

    const timer = setTimeout(() => setValidationPopup(null), 4000);
    return () => clearTimeout(timer);
  }, [validationPopup]);

  // Verificar si la configuración actual coincide con algún perfil
  useEffect(() => {
    // No hacer nada si ya hay un perfil seleccionado explícitamente
    if (selectedProfile) {
      const profile = DNI_PROFILES.getProfileById(selectedProfile);
      if (profile) {
        const profileFront = profile.frontFields || profile.fields || {};
        const profileBack = profile.backFields || {};

        const frontMatch = JSON.stringify(profileFront) === JSON.stringify(selectedFrontFields);
        const backMatch = JSON.stringify(profileBack) === JSON.stringify(selectedBackFields);

        // Si coincide exactamente, mantener el perfil seleccionado
        if (frontMatch && backMatch) {
          return;
        }
      }
    }

    // Solo buscar coincidencias si no hay perfil seleccionado o si los campos no coinciden
    const checkProfileMatch = () => {
      const profiles = ['viajes', 'salud', 'administrativo', 'financiero'];

      for (const profileId of profiles) {
        const profile = DNI_PROFILES.getProfileById(profileId);
        if (profile) {
          const profileFront = profile.frontFields || profile.fields || {};
          const profileBack = profile.backFields || {};

          const frontMatch = JSON.stringify(profileFront) === JSON.stringify(selectedFrontFields);
          const backMatch = JSON.stringify(profileBack) === JSON.stringify(selectedBackFields);

          if (frontMatch && backMatch) {
            setSelectedProfile(profileId);
            return;
          }
        }
      }

      setSelectedProfile(null);
    };

    checkProfileMatch();
  }, [selectedFrontFields, selectedBackFields]);

  useEffect(() => {
    if (selectedProfile) {
      const profile = DNI_PROFILES.getProfileById(selectedProfile);
      if (profile) {
        setWatermarkText(`Uso exclusivo para ${profile.name}`);
      }
    } else {
      setWatermarkText('Uso exclusivo para verificación');
    }
  }, [selectedProfile]);

  const dismissValidationPopup = () => setValidationPopup(null);

  // Actualizar campos cuando se selecciona un perfil
  const handleProfileSelect = (profileId) => {
    const profile = DNI_PROFILES.getProfileById(profileId);
    if (profile) {
      setSelectedProfile(profileId);
      setSelectedFrontFields(profile.frontFields || profile.fields || {});
      setSelectedBackFields(profile.backFields || {});
    }
  };

  const handleFieldToggle = (fieldName) => {
    if (frontfields.includes(fieldName)) {
      setSelectedFrontFields(prev => ({
        ...prev,
        [fieldName]: !prev[fieldName]
      }));
    } else if (backfields.includes(fieldName)) {
      setSelectedBackFields(prev => ({
        ...prev,
        [fieldName]: !prev[fieldName]
      }));
    }
  };

  const handleSelectAll = () => {
    setSelectedFrontFields(frontfields.reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {}));

    setSelectedBackFields(backfields.reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {}));

    setSelectedProfile('complete');
  };

  const handleDeselectAll = () => {
    setSelectedFrontFields(frontfields.reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {}));

    setSelectedBackFields(backfields.reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {}));

    setSelectedProfile(null);
  };

  const handleManualCensorComplete = (result) => {
    console.log('[+] Censura manual completada:', result);
    setManualCensorList(null);

    setProcessedResult(prev => ({
      ...prev,
      frontImageUrl: result.frontImageUrl || prev?.frontImageUrl,
      backImageUrl: result.backImageUrl || prev?.backImageUrl,
      success: true,
      manualCensor: true
    }));
  };

  const handleProcessDNI = async () => {
    try {
      setIsProcessing(true);
      setProcessingError(null);
      setValidationPopup(null);
      setProcessedResult(null);

      let frontFileToProcess = frontFile;
      let backFileToProcess = backFile || null;

      // DEMO MODE
      if (DEMO_MODE.enabled) {
        const frontResponse = await fetch('/demo/front-image.jpg');
        const frontBlob = await frontResponse.blob();
        frontFileToProcess = new File([frontBlob], 'front-demo.jpg', { type: 'image/jpeg' });

        if (backFile) {
          const backResponse = await fetch('/demo/back-image.jpg');
          const backBlob = await backResponse.blob();
          backFileToProcess = new File([backBlob], 'back-demo.jpg', { type: 'image/jpeg' });
        }
      }

      const manualFiles = {};
      const result = {
        success: true,
        manualCensor: false
      };

      const frontDetections = await detectDniFromFile(frontFileToProcess);
      const frontDocument = frontDetections.find(d => d.label === 'DOC_DNI');
      if (!frontDocument) {
        console.log('[-] Anverso no detectado → Censura manual');
        manualFiles.front = frontFileToProcess;
      } else if (frontDetections.length < 20) {
        console.log('[-] No se detectaron todos los campos → Censura manual');
        manualFiles.front = frontFileToProcess;
      } else {
        const frontResult = await censorDniComplete(
          frontFileToProcess,
          backFileToProcess,
          { frontFields: selectedFrontFields, backFields: {} },
          { frontDetections, backDetections: [] }
        );
        result.frontImageUrl = frontResult.frontImageUrl; //imagen censurada
        result.frontOcrData = frontResult.ocrData.front; //datos ocr
      }

      let backDetections = [];
      if (backFileToProcess) {
        backDetections = await detectDniFromFile(backFileToProcess);
        const backDocument = backDetections.find(d => d.label === 'DOC_DNI_REV');

        if (!backDocument) {
          console.log('[-] Reverso no detectado → Censura manual');
          manualFiles.back = backFileToProcess;
        } else if (backDetections.length < 7) {
          console.log('[-] No se detectaron todos los campos → Censura manual');
          manualFiles.front = frontFileToProcess;
        } else {
          const backResult = await censorDniComplete(
            frontFileToProcess,
            backFileToProcess,
            { frontFields: {}, backFields: selectedBackFields },
            { frontDetections: [], backDetections }
          );
          result.backImageUrl = backResult.backImageUrl; //imagen censurada
          result.backOcrData = backResult.ocrData.back;  //datos ocr
        }
      }

      //validación de datos - en caso de censura automática
      const ocrDataForValidation = {
        front: result.frontOcrData || {},
        back: result.backOcrData || {}
      };

      console.log('OCR data:', ocrDataForValidation)

      const validationFlags = validateDniConsistencyFlags(ocrDataForValidation);
      result.validation = validationFlags;
      const flagsArray = Object.values(validationFlags); // [true, false, true, true]
      const total = flagsArray.length;
      const correctCount = flagsArray.filter(flag => flag === true).length;
      const accuracyPercentage = (correctCount / total) * 100;

      console.log('Flags de validación DNI:', validationFlags);
      console.log('Porcentaje de acierto:', accuracyPercentage.toFixed(2) + '%');

      //Validacion de elementos de seguridad
      const HOLOGRAM_CLASSES = ['ESP', 'ESP_HOLO', 'ES', 'OPT_VAR'];
      const hologramDetected = frontDetections.some(d => HOLOGRAM_CLASSES.includes(d.label));

      // --- GUARDAR EN BACKEND ---
      try {
        console.log("💾 Guardando en backend...");
        await dniApi.saveDniRecord({
          dniNumber: ocrDataForValidation.front?.NUM_DNI || `UNKNOWN-${Date.now()}`,
          // frontImageUrl: result.frontImageUrl,  <-- REMOVED per user request
          // backImageUrl: result.backImageUrl,    <-- REMOVED per user request
          profileUsed: selectedProfile || 'personalizado',
          hiddenFields: {
            frontFields: selectedFrontFields,
            backFields: selectedBackFields
          },
          ocrFrontData: ocrDataForValidation.front,
          ocrBackData: ocrDataForValidation.back,
          validation: validationFlags,
          manualCensor: Object.keys(manualFiles).length > 0,
          manualDetection: manualDetection,
          hologramReadable: hologramDetected,
          homogenityPassed: accuracyPercentage,
          watermarkText: watermarkText
        });
        console.log("✅ Guardado exitoso");
      } catch (saveError) {
        console.error("❌ Error al guardar en backend:", saveError);
        // Opcional: mostrar aviso visual de que falló el guardado, aunque el proceso local fue bien
        // No bloqueamos el flujo si falla el guardado, pero lo logueamos
      }
      // --------------------------

      if (Object.keys(manualFiles).length > 0) {
        setManualCensorList(manualFiles);
        setProcessedResult(result);
        return;
      }

      setProcessedResult(result);

    } catch (error) {
      console.error('Error procesando DNI:', error);
      setProcessingError(error.message || 'Error inesperado');
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para combinar ambas imágenes en JPG con marca de agua
  const handleDownloadCombined = async () => {
    if (!processedResult) return;

    try {
      const imageUrls = [processedResult.frontImageUrl];
      if (processedResult.backImageUrl) {
        imageUrls.push(processedResult.backImageUrl);
      }

      const canvas = await combineImagesWithWatermark(imageUrls, 20, {
        text: watermarkText
      });

      // Descargar
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dni-completo-procesado.jpg';
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.95);

    } catch (error) {
      console.error('Error al combinar imágenes:', error);
    }
  };

  // Función para combinar ambas imágenes en PDF con marca de agua
  const handleDownloadCombinedPDF = async () => {
    if (!processedResult) return;

    try {
      // Crear imágenes con marca de agua
      const frontImageWithWatermark = await imageToCanvasWithWatermark(
        processedResult.frontImageUrl,
        {
          text: watermarkText
        }
      );

      // Crear PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - (margin * 2);

      // Cargar imagen frontal para obtener dimensiones
      const frontImg = new Image();
      frontImg.src = processedResult.frontImageUrl;
      await new Promise((resolve) => {
        frontImg.onload = resolve;
      });

      // Calcular dimensiones proporcionales para la imagen frontal
      const frontRatio = frontImg.height / frontImg.width;
      let frontWidth = maxWidth;
      let frontHeight = frontWidth * frontRatio;

      // Añadir imagen frontal con marca de agua
      pdf.addImage(
        frontImageWithWatermark,
        'JPEG',
        margin,
        margin,
        frontWidth,
        frontHeight,
        undefined,
        'FAST'
      );

      // Si hay imagen trasera, procesarla también
      if (processedResult.backImageUrl) {
        const backImageWithWatermark = await imageToCanvasWithWatermark(
          processedResult.backImageUrl,
          {
            text: watermarkText
          }
        );

        const backImg = new Image();
        backImg.src = processedResult.backImageUrl;
        await new Promise((resolve) => {
          backImg.onload = resolve;
        });

        const backRatio = backImg.height / backImg.width;
        let backWidth = maxWidth;
        let backHeight = backWidth * backRatio;

        const yPosition = margin + frontHeight + 10;

        // Si no cabe en la misma página, añadir nueva página
        if (yPosition + backHeight > pageHeight - margin) {
          pdf.addPage();
          pdf.addImage(
            backImageWithWatermark,
            'JPEG',
            margin,
            margin,
            backWidth,
            backHeight,
            undefined,
            'FAST'
          );
        } else {
          // Añadir en la misma página
          pdf.addImage(
            backImageWithWatermark,
            'JPEG',
            margin,
            yPosition,
            backWidth,
            backHeight,
            undefined,
            'FAST'
          );
        }
      }

      // Descargar el PDF
      pdf.save('dni-completo-procesado.pdf');

    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  };

  const formatFieldName = (fieldName) => {
    const fieldNames = {
      nombre: 'Nombre',
      apellidos: 'Apellidos',
      dni: 'DNI',
      fechaNacimiento: 'Fecha de Nacimiento',
      sexo: 'Sexo',
      nacionalidad: 'Nacionalidad',
      fechaExpedicion: 'Fecha de Expedición',
      fechaCaducidad: 'Fecha de Caducidad',
      numeroSoporte: 'Número de Soporte',
      can: 'CAN',
      firma: 'Firma',
      mrz: 'MRZ',
      domicilio: 'Domicilio',
      municipio: 'Municipio',
      provincia: 'Provincia',
      equipoExpedidor: 'Equipo Expedidor'
    };

    return fieldNames[fieldName] || fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  // Obtener el estado del campo (front o back)
  const isFieldSelected = (fieldName) => {
    if (frontfields.includes(fieldName)) {
      return selectedFrontFields[fieldName] || false;
    } else if (backfields.includes(fieldName)) {
      return selectedBackFields[fieldName] || false;
    }
    return false;
  };

  return (
    <>
      {/* Overlay de carga global */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div
                className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 mx-auto"
                style={{ borderTopColor: colors.primary }}
              ></div>
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>
              Procesando DNI
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Estamos analizando y censurando los campos seleccionados...
            </p>
            <div className="flex items-center justify-center gap-1">
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: colors.primary, animationDelay: '0ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: colors.primary, animationDelay: '150ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: colors.primary, animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {validationPopup && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-xs sm:max-w-sm rounded-lg shadow-lg px-4 py-3 text-sm sm:text-base flex items-start gap-3 ${validationPopup.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
            }`}
        >
          <div className="flex-1">
            <span className="block text-sm font-semibold mb-1">
              {validationPopup.type === 'success'
                ? 'Validación correcta'
                : 'Validación fallida'}
            </span>
            <span className="block text-xs sm:text-sm leading-snug">
              {validationPopup.message}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissValidationPopup}
            className="ml-2 text-white/80 hover:text-white focus:outline-none"
            aria-label="Cerrar notificación"
          >
            <i className="bi bi-x-circle-fill"></i>
          </button>
        </div>
      )}
      <div className="min-h-screen bg-gray-100 py-4 sm:py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
              Configurar DNI
            </h1>
            <p className="text-sm sm:text-lg text-gray-600 max-w-4xl mx-auto leading-tight">
              Elige un perfil predefinido o personaliza qué campos mostrar
            </p>
          </div>

          <div className="max-w-none mx-auto space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">

            {/* Vista previa */}
            <div className="order-2 lg:order-1 bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col h-fit">
              <div className="flex items-center mb-4 flex-shrink-0">
                <i className="bi bi-eye text-gray-600 text-lg sm:text-xl mr-2"></i>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Vista previa</h3>
              </div>

              {/* MOSTRAR resultado procesado si existe */}
              {processedResult ? (
                <div className="space-y-4">
                  <div className="bg-primary-50 border border-secondary-200 rounded-lg p-3">
                    <div className="flex items-center text-secondary-800 text-sm">
                      <i className="bi bi-check-circle-fill mr-2"></i>
                      DNI procesado correctamente
                    </div>
                  </div>

                  {/* Mostrar imágenes procesadas */}
                  <div className="mb-4">
                    <div className="bg-primary-100 text-primary-800 text-xs sm:text-sm font-medium px-2 py-1 rounded mb-2 inline-block">
                      ANVERSO - PROCESADO
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                      <img
                        src={processedResult.frontImageUrl}
                        alt="DNI anverso procesado"
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  </div>

                  {processedResult.backImageUrl && (
                    <div className="mb-4">
                      <div className="bg-secondary-100 text-secondary-800 text-xs sm:text-sm font-medium px-2 py-1 rounded mb-2 inline-block">
                        REVERSO - PROCESADO
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                        <img
                          src={processedResult.backImageUrl}
                          alt="DNI reverso procesado"
                          className="w-full h-auto rounded-lg shadow-md"
                        />
                      </div>
                    </div>
                  )}

                  {/* Botones de descarga */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadImageWithWatermark(
                          processedResult.frontImageUrl,
                          'dni-front-processed.jpg',
                          {
                            text: watermarkText
                          }
                        )}
                        style={{ backgroundColor: colors.button.primary }}
                        className="flex-1 text-white py-2 px-4 rounded-lg text-center hover:opacity-90 transition-opacity text-sm font-medium"
                      >
                        <i className="bi bi-download mr-1"></i>
                        Descargar Anverso
                      </button>
                      {processedResult.backImageUrl && (
                        <button
                          onClick={() => downloadImageWithWatermark(
                            processedResult.backImageUrl,
                            'dni-back-processed.jpg',
                            {
                              text: watermarkText
                            }
                          )}
                          style={{ backgroundColor: colors.button.secondary }}
                          className="flex-1 text-white py-2 px-4 rounded-lg text-center hover:opacity-90 transition-opacity text-sm font-medium"
                        >
                          <i className="bi bi-download mr-1"></i>
                          Descargar Reverso
                        </button>
                      )}
                    </div>

                    {/* Botones para descargar combinado (JPG y PDF) */}
                    {processedResult.backImageUrl && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadCombined}
                          className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg text-center hover:bg-primary-500 transition-colors text-sm font-medium"
                        >
                          <i className="bi bi-file-earmark-image mr-1"></i>
                          Completo JPG
                        </button>
                        <button
                          onClick={handleDownloadCombinedPDF}
                          className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg text-center hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <i className="bi bi-file-earmark-pdf mr-1"></i>
                          Completo PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Mostrar imágenes originales */}
                  <div className="mb-4 flex-shrink-0">
                    <div className="bg-primary-100 text-primary-800 text-xs sm:text-sm font-medium px-2 py-1 rounded mb-2 inline-block">
                      ANVERSO
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                      <img
                        src={DEMO_MODE.enabled ? '/demo/front-image.jpg' : URL.createObjectURL(frontFile)}
                        alt="DNI anverso"
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  </div>

                  {backFile && (
                    <div className="mb-4 flex-shrink-0">
                      <div className="bg-secondary-100 text-secondary-800 text-xs sm:text-sm font-medium px-2 py-1 rounded mb-2 inline-block">
                        REVERSO
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-4">
                        <img
                          src={DEMO_MODE.enabled ? '/demo/back-image.jpg' : URL.createObjectURL(backFile)}
                          alt="DNI reverso"
                          className="w-full h-auto rounded-lg shadow-md"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Mostrar error si existe */}
              {processingError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center text-red-800 text-sm">
                    <i className="bi bi-exclamation-triangle-fill mr-2"></i>
                    Error: {processingError}
                  </div>
                </div>
              )}

              {/* Información del perfil seleccionado */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 sm:p-4 mt-4">
                <h4 className="font-semibold text-primary-800 mb-2 text-sm sm:text-base">Configuración actual</h4>
                <div className="space-y-1 text-xs sm:text-sm text-primary-700">
                  <div>
                    <strong>Perfil:</strong> {
                      selectedProfile
                        ? DNI_PROFILES.getProfileById(selectedProfile)?.name
                        : 'Personalizado'
                    }
                  </div>
                  <div><strong>Campos seleccionados:</strong> {selectedCount} de {totalFields}</div>
                  <div>
                    <strong>Estado:</strong>
                    <span className={processedResult ? "text-secondary-600" : "text-primary-600"}>
                      {processedResult ? ' Procesado' : ' Listo para procesar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración */}
            <div className="order-1 lg:order-2 bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col">
              <div className="flex items-center mb-4 flex-shrink-0">
                <i className="bi bi-sliders text-gray-600 text-lg sm:text-xl mr-2"></i>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Configuración</h3>
              </div>

              {/* Selector de perfiles */}
              <div className="flex-shrink-0">
                <ProfileSelector
                  selectedProfile={selectedProfile}
                  onProfileSelect={handleProfileSelect}
                  selectedFrontFields={selectedFrontFields}
                  selectedBackFields={selectedBackFields}
                />
              </div>

              {/* Indicador de campos extraídos */}
              <div className="bg-primary-50 border border-secondary-200 rounded-lg p-3 mb-4 flex-shrink-0">
                <div className="flex items-center text-secondary-800 text-xs sm:text-sm">
                  <i className="bi bi-check-circle-fill mr-2"></i>
                  {totalFields} campos disponibles para configuración
                </div>
              </div>

              {/* Lista de campos con checkboxes */}
              <div className="mb-4 flex-1 flex flex-col">
                <div className="mb-3 flex-shrink-0">
                  <h4 className="font-medium text-gray-700 mb-1 text-sm sm:text-base">Campos individuales</h4>
                  <p className="text-xs text-gray-500 flex items-center">
                    <i className="bi bi-info-circle mr-1.5"></i>
                    Marque los campos que desea <strong className="mx-1 text-red-600">censurar (ocultar)</strong> del documento
                  </p>
                </div>

                {/* Campos Front */}
                <div className="mb-4">
                  <h5 className="text-xs font-semibold text-gray-600 mb-2">ANVERSO (DELANTE)</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {frontfields.map((fieldName) => (
                      <div key={fieldName} className="border border-gray-200 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors h-fit">
                        <label className="flex items-center cursor-pointer">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isFieldSelected(fieldName)}
                              onChange={() => handleFieldToggle(fieldName)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${isFieldSelected(fieldName) ? 'shadow-md' : ''
                              }`}
                              style={{
                                backgroundColor: isFieldSelected(fieldName) ? '#EF4444' : 'white',
                                borderColor: isFieldSelected(fieldName) ? '#EF4444' : colors.border.default
                              }}
                              onMouseEnter={(e) => {
                                if (!isFieldSelected(fieldName)) {
                                  e.target.style.borderColor = '#EF4444';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isFieldSelected(fieldName)) {
                                  e.target.style.borderColor = colors.border.default;
                                }
                              }}
                            >
                              {isFieldSelected(fieldName) && (
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="ml-3 sm:ml-4 flex-1">
                            <div className="font-medium text-gray-800 text-xs sm:text-sm">
                              {formatFieldName(fieldName)}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campos Back */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-600 mb-2">REVERSO (DETRÁS)</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {backfields.map((fieldName) => (
                      <div key={fieldName} className="border border-gray-200 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors h-fit">
                        <label className="flex items-center cursor-pointer">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isFieldSelected(fieldName)}
                              onChange={() => handleFieldToggle(fieldName)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${isFieldSelected(fieldName) ? 'shadow-md' : ''
                              }`}
                              style={{
                                backgroundColor: isFieldSelected(fieldName) ? '#EF4444' : 'white',
                                borderColor: isFieldSelected(fieldName) ? '#EF4444' : colors.border.default
                              }}
                              onMouseEnter={(e) => {
                                if (!isFieldSelected(fieldName)) {
                                  e.target.style.borderColor = '#EF4444';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isFieldSelected(fieldName)) {
                                  e.target.style.borderColor = colors.border.default;
                                }
                              }}
                            >
                              {isFieldSelected(fieldName) && (
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="ml-3 sm:ml-4 flex-1">
                            <div className="font-medium text-gray-800 text-xs sm:text-sm">
                              {formatFieldName(fieldName)}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="mb-4 sm:mb-6 flex-shrink-0">
                <h4 className="font-medium text-gray-700 mb-3 text-sm sm:text-base">Acciones rápidas</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 sm:px-3 sm:py-2 bg-red-100 text-red-700 text-xs sm:text-sm rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1.5"
                  >
                    <i className="bi bi-x-circle-fill"></i>
                    Censurar todo
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2 py-1 sm:px-3 sm:py-2 bg-primary-100 text-primary-700 text-xs sm:text-sm rounded-lg hover:bg-primary-200 transition-colors flex items-center gap-1.5"
                  >
                    <i className="bi bi-check-circle-fill"></i>
                    Mostrar todo
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex-shrink-0">

                <WatermarkInput
                  value={watermarkText}
                  onChange={setWatermarkText}
                  maxLength={50}
                />

                {!processedResult ? (
                  <button
                    onClick={handleProcessDNI}
                    disabled={isProcessing}
                    style={{
                      backgroundColor: isProcessing ? colors.BUTTON_DISABLED : colors.button.primary,
                      cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                    className="w-full text-white py-4 px-8 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-gear-fill text-xl mr-3"></i>
                        Procesar DNI
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setProcessedResult(null);
                      setProcessingError(null);
                      await handleProcessDNI();
                    }}
                    disabled={isProcessing}
                    style={{
                      backgroundColor: isProcessing ? colors.BUTTON_DISABLED : colors.button.primary,
                      cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                    className="w-full text-white py-4 px-8 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-repeat text-xl mr-3"></i>
                        Procesar de nuevo
                      </>
                    )}
                  </button>
                )}

                <div className="text-center text-xs sm:text-sm text-gray-600 my-3">
                  {selectedProfile
                    ? `Configuración: ${DNI_PROFILES.getProfileById(selectedProfile)?.name}`
                    : 'Configuración personalizada'
                  }
                </div>

                {/* Botón de regreso */}
                <button
                  onClick={onBack}
                  className="w-full inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 bg-gray-500 text-white font-semibold text-sm sm:text-base rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  <i className="bi bi-arrow-left mr-1 sm:mr-2 text-sm sm:text-base"></i>
                  Cambiar fotos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {manualCensorList && (
        <ManualCensorModal
          frontFile={manualCensorList?.front}
          backFile={manualCensorList?.back}
          onComplete={handleManualCensorComplete}
          onCancel={() => setManualCensorList(null)}
        />
      )}
    </>
  );
}