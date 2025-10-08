const DNI_PROFILES_DATA = {
  VIAJES: {
    id: 'viajes',
    name: 'Viajes',
    description: 'Para reservas, controles de identidad y visados',
    icon: '✈️',
    color: 'blue',
    frontFields: {
      nombre: true,
      apellidos: true,
      dni: true,
      fechaNacimiento: true,
      sexo: false,
      nacionalidad: true,
      fechaExpedicion: false,
      fechaCaducidad: true,
      numeroSoporte: false,
      can: false,
      firma: false
    },
    backFields: {
      mrz: false,
      domicilio: false,
      municipio: false,
      provincia: false,
      equipoExpedidor: false,
      progenitores: false
    }
  },

  SALUD: {
    id: 'salud',
    name: 'Salud',
    description: 'Para hospitales y clínicas',
    icon: '🏥',
    color: 'red',
    frontFields: {
      nombre: true,
      apellidos: true,
      dni: true,
      fechaNacimiento: true,
      sexo: false,
      nacionalidad: false,
      fechaExpedicion: false,
      fechaCaducidad: false,
      numeroSoporte: false,
      can: false,
      firma: false
    },
    backFields: {
      mrz: false,
      domicilio: false,
      municipio: false,
      provincia: false,
      equipoExpedidor: false,
      progenitores: false
    }
  },

  ADMINISTRATIVO: {
    id: 'administrativo',
    name: 'Administrativo / Legal',
    description: 'Para trámites oficiales que requieren domicilio',
    icon: '📋',
    color: 'purple',
    frontFields: {
      nombre: true,
      apellidos: true,
      dni: true,
      fechaNacimiento: true,
      sexo: false,
      nacionalidad: false,
      fechaExpedicion: false,
      fechaCaducidad: false,
      numeroSoporte: false,
      can: false,
      firma: false
    },
    backFields: {
      mrz: false,
      domicilio: true,
      municipio: true,
      provincia: true,
      equipoExpedidor: false,
      progenitores: false
    }
  },

  FINANCIERO: {
    id: 'financiero',
    name: 'Financiero / Banca',
    description: 'Para verificaciones bancarias y KYC',
    icon: '🏦',
    color: 'green',
    frontFields: {
      nombre: true,
      apellidos: true,
      dni: true,
      fechaNacimiento: true,
      sexo: false,
      nacionalidad: true,
      fechaExpedicion: false,
      fechaCaducidad: false,
      numeroSoporte: false,
      can: false,
      firma: false
    },
    backFields: {
      mrz: false,
      domicilio: false,
      municipio: false,
      provincia: false,
      equipoExpedidor: false,
      progenitores: false
    }
  },
};

// Objeto principal con datos y métodos
export const DNI_PROFILES = {
  // Datos de los perfiles
  ...DNI_PROFILES_DATA,
  
  // Métodos de utilidad
  getProfileById(profileId) {
    return Object.values(DNI_PROFILES_DATA).find(profile => profile.id === profileId);
  },
  
  getProfilesList() {
    return Object.values(DNI_PROFILES_DATA);
  },
  
  getFieldsCount(frontFields, backFields) {
    const frontCount = frontFields ? Object.values(frontFields).filter(Boolean).length : 0;
    const backCount = backFields ? Object.values(backFields).filter(Boolean).length : 0;
    return frontCount + backCount;
  }
};

// Mantener exports individuales por compatibilidad (opcional)
export const getProfileById = DNI_PROFILES.getProfileById;
export const getProfilesList = DNI_PROFILES.getProfilesList;
export const getFieldsCount = DNI_PROFILES.getFieldsCount;
