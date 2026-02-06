import React, { useEffect, useRef, useState } from "react";
import * as ort from 'onnxruntime-web';

const MODEL_PATH = "/models/best.onnx";
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.5;
const IOU_THRESHOLD = 0.45;

// Tus clases en el orden exacto del entrenamiento (YAML)
const CLASS_NAMES = [
  'APELLIDOS', 'CAN', 'CLI', 'DOC_DNI', 'DOC_DNI_REV', 'DOMICILIO',
  'EMISIÓN', 'EQUIPO', 'ES', 'ESP', 'ESP_HOLO', 'FIRMA', 'FOTOGRAFIA',
  'HIJO_DE', 'LUGAR_NACIMIENTO', 'MRZ', 'NACIMIENTO', 'NACIONALIDAD',
  'NOMBRE', 'NUM_DNI', 'NUM_DNI_MIN', 'OPT_VAR', 'SEXO',
  'SOPORTE', 'SOPORTE_MIN', 'VALIDEZ'
];

let sharedSession = null;

// --- 1. CARGA DEL MODELO ---
const ensureSession = async () => {
  if (sharedSession) return sharedSession;

  sharedSession = await ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all"
  });
  return sharedSession;
};

// --- 2. PREPROCESAMIENTO ---
const preprocessing = (sourceCanvas, targetSize) => {
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgb(255, 182, 193)"; // Fondo rosa
  ctx.fillRect(0, 0, targetSize, targetSize);

  const scale = Math.min(targetSize / sourceCanvas.width, targetSize / sourceCanvas.height);
  const w = Math.round(sourceCanvas.width * scale);
  const h = Math.round(sourceCanvas.height * scale);
  const x = Math.floor((targetSize - w) / 2);
  const y = Math.floor((targetSize - h) / 2);

  ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, x, y, w, h);

  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const { data } = imageData;
  const float32Data = new Float32Array(3 * targetSize * targetSize);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    float32Data[j] = data[i] / 255.0;
    float32Data[j + targetSize * targetSize] = data[i + 1] / 255.0;
    float32Data[j + 2 * targetSize * targetSize] = data[i + 2] / 255.0;
  }

  const tensor = new ort.Tensor("float32", float32Data, [1, 3, targetSize, targetSize]);
  return { tensor, meta: { scale, x, y } };
};

// --- 3. POSTPROCESAMIENTO MULTI-CLASE ---

const calculateIoU = (box1, box2) => {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return intersection / ((box1.width * box1.height) + (box2.width * box2.height) - intersection);
};

/**
 * NMS "Per Class": 
 * Evita que una caja de 'SOPORTE' (grande) elimine una de 'FOTOGRAFIA' (pequeña)
 * solo porque se solapan. Solo comparamos cajas de la MISMA clase.
 */
const runNMS = (boxes) => {
  if (boxes.length === 0) return [];

  // Agrupar por classId
  const boxesByClass = {};
  boxes.forEach(box => {
    if (!boxesByClass[box.classId]) boxesByClass[box.classId] = [];
    boxesByClass[box.classId].push(box);
  });

  const finalBoxes = [];

  // Ejecutar NMS independientemente para cada clase
  Object.keys(boxesByClass).forEach(classId => {
    const classBoxes = boxesByClass[classId];
    classBoxes.sort((a, b) => b.confidence - a.confidence);

    const active = new Array(classBoxes.length).fill(true);
    for (let i = 0; i < classBoxes.length; i++) {
      if (active[i]) {
        finalBoxes.push(classBoxes[i]);
        for (let j = i + 1; j < classBoxes.length; j++) {
          if (active[j] && calculateIoU(classBoxes[i], classBoxes[j]) > IOU_THRESHOLD) {
            active[j] = false;
          }
        }
      }
    }
  });

  return finalBoxes;
};

const postprocessing = (outputTensor, meta) => {
  const modelOutput = outputTensor.data;
  // dims: [1, 4 + 26 clases, 8400] -> [1, 30, 8400]
  const [_, rows, cols] = outputTensor.dims;

  let boxes = [];

  // Iteramos sobre las 8400 "anchors"
  for (let i = 0; i < cols; i++) {
    // 1. Encontrar la clase con mayor probabilidad para esta caja
    let maxScore = -Infinity;
    let maxClassId = -1;

    // Las probabilidades de clase empiezan en la fila 4 hasta la fila 29
    for (let c = 0; c < CLASS_NAMES.length; c++) {
      const score = modelOutput[(4 + c) * cols + i];
      if (score > maxScore) {
        maxScore = score;
        maxClassId = c;
      }
    }

    // 2. Si supera el umbral, procesamos la caja
    if (maxScore > CONFIDENCE_THRESHOLD) {
      const cx = modelOutput[i];
      const cy = modelOutput[cols + i];
      const w = modelOutput[2 * cols + i];
      const h = modelOutput[3 * cols + i];

      let x = (cx - w / 2 - meta.x) / meta.scale;
      let y = (cy - h / 2 - meta.y) / meta.scale;
      const width = w / meta.scale;
      const height = h / meta.scale;

      boxes.push({
        classId: maxClassId,
        label: CLASS_NAMES[maxClassId], // Agregamos el nombre legible
        confidence: maxScore,
        x, y, width, height
      });
    }
  }

  return runNMS(boxes);
};

// --- 4. FUNCIÓN CORE ---
const runYoloInference = async (canvas) => {
  const session = await ensureSession();
  const { tensor, meta } = preprocessing(canvas, MODEL_INPUT_SIZE);

  const feeds = { images: tensor };
  const results = await session.run(feeds);

  return postprocessing(results.output0, meta);
};

// --- 5. COMPONENTE REACT (DEBUGGER VISUAL) ---
const DniDetector = ({ inputCanvas, onDetection }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!inputCanvas) return;
    const process = async () => {
      try {
        const boxes = await runYoloInference(inputCanvas);
        console.log("[React] Detecciones:", boxes);

        const canvas = canvasRef.current;
        canvas.width = inputCanvas.width;
        canvas.height = inputCanvas.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(inputCanvas, 0, 0);

        // Dibujado elegante
        ctx.lineWidth = 2;
        ctx.font = "14px Arial";

        boxes.forEach(box => {
          // Color aleatorio consistente basado en ID de clase
          const colorHue = (box.classId * 137.508) % 360;
          ctx.strokeStyle = `hsl(${colorHue}, 70%, 50%)`;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          // Etiqueta
          ctx.fillStyle = `hsl(${colorHue}, 70%, 50%)`;
          ctx.fillRect(box.x, box.y - 18, ctx.measureText(box.label).width + 10, 18);
          ctx.fillStyle = "white";
          ctx.fillText(box.label, box.x + 5, box.y - 4);
        });

        if (onDetection) onDetection(boxes);
      } catch (err) { console.error(err); }
    };
    process();
  }, [inputCanvas, onDetection]);

  return <canvas ref={canvasRef} className="max-w-full border" />;
};

// --- 6. EXPORTACIÓN PARA USO EN LÓGICA DE NEGOCIO ---
export const detectDniFromFile = async (file) => {
  if (!file) throw new Error("No file provided");
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Retorna array de objetos: [{ label: 'NOMBRE', x: 100, ... }, { label: 'FOTO', ... }]
  return runYoloInference(canvas);
};

export default DniDetector;