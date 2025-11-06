/**
 * Banco de pruebas sencillo para validar la extracción OCR del DNI.
 *
 * Uso (en modo desarrollo):
 *   - Asegúrate de que la app esté arrancada con `npm run dev`.
 *   - Abre la consola del navegador y ejecuta:
 *       await window.OCRTestBank.runAll();
 *   - El resultado mostrará un resumen por caso y los campos que no coinciden.
 *
 * Notas:
 *   - Cada caso puede definir expectativas estrictas (string/null),
 *     expresiones regulares o funciones personalizadas para validar los campos.
 *   - Los archivos de imagen se cargan vía fetch desde /public, por lo que deben
 *     estar accesibles en la carpeta correspondiente.
 */

import { extractDniText } from '../components/dni_scripts/dni_censor.jsx';

/**
 * Convierte una ruta pública a un objeto File para reutilizar la lógica actual.
 */
async function fetchImageAsFile(source, fallbackName) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen de prueba: ${source}`);
  }

  const blob = await response.blob();
  const name =
    fallbackName ||
    source.split('/').filter(Boolean).pop() ||
    'dni-test-image.jpg';

  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

const stringifyExpectation = (expectation) => {
  if (expectation instanceof RegExp) {
    return expectation.toString();
  }
  if (typeof expectation === 'function') {
    return expectation.name ? `fn:${expectation.name}` : 'fn:anonymous';
  }
  return expectation;
};

const evaluateExpectation = (actualValue, expectation) => {
  if (expectation === undefined) {
    return { pass: true };
  }

  if (expectation instanceof RegExp) {
    const candidate = actualValue ?? '';
    expectation.lastIndex = 0;
    const pass = expectation.test(candidate);
    expectation.lastIndex = 0;
    return {
      pass,
      message: pass ? null : `Valor "${candidate}" no cumple ${expectation.toString()}`
    };
  }

  if (typeof expectation === 'function') {
    try {
      const pass = Boolean(expectation(actualValue));
      return { pass, message: pass ? null : 'Validación personalizada retornó false' };
    } catch (error) {
      return { pass: false, message: error.message || 'Error en validador' };
    }
  }

  const pass = actualValue === expectation;
  return {
    pass,
    message: pass ? null : `Se esperaba "${expectation}" pero se obtuvo "${actualValue ?? 'null'}"`
  };
};

const buildDiffs = (actual, expected, side) => {
  if (!expected) {
    return [];
  }

  return Object.entries(expected).map(([field, expectation]) => {
    const actualValue = actual ? actual[field] ?? null : null;
    const evaluation = evaluateExpectation(actualValue, expectation);

    return {
      side,
      field,
      expected: stringifyExpectation(expectation),
      actual: actualValue,
      pass: evaluation.pass,
      message: evaluation.message
    };
  });
};

/**
 * Conjunto inicial de casos de prueba.
 * Añade nuevos elementos a la lista para ampliar la cobertura de escenarios.
 */
export const OCR_TEST_CASES = [
  {
    id: 'dni-demo-especimen',
    label: 'DNI 4.0 - Ejemplo oficial (Carmen Española)',
    frontImage: {
      src: '/demo/front-image.jpg',
      name: 'dni-front-demo.jpg'
    },
    backImage: {
      src: '/demo/back-image.jpg',
      name: 'dni-back-demo.jpg'
    },
    expected: {
      front: {
        nombre: 'CARMEN',
        apellidos: /^[A-ZÑ]+\s+[A-ZÑ]+$/,
        dni: '99999999R',
        fechaNacimiento: '01 01 1980',
        sexo: 'F',
        nacionalidad: 'ESP',
        fechaExpedicion: '02 06 2021',
        fechaCaducidad: '02 06 2031', 
        numeroSoporte: 'CAA000000',
        can: '987654',
        firma: null
      },
      back: {
        domicilio: 'AVDA DE MADRID SN',
        municipio: 'MADRID MADRID',
        provincia: 'MADRID MADRID',
        equipoExpedidor: /^[0-9A-Z]{8}$/,
        progenitores: 'JUAN / CARMEN',
        mrz: (value) => typeof value === 'string' && value.startsWith('IDESPCAA0000004')
      }
    }
  }
];

export async function runOcrTestCase(testCase, { verbose = true } = {}) {
  const frontSpec = typeof testCase.frontImage === 'string'
    ? { src: testCase.frontImage }
    : testCase.frontImage;
  const backSpec = typeof testCase.backImage === 'string'
    ? { src: testCase.backImage }
    : testCase.backImage;

  const [frontFile, backFile] = await Promise.all([
    frontSpec ? fetchImageAsFile(frontSpec.src, frontSpec.name) : null,
    backSpec ? fetchImageAsFile(backSpec.src, backSpec.name) : null
  ]);

  const ocrResult = await extractDniText(frontFile, backFile);

  const diffs = [
    ...buildDiffs(ocrResult.front, testCase.expected?.front, 'front'),
    ...buildDiffs(ocrResult.back, testCase.expected?.back, 'back')
  ];

  const success = diffs.every((diff) => diff.pass);

  if (verbose) {
    console.groupCollapsed(
      `[OCRTestBank] Caso ${testCase.id} → ${success ? 'OK' : 'FALLOS'}`
    );
    console.table(diffs);
    console.log('Resultado OCR normalizado:', ocrResult);
    console.groupEnd();
  }

  return {
    id: testCase.id,
    label: testCase.label,
    success,
    diffs,
    result: ocrResult
  };
}

export async function runAllOcrTests({ stopOnFailure = false } = {}) {
  const summaries = [];

  for (const testCase of OCR_TEST_CASES) {
    try {
      const summary = await runOcrTestCase(testCase);
      summaries.push(summary);
      if (stopOnFailure && !summary.success) {
        break;
      }
    } catch (error) {
      summaries.push({
        id: testCase.id,
        label: testCase.label,
        success: false,
        error
      });
      if (stopOnFailure) {
        break;
      }
    }
  }

  const passed = summaries.filter((item) => item.success).length;
  const failed = summaries.length - passed;

  console.group('[OCRTestBank] Resumen global');
  console.table(
    summaries.map((summary) => ({
      id: summary.id,
      label: summary.label,
      success: summary.success,
      error: summary.error ? summary.error.message : null
    }))
  );
  console.info(`Casos superados: ${passed}/${summaries.length}`);
  if (failed > 0) {
    console.warn(`Casos con fallos: ${failed}`);
  }
  console.groupEnd();

  return { summaries, passed, failed };
}

/**
 * Exponer el banco en window para facilitar su ejecución manual.
 */
function registerGlobalHelpers() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.OCRTestBank) {
    window.OCRTestBank = {};
  }

  Object.assign(window.OCRTestBank, {
    cases: OCR_TEST_CASES,
    runCase: runOcrTestCase,
    runAll: runAllOcrTests
  });

  if (!window.__OCR_TEST_BANK_NOTICE__) {
    window.__OCR_TEST_BANK_NOTICE__ = true;
    console.info(
      '[OCRTestBank] Disponible en window.OCRTestBank. Ejecuta `await window.OCRTestBank.runAll()` para lanzar el banco.'
    );
  }
}

registerGlobalHelpers();
