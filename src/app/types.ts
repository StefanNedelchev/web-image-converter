export interface Item {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  width?: number;
  height?: number;
  status: 'ready' | 'converting' | 'done' | 'error';
  error?: string;
  output?: {
    blob: Blob;
    type: string;
    name: string;
    size: number;
    width: number;
    height: number;
  };
}

export type Canvas = OffscreenCanvas | HTMLCanvasElement;

export interface OutputDimensions {
  width: number;
  height: number;
}

interface DecodedBitmapImage extends OutputDimensions {
  kind: 'bitmap';
  bmp: ImageBitmap;
}

interface DecodedImgElement extends OutputDimensions {
  kind: 'img';
  img: HTMLImageElement;
}

export type DecodedImage = DecodedBitmapImage | DecodedImgElement;

export interface DrawRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface ConversionOptions {
  type: string;
  quality: number;
  sizeMode: 'none' | 'pixels' | 'scale';
  w: number;
  h: number;
  scalePct: number;
  fit: 'keep' | 'contain' | 'cover' | 'stretch';
  bg: string;
  smoothing: boolean;
  smoothingQuality: 'low' | 'medium' | 'high';
  bmpResizeQuality: 'off' | ResizeQuality;
}
