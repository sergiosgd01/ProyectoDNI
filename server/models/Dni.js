import mongoose from 'mongoose';
import { DNI_PROFILES_DATA } from '../../shared/constants/dniProfiles.js';

// Extraer automáticamente todos los IDs de los perfiles
const VALID_PROFILES = Object.values(DNI_PROFILES_DATA).map(profile => profile.id);

// Agregamos 'personalizado' como perfil adicional genérico
VALID_PROFILES.push('personalizado');

const DniSchema = new mongoose.Schema({
  dniNumber: {
    type: String,
    required: true,
    trim: true,
  },
  hologramReadable: {
    type: Boolean,
    default: false,
  },
  homogenityPassed: {
    type: Boolean,
    default: false,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  profileUsed: {
    type: String,
    enum: VALID_PROFILES, 
    required: true,
  },
  customFields: {
    type: Map,
    of: Boolean,
    default: null,
    // true = se muestra, false = se oculta
    // Ejemplo: { "nombre": true, "apellidos": false, "dni": true, ... }
  },
  watermarkText: {
    type: String,
    default: null,
    maxLength: 100,
    trim: true,
  },
});

DniSchema.index({ dniNumber: 1 });
DniSchema.index({ profileUsed: 1, uploadDate: -1 });

export default mongoose.model('Dni', DniSchema);
