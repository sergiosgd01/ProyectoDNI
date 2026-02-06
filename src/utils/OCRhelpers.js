// Campos normalizados
import logger from './logger';
export const NUM_DNI = 'dni';
export const EMISION = 'fechaExpedicion';
export const VALIDEZ = 'fechaCaducidad';
export const NACIMIENTO = 'fechaNacimiento';
export const SEXO = 'sexo';
export const NACIONALIDAD = 'nacionalidad';
export const NUM_SOPORTE = 'numeroSoporte';
export const CAN = 'can';
export const EQUIPO = 'equipoExpedidor';
export const MRZ = 'mrz';
export const NOMBRE = 'nombre';
export const APELLIDOS = 'apellidos';
export const FIRMA = 'firma';


// Regex validación de campos
export const dniRe = /([0-9]{8}[A-Z])/;
export const dateRe = /([0-3][0-9][\s./-]?[0-1][0-9][\s./-]?[0-9]{4})/;
export const sexoRe = /([MF])/;
export const nacionalidadRe = /([A-Z]{3})/;
export const numSoporteRe = /([A-Z0-9]{9})/;
export const canRe = /([0-9]{6})/;
export const equipoRe = /([0-9]{4})/;
export const apellidosRe = /^[A-ZÁÉÍÓÚÑ]+ [A-ZÁÉÍÓÚÑ]+$/;
export const nombreRe = /^[A-ZÁÉÍÓÚÑ]+$/;

//normalización date
const DATE_OCR_SUBS = [
  [/D/g, '0'],
  [/O/g, '0'],
  [/B/g, '8'],
  [/\|/g, '1']
];

// Tabla de letras para DNI
export const charTable = 'TRWAGMYFPDXBNJZSQVHLCKE';

export const deleteChars = (string = '', char = '') => string.split(char).join('');

export const validateRe = (string = '', regex) => {
  // Validar que string no sea null/undefined antes de usar match
  if (!string || typeof string !== 'string') return null;
  if (!regex) return string;

  const match = string.match(regex);
  return match ? match[0] : null;
};

export const fixDates = (value = '') => {
  let result = value;
  DATE_OCR_SUBS.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });
  return result;
};

export const strToDate = (string = '') => {
  const clean = validateRe(string, dateRe);
  if (!clean) return null;
  const parts = clean.replace(/[./-]/g, ' ').trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((p) => parseInt(p, 10));
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isLeapYear = (year) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export const countLeapYears = (actualDate, birthDate) => {
  if (!actualDate || !birthDate) return 0;
  let count = 0;
  for (let year = birthDate.getFullYear(); year <= actualDate.getFullYear(); year += 1) {
    if (!isLeapYear(year)) continue;
    const leapDay = new Date(year, 1, 29);
    if (year === birthDate.getFullYear()) {
      if (birthDate <= leapDay) count += 1;
    } else if (year === actualDate.getFullYear()) {
      if (actualDate >= leapDay) count += 1;
    } else {
      count += 1;
    }
  }
  return count;
};

export const calculateAge = (birthDate) => {
  const referenceDate = new Date();
  const parsedBirthDate = birthDate instanceof Date ? birthDate : strToDate(birthDate);

  if (!parsedBirthDate || parsedBirthDate >= referenceDate) {
    return false;
  }

  const diff = referenceDate - parsedBirthDate;
  if (Number.isNaN(diff)) {
    return false;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const age =
    Math.floor((diff - countLeapYears(referenceDate, parsedBirthDate) * msPerDay) / (365 * msPerDay));

  return age >= 1 && age <= 115;
};

export const calcMrzChecksum = (input = '') => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const weights = [7, 3, 1];
  let checksum = 0;
  const normalized = input.toUpperCase().replace(/Ñ/g, 'N').replace(/</g, '0');
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const value = alphabet.indexOf(char);
    if (value === -1) continue;
    checksum += value * weights[i % weights.length];
  }
  return String(checksum % 10);
};


