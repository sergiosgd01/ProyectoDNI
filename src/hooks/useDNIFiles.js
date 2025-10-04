/**
 * Hook para gestionar archivos de DNI (anverso y reverso)
 * Proporciona estado y funciones para manejar las imágenes del documento
 */

import { useState, useCallback } from 'react';

export function useDNIFiles() {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);

  const handleFrontFileSelect = useCallback((file) => {
    setFrontFile(file);
  }, []);

  const handleBackFileSelect = useCallback((file) => {
    setBackFile(file);
  }, []);

  const clearFrontFile = useCallback(() => setFrontFile(null), []);
  const clearBackFile = useCallback(() => setBackFile(null), []);
  
  const clearAllFiles = useCallback(() => {
    setFrontFile(null);
    setBackFile(null);
  }, []);

  return {
    frontFile,
    backFile,
    handleFrontFileSelect,
    handleBackFileSelect,
    clearFrontFile,
    clearBackFile,
    clearAllFiles,
    hasAllFiles: frontFile && backFile
  };
}