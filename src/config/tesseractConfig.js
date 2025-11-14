export const TESSERACT_CONFIG = {
  /**
   * For now we rely on the official CDN assets to avoid bundler issues when
   * Tesseract tries to spawn its worker from Vite's dev server.
   * These URLs expose ES module compatible builds.
   */
  workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/worker.min.js',
  corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/dist/tesseract-core.wasm.js',
  langPath: 'https://tessdata.projectnaptha.com/4.0.0', // hosts the *.traineddata files
};
