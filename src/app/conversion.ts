import { supports } from './constants';
import { clamp, safeFilename, extFromMime } from './utils';
import { makeCanvas, canvasToBlob, decodeImage } from './canvas';
import type { ConversionOptions, DrawRect, Item, OutputDimensions } from './types';

/**
 * Compute source and destination rectangles for drawImage based on fit mode
 * @param sourceWidth - Source width
 * @param sourceHeight - Source height
 * @param destWidth - Destination width
 * @param destHeight - Destination height
 * @param mode - Fit mode: 'keep', 'contain', 'cover', or 'stretch'
 * @returns Rectangle coordinates
 */
function computeDrawRects(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
  mode: ConversionOptions['fit'],
): DrawRect {
  // Common rectangle presets to avoid repetition
  const fullSource = { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight };
  const fullDest = { dx: 0, dy: 0, dw: destWidth, dh: destHeight };
  const sourceSize = { dw: sourceWidth, dh: sourceHeight };

  // If no destination dimensions, return source as-is
  if (!destWidth || !destHeight) {
    return { ...fullSource, ...sourceSize, dx: 0, dy: 0 };
  }

  // Adjust mode if dimensions don't match
  let fitMode = mode;
  if (fitMode === 'keep' && (destWidth !== sourceWidth || destHeight !== sourceHeight)) {
    fitMode = 'stretch';
  }

  switch (fitMode) {
    case 'keep':
      return { ...fullSource, ...sourceSize, dx: 0, dy: 0 };
    case 'stretch':
      return { ...fullSource, ...fullDest };
    case 'contain': {
      // Letterbox within destination canvas
      const sourceAspectRatio = sourceWidth / sourceHeight;
      const destAspectRatio = destWidth / destHeight;
      const dw = sourceAspectRatio > destAspectRatio
        ? destWidth
        : Math.round(destHeight * sourceAspectRatio);
      const dh = sourceAspectRatio > destAspectRatio
        ? Math.round(destWidth / sourceAspectRatio)
        : destHeight;
      const dx = Math.floor((destWidth - dw) / 2);
      const dy = Math.floor((destHeight - dh) / 2);
      return { ...fullSource, dx, dy, dw, dh };
    }
    case 'cover':
    default: {
      // Cover: crop source to fill destination
      const sourceAspectRatio = sourceWidth / sourceHeight;
      const destAspectRatio = destWidth / destHeight;
      const sw = sourceAspectRatio > destAspectRatio
        ? Math.round(sourceHeight * destAspectRatio)
        : sourceWidth;
      const sh = sourceAspectRatio > destAspectRatio
        ? sourceHeight
        : Math.round(sourceWidth / destAspectRatio);
      const sx = Math.floor((sourceWidth - sw) / 2);
      const sy = Math.floor((sourceHeight - sh) / 2);
      return { sx, sy, sw, sh, ...fullDest };
    }
  }
}

/**
 * Compute output dimensions based on user options
 * @param sourceWidth - Source width
 * @param sourceHeight - Source height
 * @param options - Options object containing sizeMode, w, h, and scalePct
 * @returns Output dimensions
 */
