import React, { useEffect, useRef, useState } from "react";

const MODEL_PATH = "/models/model_prov.onnx";

let sharedSession = null;
let sharedSessionPromise = null;

const ensureSession = async () => {
  if (sharedSession) {
    return sharedSession;
  }

  if (!window.ort) {
    console.warn("[Detector] ONNX Runtime todavía no está disponible en window.ort");
    return null;
  }

  if (!sharedSessionPromise) {
    console.log("[Detector] Inicializando modelo ONNX (compartido)...");
    sharedSessionPromise = window.ort.InferenceSession.create(MODEL_PATH)
      .then((sess) => {
        sharedSession = sess;
        console.log("[Detector] Modelo cargado correctamente");
        return sess;
      })
      .catch((error) => {
        sharedSessionPromise = null;
        throw error;
      });
  }

  return sharedSessionPromise;
};

/**
 * Normaliza la salida del modelo para obtener rectángulos listos para recorte.
 * Devuelve coordenadas en píxeles contra el canvas de entrada.
 */
const parseDetections = (outputTensor, imageWidth, imageHeight) => {
  if (!outputTensor || !outputTensor.data || !outputTensor.data.length) {
    return [];
  }

  const { data, dims } = outputTensor;

  const stride = dims && dims.length ? dims[dims.length - 1] : 4;
  const totalDetections = Math.floor(data.length / stride);
  const rectangles = [];

  for (let i = 0; i < totalDetections; i += 1) {
    const offset = i * stride;
    const x1 = data[offset];
    const y1 = data[offset + 1];
    const x2 = data[offset + 2];
    const y2 = data[offset + 3];
    const confidence = stride > 4 ? data[offset + 4] : undefined;
    const labelIndex = stride > 5 ? data[offset + 5] : undefined;

    if (![x1, y1, x2, y2].every(Number.isFinite)) {
      continue;
    }

    const isNormalized =
      Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2)) <= 1.0001;

    const xMin = isNormalized ? x1 * imageWidth : x1;
    const yMin = isNormalized ? y1 * imageHeight : y1;
    const xMax = isNormalized ? x2 * imageWidth : x2;
    const yMax = isNormalized ? y2 * imageHeight : y2;

    const width = Math.max(0, xMax - xMin);
    const height = Math.max(0, yMax - yMin);

    if (width === 0 || height === 0) {
      continue;
    }

    rectangles.push({
      x: Math.max(0, Math.round(xMin)),
      y: Math.max(0, Math.round(yMin)),
      width: Math.round(width),
      height: Math.round(height),
      x2: Math.max(0, Math.round(xMax)),
      y2: Math.max(0, Math.round(yMax)),
      confidence,
      labelIndex
    });
  }

  return rectangles;
};

const inferDetections = async (session, inputCanvas) => {
  if (!session) {
    throw new Error("Sesión de modelo no disponible");
  }

  if (!inputCanvas) {
    throw new Error("Canvas de entrada requerido");
  }

  const ctx = inputCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo obtener el contexto 2D del canvas de entrada");
  }

  const imageData = ctx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);

  // Convertir a tensor [1,3,H,W] eliminando alpha
  const data = Float32Array.from(imageData.data).filter((_, i) => i % 4 !== 3);
  const tensor = new window.ort.Tensor("float32", data, [
    1,
    3,
    inputCanvas.height,
    inputCanvas.width
  ]);

  const feeds = { images: tensor }; // Ajusta 'images' al nombre del input de tu modelo
  const results = await session.run(feeds);

  return parseDetections(results.output0, inputCanvas.width, inputCanvas.height);
};

const DniDetector = ({ inputCanvas, onDetection }) => {
  const [session, setSession] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const initModel = async () => {
      console.log("[Detector] Inicializando modelo ONNX...");
      try {
        const sess = await ensureSession();
        if (!sess) return;
        setSession(sess);
      } catch (error) {
        console.error("[Detector] Error cargando el modelo:", error);
      }
    };

    initModel();
  }, []);

  useEffect(() => {
    if (!inputCanvas || !session) return;

    const detectDNI = async () => {
      console.log("[Detector] Ejecutando detección...");

      try {
        const rectangles = await inferDetections(session, inputCanvas);
        console.log("[Detector] Bounding boxes detectadas:", rectangles);
        rectangles.forEach((rect, idx) => {
          console.log(
            `[Detector] Rect ${idx}: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`
          );
        });

        const canvas = canvasRef.current;
        if (!canvas) {
          console.warn("[Detector] Canvas de salida no disponible para dibujar");
          if (onDetection) onDetection(rectangles, null);
          return;
        }

        canvas.width = inputCanvas.width;
        canvas.height = inputCanvas.height;
        const ctx2 = canvas.getContext("2d");
        ctx2.drawImage(inputCanvas, 0, 0);

        rectangles.forEach(({ x, y, width, height }) => {
          ctx2.strokeStyle = "red";
          ctx2.lineWidth = 2;
          ctx2.strokeRect(x, y, width, height);
        });

        if (onDetection) onDetection(rectangles, canvas);
      } catch (error) {
        console.error("[Detector] Error durante la detección:", error);
      } finally {
        console.log("[Detector] Detección finalizada");
      }
    };

    detectDNI();
  }, [session, inputCanvas, onDetection]);

  return <canvas ref={canvasRef} style={{ border: "1px solid green", marginTop: "10px" }} />;
};

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Archivo no proporcionado"));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    img.src = url;
  });

const drawImageToCanvas = (image) => {
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
};

export const detectDniOnCanvas = async (inputCanvas, { log = true } = {}) => {
  if (!inputCanvas) {
    throw new Error("Canvas no proporcionado");
  }

  const session = await ensureSession();
  if (!session) {
    if (log) {
      console.warn("[Detector] Detección omitida porque ONNX Runtime no está cargado");
    }
    return [];
  }
  const rectangles = await inferDetections(session, inputCanvas);

  if (log) {
    console.log("[Detector] Coordenadas detectadas:", rectangles);
    rectangles.forEach((rect, idx) => {
      console.log(
        `[Detector] Rect ${idx}: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`
      );
    });
  }

  return rectangles;
};

export const detectDniFromFile = async (file, options) => {
  const image = await loadImageFromFile(file);
  const canvas = drawImageToCanvas(image);
  return detectDniOnCanvas(canvas, options);
};

export default DniDetector;
