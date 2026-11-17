// Perfiles predefinidos del editor.
// Cada campo dice si el perfil lo tapa (true) o lo deja a la vista (false). Es el mismo criterio que siguen
// las casillas del editor («marcada = censurar»), censorDniComplete y hiddenFields en las métricas.
// CLI, lugar de nacimiento y ventana del soporte no aparecen en ningún perfil, así que ningún perfil los tapa.
// Falta decidir qué debe hacer cada perfil con ellos.
// La fotografía va a false en todos los perfiles, porque muchos sitios necesitan ver la cara para comprobar que el DNI
// es de quien lo enseña. Solo se tapa marcando su casilla o con «Censurar todo».
const DNI_PROFILES_DATA = {
  VIAJES: {
    id: 'viajes',
    name: 'Viajes',
    description: 'Para reservas, controles de identidad y visados',
    icon: '✈️',
    color: 'blue',
    // Deja a la vista nombre, apellidos, número de DNI, nacimiento, nacionalidad y caducidad.
    // Municipio y provincia deberían verse también, pero de momento se tapan para no enseñar la calle.
    // La casilla «Municipio» tapa la caja DOMICILIO del modelo, que cubre calle, municipio y provincia.
    // «Domicilio» y «Provincia» apuntan a clases que el modelo no tiene, así que solas no tapan nada.
    // Se marcan las tres para que las casillas y hiddenFields digan lo que de verdad se tapa.
    // Cuando la calle tenga su propia clase, municipio y provincia pasarán a false.
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
      municipio: true,
      provincia: true,
      equipoExpedidor: true,
      progenitores: true,
    },
  },
  SALUD: {
    id: 'salud',
    name: 'Salud',
    description: 'Para hospitales y clínicas',
    icon: '🏥',
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
    icon: '📋',
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
    description: 'Para verificaciones bancarias y KYC',
    icon: '🏦',
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
