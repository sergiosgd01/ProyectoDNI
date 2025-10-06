import React, { useEffect, useRef, useState } from "react";

const DniDetector = ({ inputCanvas, onDetection }) => {
  const [session, setSession] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const initModel = async () => {
      console.log("[Detector] Inicializando modelo ONNX...");
      if (!window.ort) {
        console.error("ONNX Runtime no cargado");
        return;
      }

      const sess = await window.ort.InferenceSession.create("/models/model_prov.onnx");
      setSession(sess);
      console.log("[Detector] Modelo cargado correctamente");
    };

    initModel();
  }, []);

  useEffect(() => {
    if (!session || !inputCanvas) return;

    const detectDNI = async () => {
      console.log("[Detector] Ejecutando detección...");

      const ctx = inputCanvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);

      // Convertir a tensor [1,3,H,W] eliminando alpha
      const data = Float32Array.from(imageData.data).filter((_, i) => i % 4 !== 3);
      const tensor = new window.ort.Tensor("float32", data, [1, 3, inputCanvas.height, inputCanvas.width]);

      const feeds = { images: tensor }; // Ajusta 'images' al nombre del input de tu modelo
      const results = await session.run(feeds);

      const boxes = results.output0.data; // Ajusta según tu output del modelo
      console.log("[Detector] Bounding boxes detectadas:", boxes);

      // Dibujar bounding boxes en un canvas nuevo
      const canvas = canvasRef.current;
      canvas.width = inputCanvas.width;
      canvas.height = inputCanvas.height;
      const ctx2 = canvas.getContext("2d");
      ctx2.drawImage(inputCanvas, 0, 0);

      boxes.forEach(([x1, y1, x2, y2]) => {
        ctx2.strokeStyle = "red";
        ctx2.lineWidth = 2;
        ctx2.strokeRect(x1, y1, x2 - x1, y2 - y1);
      });

      if (onDetection) onDetection(boxes, canvas);
      console.log("[Detector] Detección finalizada");
    };

    detectDNI();
  }, [session, inputCanvas]);

  return <canvas ref={canvasRef} style={{ border: "1px solid green", marginTop: "10px" }} />;
};

export default DniDetector;