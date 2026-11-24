// Perfiles predefinidos del editor.
// Cada campo dice si el perfil lo tapa (true) o lo deja a la vista (false). Es el mismo criterio que siguen
// las casillas del editor («marcada = censurar»), censorDniComplete y hiddenFields en las métricas.
// CLI, lugar de nacimiento y ventana del soporte no aparecen en ningún perfil. Aun así, desde el 23/11/2026 el CLI y
// la ventana se tapan solos cuando se tapa el dato que repiten (ver DONDE_SALE en src/utils/planCensura.js). Falta
// decidir qué hace cada perfil con el lugar de nacimiento (DEC-1).
// La fotografía va a false en todos los perfiles, porque muchos sitios necesitan ver la cara para comprobar que el DNI
// es de quien lo enseña. Solo se tapa marcando su casilla o con «Censurar todo».
const DNI_PROFILES_DATA = {
  VIAJES: {
    id: 'viajes',
    name: 'Viajes',
    description: 'Para reservas, controles de identidad y visados',
    icon: 'bi-airplane',
    color: 'blue',
    // Deja a la vista nombre, apellidos, número de DNI, nacimiento, nacionalidad, caducidad, municipio y provincia.
    // El modelo ve el domicilio como un solo bloque. Desde CEN-2 (23/11/2026) la web separa sus líneas y tapa solo la
    // calle (ver src/utils/lineasDomicilio.js). Si no se ven claras las cuatro líneas, tapa el bloque entero, municipio y
    // provincia incluidos.
    frontFields: {
      nombre: false,
      apellidos: false,
      dni: false,
      fechaNacimiento: false,
      sexo: true,
      nacionalidad: false,
      fechaExpedicion: true,
      fechaCaducidad: false,
      numeroSoporte: true,
      can: true,
      firma: true,
      fotografia: false,
    },
    backFields: {
      mrz: true,
      domicilio: true,
      municipio: false,
      provincia: false,
      equipoExpedidor: true,
      progenitores: true,
    },
  },
  SALUD: {
    id: 'salud',
    name: 'Salud',
    description: 'Para hospitales y clínicas',
    icon: 'bi-heart-pulse',
    color: 'red',
    // Deja a la vista nombre, apellidos, número de DNI y nacimiento
    frontFields: {
      nombre: false,
      apellidos: false,
      dni: false,
      fechaNacimiento: false,
      sexo: true,
      nacionalidad: true,
      fechaExpedicion: true,
      fechaCaducidad: true,
      numeroSoporte: true,
      can: true,
      firma: true,
      fotografia: false,
    },
    backFields: {
      mrz: true,
      domicilio: true,
      municipio: true,
      provincia: true,
      equipoExpedidor: true,
      progenitores: true,
    },
  },
  ADMINISTRATIVO: {
    id: 'administrativo',
    name: 'Administrativo / legal',
    description: 'Para trámites oficiales que requieren domicilio',
    icon: 'bi-file-earmark-text',
    color: 'purple',
    // Deja a la vista nombre, apellidos, número de DNI, nacimiento, domicilio, municipio y provincia
    frontFields: {
      nombre: false,
      apellidos: false,
      dni: false,
      fechaNacimiento: false,
      sexo: true,
      nacionalidad: true,
      fechaExpedicion: true,
      fechaCaducidad: true,
      numeroSoporte: true,
      can: true,
      firma: true,
      fotografia: false,
    },
    backFields: {
      mrz: true,
      domicilio: false,
      municipio: false,
      provincia: false,
      equipoExpedidor: true,
      progenitores: true,
    },
  },
  FINANCIERO: {
    id: 'financiero',
    name: 'Financiero / banca',
    description: 'Para verificaciones bancarias y de identidad de clientes',
    icon: 'bi-bank',
    color: 'green',
    // Deja a la vista nombre, apellidos, número de DNI, nacimiento y nacionalidad
    frontFields: {
      nombre: false,
      apellidos: false,
      dni: false,
      fechaNacimiento: false,
      sexo: true,
      nacionalidad: false,
      fechaExpedicion: true,
      fechaCaducidad: true,
      numeroSoporte: true,
      can: true,
      firma: true,
      fotografia: false,
    },
    backFields: {
      mrz: true,
      domicilio: true,
      municipio: true,
      provincia: true,
      equipoExpedidor: true,
      progenitores: true,
    },
  },
};

const DNI_PROFILES = {
  ...DNI_PROFILES_DATA,
  getProfileById(profileId) {
    return Object.values(DNI_PROFILES_DATA).find(p => p.id === profileId);
  },
  getProfilesList() {
    return Object.values(DNI_PROFILES_DATA);
  },
};

export { DNI_PROFILES_DATA, DNI_PROFILES };
export default DNI_PROFILES;
