// Atajo para pegar una foto en la subida, como lo escribe cada sistema. Lo usan los recuadros de subida y el aviso
// de que se pueden soltar o pegar las dos fotos a la vez
export const ATAJO_PEGAR = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform || '')
  ? '⌘V'
  : 'Ctrl+V';
