import { useEffect, useRef, useState } from 'react';

const SIN_ARRASTRE = { active: false, count: 0 };

// Deja soltar o pegar fotos en cualquier parte de la página, no solo dentro de los recuadros.
// Sin esto, el navegador abre la foto que se suelta fuera de un recuadro y se pierde lo que ya se había subido.
// onFiles(files, side) recibe los archivos y la tarjeta en la que se soltaron ('front', 'back' o null si fue fuera).
// Devuelve si se está arrastrando algo por encima y cuántos archivos son (0 si el navegador no lo dice)
export function usePageFileDrop(onFiles) {
  const [drag, setDrag] = useState(SIN_ARRASTRE);
  const onFilesRef = useRef(onFiles);

  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    const llevaArchivos = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');
    const dentro = new Set();
    let vigilante = null;

    const terminar = () => {
      dentro.clear();
      clearTimeout(vigilante);
      setDrag(SIN_ARRASTRE);
    };

    // Algunos navegadores no siempre avisan al salir de la ventana. Si deja de llegar dragover, se da por terminado
    const vigilar = () => {
      clearTimeout(vigilante);
      vigilante = setTimeout(terminar, 1500);
    };

    const onDragEnter = (event) => {
      if (!llevaArchivos(event)) return;
      event.preventDefault();
      dentro.add(event.target);
      const count = event.dataTransfer.items?.length || 0;
      setDrag((prev) => (prev.active && prev.count === count ? prev : { active: true, count }));
      vigilar();
    };

    const onDragOver = (event) => {
      if (!llevaArchivos(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      vigilar();
    };

    const onDragLeave = (event) => {
      if (!llevaArchivos(event)) return;
      dentro.delete(event.target);
      if (dentro.size === 0) terminar();
    };

    const onDrop = (event) => {
      if (!llevaArchivos(event)) return;
      event.preventDefault();
      terminar();
      const files = Array.from(event.dataTransfer.files || []);
      if (!files.length) return;
      const tarjeta = event.target instanceof Element ? event.target.closest('[data-upload-side]') : null;
      onFilesRef.current(files, tarjeta?.dataset.uploadSide || null);
    };

    const onPaste = (event) => {
      // Si se está escribiendo en un campo, lo pegado es para él
      if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"]')) return;
      const files = Array.from(event.clipboardData?.files || []);
      if (!files.length) return;
      event.preventDefault();
      onFilesRef.current(files, null);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      clearTimeout(vigilante);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  return drag;
}
