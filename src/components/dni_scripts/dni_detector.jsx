import React, { useEffect, useRef, useState } from "react";

const MODEL_PATH = "/models/model_prov.onnx";
const MODEL_INPUT_SIZE = 640;

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
    sharedSessionPromise = window.ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["wasm"],
      executionMode: "sequential"
    })
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

const mapRectanglesToSource = (rectangles, meta, sourceWidth, sourceHeight) => {
  if (!meta) {
    return rectangles;
  }

  const { scale, padX, padY } = meta;
  if (!scale || scale <= 0) {
    return rectangles;
  }

  return rectangles
    .map((rect) => {
      const x1 = (rect.x - padX) / scale;
      const y1 = (rect.y - padY) / scale;
      const x2 = (rect.x2 - padX) / scale;
      const y2 = (rect.y2 - padY) / scale;

      const xMin = Math.max(0, Math.min(sourceWidth, x1));
      const yMin = Math.max(0, Math.min(sourceHeight, y1));
      const xMax = Math.max(0, Math.min(sourceWidth, x2));
      const yMax = Math.max(0, Math.min(sourceHeight, y2));

      const width = Math.max(0, xMax - xMin);
      const height = Math.max(0, yMax - yMin);

      if (width === 0 || height === 0) {
        return null;
      }

      return {
        ...rect,
        x: Math.round(xMin),
        y: Math.round(yMin),
        x2: Math.round(xMax),
        y2: Math.round(yMax),
        width: Math.round(width),
        height: Math.round(height)
      };
    })
    .filter(Boolean);
};

const letterboxCanvas = (sourceCanvas, targetSize = MODEL_INPUT_SIZE) => {
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, targetSize, targetSize);

  const scale = Math.min(targetSize / sourceCanvas.width, targetSize / sourceCanvas.height);
  const drawWidth = Math.round(sourceCanvas.width * scale);
  const drawHeight = Math.round(sourceCanvas.height * scale);
  const padX = Math.floor((targetSize - drawWidth) / 2);
  const padY = Math.floor((targetSize - drawHeight) / 2);

  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
    padX,
    padY,
    drawWidth,
    drawHeight
  );

  return {
    canvas,
    meta: {
      scale,
      padX,
      padY,
      targetSize
    }
  };
};

const tensorFromCanvas = (canvas) => {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = Float32Array.from(imageData.data).filter((_, i) => i % 4 !== 3);
  return new window.ort.Tensor("float32", data, [1, 3, height, width]);
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

  const { canvas: processedCanvas, meta } = letterboxCanvas(inputCanvas, MODEL_INPUT_SIZE);
  const tensor = tensorFromCanvas(processedCanvas);

  const feeds = { images: tensor }; // Ajusta 'images' al nombre del input de tu modelo
  const results = await session.run(feeds);

  const letterboxRects = parseDetections(results.output0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const mappedRects = mapRectanglesToSource(
    letterboxRects,
    meta,
    inputCanvas.width,
    inputCanvas.height
  );

  return mappedRects;
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
