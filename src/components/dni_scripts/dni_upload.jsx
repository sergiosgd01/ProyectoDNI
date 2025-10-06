import React, { useRef } from "react";

const DniUploader = ({ onImageLoaded }) => {
    const canvasRef = useRef(null);

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;

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