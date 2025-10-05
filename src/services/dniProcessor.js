/**
 * Servicio para comunicarse con el componente de procesamiento de DNI
 * 
 * Este servicio actúa como interfaz entre la UI y el procesador externo.
 * Solo envía: frontFile, backFile, y fieldsToRedact
 */

export class DNIProcessor {
  
  /**
   * Procesa las imágenes del DNI con los campos seleccionados
   * @param {Object} dniData - Datos del DNI a procesar
   * @param {File} dniData.frontFile - Imagen del anverso (obligatorio)
   * @param {File} dniData.backFile - Imagen del reverso (opcional)
   * @param {Object} dniData.fieldsToRedact - Campos a tachar/ocultar
   * @example
   * {
   *   frontFile: File,
   *   backFile: File,
   *   fieldsToRedact: {
   *     nombre: true,
   *     apellidos: false,
   *     dni: true,
   *     fechaNacimiento: false,
   *     sexo: false,
   *     nacionalidad: false,
   *     fechaExpedicion: true,
   *     fechaCaducidad: true,
   *     equipoExpedidor: false,
   *     numeroSoporte: false
   *   }
   * }
   * @returns {Promise<Object>} Resultado del procesamiento
   * @returns {boolean} result.success - Si fue exitoso
   * @returns {string} result.frontImageUrl - URL de la imagen frontal procesada
   * @returns {string} result.backImageUrl - URL de la imagen trasera procesada (si existe)
   * @returns {string} result.timestamp - Marca de tiempo del procesamiento
   */
  async processeDNI(dniData) {
    try {
      console.log('🔄 Iniciando procesamiento de DNI...');
      console.log('📄 Datos recibidos:', {
        hasFront: !!dniData.frontFile,
        hasBack: !!dniData.backFile,
        fieldsToRedact: dniData.fieldsToRedact
      });

      // Validar datos de entrada
      this.validateInput(dniData);

      // CONECTAR COMPONENTE EXTERNO
      // Solo necesita usar: dniData.frontFile, dniData.backFile, dniData.fieldsToRedact
      const result = await this.callExternalProcessor(dniData);
      
      console.log('✅ DNI procesado exitosamente');
      return result;

    } catch (error) {
      console.error('❌ Error procesando DNI:', error);
      throw new Error(`Error en el procesamiento: ${error.message}`);
    }
  }

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

    if (!dniData.fieldsToRedact) {
      throw new Error('Los campos a tachar son obligatorios');
    }

    if (!(dniData.frontFile instanceof File)) {
      throw new Error('frontFile debe ser un objeto File válido');
    }

    if (!(dniData.backFile instanceof File)) {
      throw new Error('backFile debe ser un objeto File válido');
    }

    if (!dniData.fieldsToRedact || typeof dniData.fieldsToRedact !== 'object') {
      throw new Error('fieldsToRedact debe ser un objeto');
    }

    console.log('✅ Validación de entrada completada');
  }

  /**
   * Este método debe ser reemplazado con la implementación real
   * que comunique con el componente externo de procesamiento OCR
   * 
   * @param {Object} dniData - Datos validados del DNI
   * @returns {Promise<Object>} Resultado del procesamiento real
   */
  async callExternalProcessor(dniData) {
    console.log('⚠️ USANDO PROCESADOR SIMULADO');
    
    // TODO: REEMPLAZAR ESTO CON SU IMPLEMENTACIÓN REAL
    // Por ejemplo:
    // return await externalOCRService.process({
    //   frontImage: dniData.frontFile,
    //   backImage: dniData.backFile,
    //   fieldsToHide: dniData.fieldsToRedact
    // });

    // Simulación temporal para desarrollo
    await this.simulateProcessing();

    return {
      success: true,
      frontImageUrl: await this.createMockProcessedImage(dniData.frontFile),
      backImageUrl: dniData.backFile 
        ? await this.createMockProcessedImage(dniData.backFile) 
        : null,
      timestamp: new Date().toISOString(),
      message: 'Procesamiento simulado completado'
    };
  }

  /**
   * Simular tiempo de procesamiento
   * @private
   */
  async simulateProcessing() {
    const delay = 2000;
    console.log(`⏳ Simulando procesamiento (${delay}ms)...`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Crear imagen procesada simulada (temporal)
   * @private
   */
  async createMockProcessedImage(file) {
    // En producción, esto devolverá la URL de la imagen procesada por el OCR
    return URL.createObjectURL(file);
  }

  /**
   * Obtener campos que se deben tachar (true)
   * @param {Object} fieldsToRedact - Objeto de campos
   * @returns {Array<string>} Lista de campos a tachar
   */
  getFieldsToRedact(fieldsToRedact) {
    return Object.entries(fieldsToRedact)
      .filter(([, shouldRedact]) => shouldRedact === true)
      .map(([fieldName]) => fieldName);
  }

  /**
   * Obtener campos que se deben mantener visibles (false)
   * @param {Object} fieldsToRedact - Objeto de campos
   * @returns {Array<string>} Lista de campos a mantener
   */
  getFieldsToKeep(fieldsToRedact) {
    return Object.entries(fieldsToRedact)
      .filter(([, shouldRedact]) => shouldRedact === false)
      .map(([fieldName]) => fieldName);
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