// Normalización de datos DNI - fallos de OCR en spa
export const normalizeDniData = (dniData = {}) => {
  const formatted = { ...dniData };

  Object.entries(dniData).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined) {
      formatted[key] = null;
      return;
    }

    let value = rawValue.toString().toUpperCase();

    if (key === MRZ) {
      // Validar que value no esté vacío antes de procesar
      if (!value || !value.trim()) {
        formatted[key] = null;
        return;
      }
      value = value.replace(/\?/g, '<').replace(/[^0-9A-Z<]/g, '');
      value = value.trim();
      formatted[key] = value.length ? value : null;
      return;
    }

    const removableChars = ['/', '—', '-', ',', '.', '+', '”', '*', "'", '_', '|', '!', '<', '>'];
    removableChars.forEach((char) => {
      value = deleteChars(value, char);
    });
    value = value.replace(/\?/g, '2').trim();
    if (!value.length) {
      formatted[key] = null;
      return;
    }

    switch (key) {
      case EMISION: {
        const cleaned = fixDates(value);
        const parsedIssue = validateRe(cleaned, dateRe);
        const issueDate = strToDate(parsedIssue);

        if (!parsedIssue || !issueDate || issueDate > new Date()) {
          value = null; // expedición inválida o futura
        } else {
          value = parsedIssue;
        }
        break;
      }

      case VALIDEZ: {
        const cleaned = fixDates(value);
        const parsedExpiry = validateRe(cleaned, dateRe);
        const expiryDate = strToDate(parsedExpiry);

        if (!parsedExpiry || !expiryDate || expiryDate <= new Date()) {
          value = null; // caducidad inválida o ya vencida
        } else {
          value = parsedExpiry;
        }
        break;
      }

      case NACIMIENTO: {
        const cleaned = fixDates(value);
        const parsedBirth = validateRe(cleaned, dateRe);

        if (!parsedBirth || !calculateAge(parsedBirth)) {
          value = null; // fecha erronea o edad fuera de 1..115
        } else {
          value = parsedBirth;
        }
        break;
      }
      case NUM_DNI:
        value = validateRe(value, dniRe);
        break;
      case SEXO:
        value = validateRe(value, sexoRe);
        break;
      case NACIONALIDAD: {
        const match = validateRe(value, nacionalidadRe);
        value = match === 'ESP' ? match : null;
        break;
      }
      case NUM_SOPORTE: {
        const raw = value.replace(/\s+/g, '');
        const letters = raw.slice(0, 3).replace(/[0-9]/g, 'O');
        const tail = raw
          .slice(3)
          .replace(/[ODNQ]/g, '0')
          .replace(/B/g, '8')
          .replace(/S/g, '5')
          .replace(/I/g, '1');
        const normalized = `${letters}${tail}`;
        value = validateRe(normalized, numSoporteRe);
        break;
      }
      case APELLIDOS: {
        const collapsed = value.replace(/\s+/g, ' ').trim();
        value = validateRe(collapsed, apellidosRe);
        break;
      }
      case CAN:
        value = validateRe(value, canRe);
        break;
      case NOMBRE: {
        const collapsed = value.replace(/\s+/g, ' ').trim();
        value = validateRe(collapsed, nombreRe);
        break;
      }
      case FIRMA: {
        value = null;
        break;
      }
      default:
        value = value.length ? value : null;
        break;
    }

    formatted[key] = value ?? null;
  });

  return formatted;
};

const normalizeMrzLine = (line = '') =>
  line
    .toUpperCase()
    .replace(/[^0-9A-Z<]/g, '')
    .padEnd(30, '<')
    .slice(0, 30);

const buildMrzLines = (mrzString = '') => {
  if (!mrzString || typeof mrzString !== 'string') {
    return null;
  }

  const trimmed = mrzString.trim();
  if (!trimmed.length) {
    return null;
  }

  const newlineSplit = trimmed
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (newlineSplit.length >= 3) {
    return newlineSplit.slice(0, 3).map(normalizeMrzLine);
  }

  const collapsed = trimmed.toUpperCase().replace(/[^0-9A-Z<]/g, '');
  if (!collapsed.length) {
    return null;
  }

  const lines = [];
  const chunkSize = 30;
  for (let i = 0; i < collapsed.length && lines.length < 3; i += chunkSize) {
    lines.push(collapsed.slice(i, i + chunkSize));
  }

  while (lines.length < 3) {
    lines.push('');
  }

  return lines.slice(0, 3).map(normalizeMrzLine);
};

const normalizeIdentifierValue = (value) => {
  if (!value) {
    return null;
  }
  const str = value.toString ? value.toString() : String(value);
  return str
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
};

