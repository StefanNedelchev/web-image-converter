export const QUALITY_MIMES = new Set([
  'image/jpeg',
  'image/webp',
  'image/avif',
]);

export const CANDIDATE_EXPORT_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
];

/** Browser API support detection */
export const supports = {
  createImageBitmap: typeof createImageBitmap === 'function',
  offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
};
