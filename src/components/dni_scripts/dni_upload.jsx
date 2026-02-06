import React, { useRef } from "react";
import { validateFileComplete } from "../../utils/fileValidation";

const DniUploader = ({ onImageLoaded }) => {
  const canvasRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 🔒 VALIDACIÓN COMPLETA DEL ARCHIVO
    try {
      await validateFileComplete(file);
    } catch (error) {
      console.error('❌ [DniUploader] Validación fallida:', error.message);
      alert(`⚠️ Error de validación:\n${error.message}`);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      onImageLoaded?.(canvas);
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <canvas ref={canvasRef} style={{ border: "1px solid black", marginTop: "10px" }} />
    </div>
  );
};

export default DniUploader;