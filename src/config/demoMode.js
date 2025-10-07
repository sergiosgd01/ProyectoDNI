export const DEMO_MODE = {
  enabled: true, // 👈 Cambia a false para modo normal
  
  timings: {
    uploadDelay: 800,
    captureDelay: 500,
    processingSteps: 4000, 
    stepInterval: 600,
  },
  
  images: {
    frontProcessed: '/demo/front-image.jpg',  
    backProcessed: '/demo/back-image.jpg',     
  },

  processingSteps: [
    { id: 1, label: 'Detectando bordes del documento...', progress: 20 },
    { id: 2, label: 'Corrigiendo perspectiva y rotación...', progress: 40 },
    { id: 3, label: 'Mejorando calidad de imagen...', progress: 60 },
    { id: 4, label: 'Ajustando brillo y contraste...', progress: 80 },
    { id: 5, label: 'Finalizando procesamiento...', progress: 100 },
  ]
};