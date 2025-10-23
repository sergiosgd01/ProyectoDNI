// Campos normalizados
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
    value = deleteChars(value, '/');
    value = deleteChars(value, '—');
    value = deleteChars(value, '-');
    value = deleteChars(value, ',');
    value = deleteChars(value, '.');
    value = deleteChars(value, '+');
    value = deleteChars(value, '”');
    value = deleteChars(value, '*');
    value = deleteChars(value, "'");
    value = deleteChars(value, '_');
    value = deleteChars(value, '|');
    value = deleteChars(value, '!');
    value = deleteChars(value, '<');
    value = deleteChars(value, '>');
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
      default:
        value = value.length ? value : null;
        break;
    }

    formatted[key] = value ?? null;
  });

  return formatted;
};
