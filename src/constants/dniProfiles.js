export const DNI_PROFILES = {
  HOTEL: {
    id: 'hotel',
    name: 'Hoteles',
    description: 'Solo datos esenciales para registro hotelero',
    icon: '🏨',
    color: 'orange',
    fields: {
      nombre: true,
      apellidos: true,
      dni: true,
      fechaNacimiento: true,
      sexo: false,
      nacionalidad: true,
      fechaExpedicion: false,
      fechaCaducidad: false,
      equipoExpedidor: false,
      numeroSoporte: false
    }
  },

  BANCA: {
    id: 'banca',
    name: 'Banca',
    description: 'Verificación bancaria completa',
    icon: '🏦',
    color: 'green',
    fields: {
      nombre: true,
      apellidos: true,
      dni: true,
      fechaNacimiento: true,
      sexo: true,
      nacionalidad: true,
      fechaExpedicion: true,
      fechaCaducidad: true,
      equipoExpedidor: false,
      numeroSoporte: false
    }
  },

  TRANSPORTE: {
    id: 'transporte',
    name: 'Transporte',
    description: 'Datos básicos para tickets de viaje',
    icon: '✈️',
    color: 'purple',
    fields: {
      nombre: true,
      apellidos: true,
      dni: true,
      fechaNacimiento: true,
      sexo: true,
      nacionalidad: true,
      fechaExpedicion: false,
      fechaCaducidad: false,
      equipoExpedidor: false,
      numeroSoporte: false
    }
  },

  MINIMO: {
    id: 'minimo',
    name: 'Mínimo',
    description: 'Solo identificación básica',
    icon: '📝',
    color: 'gray',
    fields: {
      nombre: true,
      apellidos: true,
      dni: true,
      fechaNacimiento: false,
      sexo: false,
      nacionalidad: false,
      fechaExpedicion: false,
      fechaCaducidad: false,
      equipoExpedidor: false,
      numeroSoporte: false
    }
  }
};

export const getProfileById = (profileId) => {
  return Object.values(DNI_PROFILES).find(profile => profile.id === profileId);
};

export const getProfilesList = () => {
  return Object.values(DNI_PROFILES);
};

export const getFieldsCount = (fields) => {
  return Object.values(fields).filter(Boolean).length;
};