function computeOutputSize(
  sourceWidth: number,
  sourceHeight: number,
  options: ConversionOptions,
): OutputDimensions {
  // Don't resize mode: keep original dimensions
  if (options.sizeMode === 'none') {
    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  if (options.sizeMode === 'scale') {
    const scale = clamp(options.scalePct, 1, 1000) / 100;
    return {
      width: Math.max(1, Math.round(sourceWidth * scale)),
      height: Math.max(1, Math.round(sourceHeight * scale)),
    };
  }

  // Pixel mode: compute dimensions based on provided width/height
  const aspectRatio = sourceWidth / sourceHeight;
  let width = sourceWidth;
  let height = sourceHeight;

  if (options.w && options.h) {
    width = options.w;
    height = options.h;
  } else if (options.w) {
    width = options.w;
    height = Math.round(options.w / aspectRatio);
  } else if (options.h) {
    width = Math.round(options.h * aspectRatio);
    height = options.h;
  }

  return { width, height };
}

/**
 * Optionally resize bitmap using createImageBitmap for better quality
 * @param bmp - Source bitmap
 * @param sourceWidth - Source width
 * @param sourceHeight - Source height
 * @param destWidth - Destination width
 * @param destHeight - Destination height
 * @param options - Options object containing bmpResizeQuality and fit
 * @returns Original or resized bitmap
 */
async function maybeResizeBitmap(
  bmp: ImageBitmap,
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
  options: ConversionOptions,
): Promise<ImageBitmap> {
  if (!supports.createImageBitmap) {
    return bmp;
  }
  if (options.bmpResizeQuality === 'off') {
    return bmp;
  }
  const resizeQuality = options.bmpResizeQuality;
  if (options.fit === 'cover' || options.fit === 'contain') {
    return bmp;
  }
  if (destWidth === sourceWidth && destHeight === sourceHeight) {
    return bmp;
  }

  const resized = await createImageBitmap(bmp, {
    resizeWidth: destWidth,
    resizeHeight: destHeight,
    resizeQuality,
  });
  bmp.close();
  return resized;
}

/**
 * Convert a single image item
 * @param item - Item to convert
 * @param options - Conversion options
 * @returns Promise<void>
 */
export async function convertImage(item: Item, options: ConversionOptions): Promise<void> {
  item.status = 'converting';
  item.error = undefined;

  try {
    const decoded = await decodeImage(item.file);
    let sourceWidth = decoded.width;
    let sourceHeight = decoded.height;

    // Determine output dimensions.
    const {
      width: destWidth,
      height: destHeight,
    } = computeOutputSize(sourceWidth, sourceHeight, options);

    const canvas = makeCanvas(destWidth, destHeight);
    const ctx = canvas.getContext('2d', {
      alpha: true,
      colorSpace: 'srgb',
    }) as CanvasRenderingContext2D | null;

    if (!ctx) {
      throw new Error('2D canvas context not available.');
    }

    // If exporting to JPEG, fill background (JPEG has no alpha).
    if (options.type === 'image/jpeg') {
      ctx.fillStyle = options.bg;
      ctx.fillRect(0, 0, destWidth, destHeight);
    } else {
      ctx.clearRect(0, 0, destWidth, destHeight);
    }

    ctx.imageSmoothingEnabled = options.smoothing;
    if (ctx.imageSmoothingEnabled && 'imageSmoothingQuality' in ctx) {
      ctx.imageSmoothingQuality = options.smoothingQuality;
    }

    let drawSource = decoded;
    if (decoded.kind === 'bitmap') {
      const resized = await maybeResizeBitmap(
        decoded.bmp,
        sourceWidth,
        sourceHeight,
        destWidth,
        destHeight,
        options,
      );
      if (resized !== decoded.bmp) {
        drawSource = {
          kind: 'bitmap',
          bmp: resized,
          width: resized.width,
          height: resized.height,
        };
        sourceWidth = resized.width;
        sourceHeight = resized.height;
      }
    }

    const rect = computeDrawRects(
      sourceWidth,
      sourceHeight,
      destWidth,
      destHeight,
      options.fit,
    );
    ctx.drawImage(
      drawSource.kind === 'bitmap' ? drawSource.bmp : drawSource.img,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      rect.dx,
      rect.dy,
      rect.dw,
      rect.dh,
    );

    if (drawSource.kind === 'bitmap') {
      drawSource.bmp.close();
    }

    const blob = await canvasToBlob(canvas, options.type, options.quality);

    const base = safeFilename(item.name.replace(/\.[^.]+$/, ''));
    const outputName = `${base}.${extFromMime(options.type)}`;

    item.output = {
      blob,
      type: blob.type,
      name: outputName,
      size: blob.size,
      width: destWidth,
      height: destHeight,
    };
    item.status = 'done';
  } catch (error) {
    item.status = 'error';
    item.error = error instanceof Error ? error.message : String(error);
  }
}
