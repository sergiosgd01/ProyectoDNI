import React, { useState, useEffect } from 'react';
import { DEMO_MODE } from '../config/demoMode';

export default function ProcessingLoader({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = DEMO_MODE.processingSteps;
    const totalDuration = DEMO_MODE.timings.processingSteps;
    const stepDuration = totalDuration / steps.length;

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= steps.length) {
          clearInterval(stepInterval);
          setTimeout(() => {
            onComplete?.();
          }, 300);
          return prev;
        }
        return next;
      });
    }, stepDuration);

    return () => {
      clearInterval(stepInterval);
    };
  }, [onComplete]);

  useEffect(() => {
    const targetProgress = DEMO_MODE.processingSteps[currentStep]?.progress || 0;
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) {
          clearInterval(progressInterval);
          return targetProgress;
        }
        return Math.min(prev + 3, targetProgress);
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentStep]);

  const currentStepData = DEMO_MODE.processingSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
        {/* Icono animado */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Círculo exterior */}
            <div className="w-24 h-24 border-4 border-blue-200 rounded-full"></div>
            {/* Círculo giratorio */}
            <div className="absolute top-0 left-0 w-24 h-24 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            {/* Icono central */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <i className="bi bi-image text-4xl text-blue-600 animate-pulse"></i>
            </div>
          </div>
        </div>

        {/* Título */}
        <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Preparando tu DNI
        </h3>
        <p className="text-center text-gray-600 mb-6">
          Optimizando las imágenes para mejor calidad
        </p>

        {/* Paso actual */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mb-4 shadow-inner">
          <div className="flex items-center text-blue-700">
            <div className="mr-3">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="font-medium text-sm">{currentStepData?.label}</span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Progreso general</span>
            <span className="font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-full rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Efecto de brillo animado */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Pasos completados */}
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {DEMO_MODE.processingSteps.slice(0, currentStep).map((step) => (
            <div 
              key={step.id} 
              className="flex items-center text-sm text-green-600 animate-fadeInUp"
            >
              <i className="bi bi-check-circle-fill mr-2 text-base"></i>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}