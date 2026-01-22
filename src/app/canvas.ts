import { supports, QUALITY_MIMES, CANDIDATE_EXPORT_MIMES } from './constants';
import type { Canvas, DecodedImage } from './types';

/**
 * Create a canvas (OffscreenCanvas if supported, otherwise HTMLCanvasElement)
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Canvas instance
 */
export function makeCanvas(width: number, height: number): Canvas {
  if (supports.offscreenCanvas) {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Convert canvas to Blob with optional quality
 * @param canvas - Canvas to convert
 * @param type - MIME type for output
 * @param quality - Quality (0-1) for lossy formats
 * @returns Resulting blob
 */
export async function canvasToBlob(
  canvas: Canvas,
  type: string,
  quality: number,
): Promise<Blob> {
  // OffscreenCanvas path
  if ('convertToBlob' in canvas) {
    const opts = QUALITY_MIMES.has(type)
      ? { type, quality }
      : { type };
    return await (canvas).convertToBlob(opts);
  }
  // HTMLCanvasElement fallback
  const htmlCanvas = canvas;
  return await new Promise((resolve, reject) => {
    const qualityParam = QUALITY_MIMES.has(type) ? quality : undefined;
    htmlCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas encoding failed.'));
        }
      },
      type,
      qualityParam,
    );
  });
}

/**
 * Decode image file to bitmap or HTMLImageElement
 * @param file - Image file to decode
 */
export async function decodeImage(file: File): Promise<DecodedImage> {
  // Fast decode path
  if (supports.createImageBitmap) {
    // imageOrientation: from-image is supported by many modern browsers; ignored if unsupported.
    const bmp = await createImageBitmap(file, {
      imageOrientation: 'from-image',
      colorSpaceConversion: 'default',
    });
    return {
      kind: 'bitmap',
      bmp,
      width: bmp.width,
      height: bmp.height,
    };
  }

  // Fallback (still modern-ish)
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return {
      kind: 'img',
      img,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Detect which image formats the browser can export
 * @returns Array of supported MIME types
 */
export async function detectExportFormats(): Promise<string[]> {
  const canvas = makeCanvas(2, 2);
  const ctx = canvas.getContext('2d', {
    alpha: true,
  }) as CanvasRenderingContext2D | null;
  if (!ctx) {
    return [];
  }
  ctx.fillStyle = 'rgba(255,0,0,0.5)';
  ctx.fillRect(0, 0, 2, 2);

  const supported: string[] = [];
  for (const mime of CANDIDATE_EXPORT_MIMES) {
    try {
      const blob = await canvasToBlob(canvas, mime, 0.9);
      if (blob.size > 0 && blob.type === mime) {
        supported.push(mime);
      }
    } catch {
      /* not supported */
    }
  }
  return supported;
}
