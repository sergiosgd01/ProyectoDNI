import { useState, useEffect } from "react";

export default function useOpenCV() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const waitForCV = () => {
      if (window.cv) {
        if (window.cv.getBuildInformation) {
          // OpenCV ya cargado
          console.log("OpenCV.js ya cargado");
          setReady(true);
        } else {
          // Espera a onRuntimeInitialized
          window.cv.onRuntimeInitialized = () => {
            console.log("OpenCV.js listo");
            setReady(true);
          };
        }
      } else {
        setTimeout(waitForCV, 100);
      }
    };

    waitForCV();
  }, []);

  return ready;
}