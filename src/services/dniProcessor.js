/**
 * Servicio para comunicarse con el componente de procesamiento de DNI
 * 
 * Este servicio actúa como interfaz entre la UI y el procesador externo.
 * Solo envía: frontFile, backFile, frontFields y backFields
 */

import { censorDniComplete } from '../components/dni_scripts/dni_censor';


export class DNIProcessor {
  
  /**
   * Procesa las imágenes del DNI con los campos seleccionados
   * @param {Object} dniData - Datos del DNI a procesar
   * @param {File} dniData.frontFile - Imagen del anverso (obligatorio)
   * @param {File} dniData.backFile - Imagen del reverso (opcional)
   * @param {Object} dniData.frontFields - Configuración de campos del anverso
   * @param {Object} dniData.backFields - Configuración de campos del reverso
   * @example
   * {
   *   frontFile: File,
   *   backFile: File,
   *   frontFields: { nombre: true, ... },
   *   backFields: { mrz: false, ... }
   * }
   * @returns {Promise<Object>} Resultado del procesamiento
   * @returns {boolean} result.success - Si fue exitoso
   * @returns {string} result.frontImageUrl - URL de la imagen frontal procesada
   * @returns {string} result.backImageUrl - URL de la imagen trasera procesada (si existe)
   * @returns {string} result.timestamp - Marca de tiempo del procesamiento
   */
  async processeDNI(dniData) {
    try {
      console.log('Iniciando procesamiento de DNI...');
      console.log('Datos recibidos:', {
        hasFront: !!dniData.frontFile,
        hasBack: !!dniData.backFile,
        frontFields: dniData.frontFields,
        backFields: dniData.backFields
      });

      // Validar datos de entrada
      this.validateInput(dniData);

      // CONECTAR COMPONENTE EXTERNO
      // Solo necesita usar: dniData.frontFile, dniData.backFile, dniData.frontFields y dniData.backFields
      const result = await this.callExternalProcessor(dniData);
      
      console.log('DNI procesado exitosamente');
      return result;

    } catch (error) {
      console.error('Error procesando DNI:', error);
      throw new Error(`Error en el procesamiento: ${error.message}`);
    }
  }

  /**
   * Este método procesa las imágenes del DNI usando OpenCV
   *
   * @param {Object} dniData - Datos validados del DNI
   * @returns {Promise<Object>} Resultado del procesamiento real
   */
  async callExternalProcessor(dniData) {
    console.log('Procesando DNI con censura...');

    try {
      console.log('Campos frontales a censurar:', dniData.frontFields);
      console.log('Campos traseros a censurar:', dniData.backFields);

      // Procesar ambas caras del DNI con campos separados
      const { frontImageUrl, backImageUrl, ocrData } = await censorDniComplete(
        dniData.frontFile,
        dniData.backFile,
        {
          frontFields: dniData.frontFields,
          backFields: dniData.backFields
        },
        {
          precomputedOcr: dniData.preOcrData || null
        }
      );

      console.log('Procesamiento completado');

      return {
        success: true,
        frontImageUrl,
        backImageUrl,
        ocrData,
        validation: dniData.validationResult || null,
        timestamp: new Date().toISOString(),
        message: 'Procesamiento completado'
      };
    } catch (error) {
      console.error('Error en callExternalProcessor:', error);
      throw error;
    }
  }

  // Actualizar validateInput para verificar los campos separados
  /**
   * Validar los datos de entrada antes de procesar
   * @private
   */
  validateInput(dniData) {
    if (!dniData.frontFile) {
      throw new Error('La imagen frontal del DNI es obligatoria');
    }

    if (!dniData.backFile) {
      throw new Error('La imagen trasera del DNI es obligatoria');
    }

    if (!dniData.frontFields || typeof dniData.frontFields !== 'object') {
      throw new Error('Los campos frontales son obligatorios');
    }

    if (!dniData.backFields || typeof dniData.backFields !== 'object') {
      throw new Error('Los campos traseros son obligatorios');
    }

    if (!(dniData.frontFile instanceof File)) {
      throw new Error('frontFile debe ser un objeto File válido');
    }

    if (!(dniData.backFile instanceof File)) {
      throw new Error('backFile debe ser un objeto File válido');
    }

    console.log('Validación de entrada completada');
  }

  /**
   * Liberar recursos de URLs temporales
   * @param {string} url - URL a liberar
   */
  revokeImageUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      console.log('🗑️ URL temporal liberada');
    }
  }
}

// Exportar instancia única (singleton)
export const dniProcessor = new DNIProcessor();