export const extractIdentifiersFromMrz = (mrzString = '') => {
  if (!mrzString || typeof mrzString !== 'string') return null;

  const lines = mrzString.split('\n').map(line => line.trim());
  if (lines.length < 2) return null;

  const normalizedLines = [...lines];

  normalizedLines[0] = normalizedLines[0].padEnd(30, '<');
  normalizedLines[1] = normalizedLines[1].padEnd(30, '<');

  const line1Chars = normalizedLines[0].split('');

  const supportRaw = line1Chars.slice(5, 14).join(''); // posiciones 5-13
  const numeroSoporte = supportRaw.replace(/</g, '') || null;

  const numeroSoporteCheckDigit = line1Chars[14] ?? null;

  let numeroSoporteValid = null;
  if (numeroSoporte && numeroSoporteCheckDigit) {
    numeroSoporteValid = calcMrzChecksum(supportRaw) === numeroSoporteCheckDigit;
  }

  const dniRaw = line1Chars.slice(14, 23).join(''); // posiciones 14-23
  const dniValue = dniRaw.replace(/</g, '') || null;

  const compositeCheckChar = normalizedLines[1][29] ?? null;
  let compositeValid = null;
  if (compositeCheckChar) {
    const compositeSource =
      supportRaw +
      (numeroSoporteCheckDigit ?? '') +
      normalizedLines[1].slice(0, 7) +
      normalizedLines[1].slice(7, 15) +
      normalizedLines[1].slice(15, 29);
    compositeValid = calcMrzChecksum(compositeSource) === compositeCheckChar;
  }

  return {
    lines: normalizedLines,
    numeroSoporte,
    numeroSoporteCheckDigit,
    numeroSoporteValid,
    dni: dniValue,
    compositeValid,
    normalizedMrz: normalizedLines.join('\n')
  };
};

export const validateDniConsistencyFlags = (ocrData) => {
  const result = {
    nacimiento: false,
    nombre: false,
    apellidos: false,
    sexo: false,
    nacionalidad: false,
    fechaExpedicion: false,
    fechaCaducidad: false,
    numeroSoporte: false,
    can: false,
    mrz: false,
    dniMatch: false,
    numeroSoporteMatch: false
  };

  if (!ocrData) return result;
  const back = ocrData.back;
  const front = ocrData.front;

  // --- MRZ ---
  const mrzString = back.MRZ;
  let mrzInfo = null;
  if (mrzString && typeof mrzString === 'string' && mrzString.trim()) {
    mrzInfo = extractIdentifiersFromMrz(mrzString);
    result.mrz = !!mrzInfo;
    logger.sensitive('MRZ extraído', mrzInfo);
  }

  // --- Comparaciones MRZ ---
  if (mrzInfo) {
    const frontDni = normalizeIdentifierValue(front.NUM_DNI);
    const mrzDni = normalizeIdentifierValue(mrzInfo.dni);
    result.dniMatch = frontDni && mrzDni && frontDni === mrzDni;

    const frontSupport = front.SOPORTE_MIN;
    // let frontSupport = null;
    // if (front.NUM_SOPORTE){
    //    frontSupport = front.NUM_SOPORTE;
    // } else {
    //    frontSupport = front.SOPORTE_MIN;
    // }
    const mrzSupport = mrzInfo.numeroSoporte;
    result.numeroSoporteMatch =
      frontSupport &&
      mrzSupport &&
      frontSupport === mrzSupport &&
      mrzInfo.numeroSoporteValid !== false;
  }

  // --- Campos frontales con validación ---
  // Fecha nacimiento
  const nacimientoRaw = front.NACIMIENTO;
  const nacimientoParsed = nacimientoRaw ? strToDate(nacimientoRaw) : null;
  result.nacimiento = !!nacimientoParsed && calculateAge(nacimientoParsed);

  // Nombre
  const nombreRaw = front.NOMBRE;
  result.nombre = !!nombreRaw && !!validateRe(nombreRaw, nombreRe);

  // Apellidos
  const apellidosRaw = front.APELLIDOS;
  result.apellidos =
    !!apellidosRaw && !!validateRe(apellidosRaw.replace(/\s+/g, ' ').trim(), apellidosRe);

  // Sexo
  const sexoRaw = front.SEXO;
  result.sexo = !!sexoRaw && !!validateRe(sexoRaw, sexoRe);

  // Nacionalidad
  const nacionalidadRaw = front.NACIONALIDAD;
  result.nacionalidad = nacionalidadRaw === 'ESP';

  // Fecha expedición
  const fechaExpRaw = front.EMISIÓN;
  const fechaExpParsed = fechaExpRaw ? strToDate(fechaExpRaw) : null;
  result.fechaExpedicion =
    fechaExpParsed instanceof Date && fechaExpParsed <= new Date();

  // Fecha caducidad
  const fechaCadRaw = front.VALIDEZ;
  const fechaCadParsed = fechaCadRaw ? strToDate(fechaCadRaw) : null;
  result.fechaCaducidad =
    fechaCadParsed instanceof Date && fechaCadParsed > new Date();

  // Número de soporte
  const numeroSoporteRaw = front.NUM_SOPORTE;
  result.numeroSoporte = !!numeroSoporteRaw && !!validateRe(numeroSoporteRaw, numSoporteRe);

  // CAN
  const canRaw = front.CAN;
  result.can = !!canRaw && !!validateRe(canRaw, canRe);

  return result;
};
