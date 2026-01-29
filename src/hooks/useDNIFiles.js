/**
 * Hook para gestionar archivos de DNI (anverso y reverso)
 * Proporciona estado y funciones para manejar las imágenes del documento
 */

import { useState, useCallback } from 'react';

export function useDNIFiles() {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontMetadata, setFrontMetadata] = useState(null);
  const [backMetadata, setBackMetadata] = useState(null);

  const handleFrontFileSelect = useCallback((file, metadata = null) => {
    setFrontFile(file);
    setFrontMetadata(metadata);
  }, []);

  const handleBackFileSelect = useCallback((file, metadata = null) => {
    setBackFile(file);
    setBackMetadata(metadata);
  }, []);

  const clearFrontFile = useCallback(() => {
    setFrontFile(null);
    setFrontMetadata(null);
  }, []);

  const clearBackFile = useCallback(() => {
    setBackFile(null);
    setBackMetadata(null);
  }, []);

  const clearAllFiles = useCallback(() => {
    setFrontFile(null);
    setBackFile(null);
    setFrontMetadata(null);
    setBackMetadata(null);
  }, []);

  return {
    frontFile,
    backFile,
    frontMetadata,
    backMetadata,
    handleFrontFileSelect,
    handleBackFileSelect,
    clearFrontFile,
    clearBackFile,
    clearAllFiles,
    hasAllFiles: frontFile && backFile
  };
}