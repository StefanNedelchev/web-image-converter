import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertImage } from './conversion';
import type { Item, ConversionOptions } from './types';
import * as canvasModule from './canvas';

describe('conversion', () => {
  let mockItem: Item;
  let mockOptions: ConversionOptions;

  beforeEach(() => {
    mockItem = {
      id: '1',
      file: new File(['test'], 'test.png', { type: 'image/png' }),
      name: 'test.png',
      type: 'image/png',
      size: 1000,
      status: 'ready',
    };

    mockOptions = {
      type: 'image/png',
      quality: 0.9,
      sizeMode: 'none',
      w: 0,
      h: 0,
      scalePct: 100,
      fit: 'keep',
      bg: '#FFFFFF',
      smoothing: true,
      smoothingQuality: 'high',
      bmpResizeQuality: 'off',
    };

    // Mock canvas operations
    vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
      kind: 'bitmap',
      bmp: {
        width: 100,
        height: 100,
        close: vi.fn(),
      } as never,
      width: 100,
      height: 100,
    });

    vi.spyOn(canvasModule, 'makeCanvas').mockReturnValue({
      width: 100,
      height: 100,
      getContext: vi.fn(() => ({
        fillStyle: '',
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        drawImage: vi.fn(),
      })),
    } as never);

    vi.spyOn(canvasModule, 'canvasToBlob').mockResolvedValue(
      new Blob(['mock'], { type: 'image/png' }),
    );
  });

  describe('convertImage', () => {
    it('should convert image successfully with keep mode', async () => {
      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      expect(mockItem.output).toBeDefined();
      expect(mockItem.output?.width).toBe(100);
      expect(mockItem.output?.height).toBe(100);
      expect(mockItem.error).toBeUndefined();
    });

    it('should set status to converting at start', async () => {
      const promise = convertImage(mockItem, mockOptions);
      expect(mockItem.status).toBe('converting');
      await promise;
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockRejectedValue(new Error('Decode failed'));

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('error');
      expect(mockItem.error).toBe('Decode failed');
    });

    it('should scale image when sizeMode is scale', async () => {
      mockOptions.sizeMode = 'scale';
      mockOptions.scalePct = 50;

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      expect(mockItem.output?.width).toBe(50);
      expect(mockItem.output?.height).toBe(50);
    });

    it('should resize to specific width maintaining aspect ratio', async () => {
      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 200;
      mockOptions.h = 0;

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      expect(mockItem.output?.width).toBe(200);
      expect(mockItem.output?.height).toBe(200);
    });

    it('should resize to specific height maintaining aspect ratio', async () => {
      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 0;
      mockOptions.h = 150;

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      expect(mockItem.output?.width).toBe(150);
      expect(mockItem.output?.height).toBe(150);
    });

    it('should resize to both width and height when specified', async () => {
      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 200;
      mockOptions.h = 300;

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      expect(mockItem.output?.width).toBe(200);
      expect(mockItem.output?.height).toBe(300);
    });

    it('should handle stretch fit mode', async () => {
      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 200;
      mockOptions.h = 100;
      mockOptions.fit = 'stretch';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
    });

    it('should handle contain fit mode', async () => {
      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 200;
      mockOptions.h = 100;
      mockOptions.fit = 'contain';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
    });

    it('should handle cover fit mode', async () => {
      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 200;
      mockOptions.h = 100;
      mockOptions.fit = 'cover';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
    });

    it('should fill background when converting to JPEG', async () => {
      mockOptions.type = 'image/jpeg';
      mockOptions.bg = '#FF0000';

      const mockContext = {
        fillStyle: '',
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        drawImage: vi.fn(),
      };

      vi.spyOn(canvasModule, 'makeCanvas').mockReturnValue({
        width: 100,
        height: 100,
        getContext: vi.fn(() => mockContext),
      } as never);

      await convertImage(mockItem, mockOptions);

      expect(mockContext.fillStyle).toBe('#FF0000');
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should clear rect for non-JPEG formats', async () => {
      mockOptions.type = 'image/png';

      const mockContext = {
        fillStyle: '',
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        drawImage: vi.fn(),
      };

      vi.spyOn(canvasModule, 'makeCanvas').mockReturnValue({
        width: 100,
        height: 100,
        getContext: vi.fn(() => mockContext),
      } as never);

      await convertImage(mockItem, mockOptions);

      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should handle image smoothing settings', async () => {
      mockOptions.smoothing = false;

      const mockContext = {
        fillStyle: '',
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'high',
        drawImage: vi.fn(),
      };

      vi.spyOn(canvasModule, 'makeCanvas').mockReturnValue({
        width: 100,
        height: 100,
        getContext: vi.fn(() => mockContext),
      } as never);

      await convertImage(mockItem, mockOptions);

      expect(mockContext.imageSmoothingEnabled).toBe(false);
    });

    it('should generate output filename with correct extension', async () => {
      mockItem.name = 'photo.jpg';
      mockOptions.type = 'image/webp';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.output?.name).toBe('photo.webp');
    });

    it('should sanitize output filename', async () => {
      mockItem.name = 'my:photo?.jpg';
      mockOptions.type = 'image/png';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.output?.name).toBe('my_photo_.png');
    });

    it('should handle context creation failure', async () => {
      vi.spyOn(canvasModule, 'makeCanvas').mockReturnValue({
        width: 100,
        height: 100,
        getContext: vi.fn(() => null),
      } as never);

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('error');
      expect(mockItem.error).toBe('2D canvas context not available.');
    });

    it('should handle non-bitmap decoded images', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'img',
        img: {
          naturalWidth: 100,
          naturalHeight: 100,
        } as never,
        width: 100,
        height: 100,
      });

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
    });

    it('should clamp scale percentage between 1 and 1000', async () => {
      mockOptions.sizeMode = 'scale';
      mockOptions.scalePct = 5000; // Over limit

      await convertImage(mockItem, mockOptions);

      // Should be clamped to 1000%, which is 10x
      expect(mockItem.output?.width).toBe(1000);
      expect(mockItem.output?.height).toBe(1000);
    });

    it('should handle rectangular source images with contain fit', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'bitmap',
        bmp: {
          width: 200,
          height: 100,
          close: vi.fn(),
        } as never,
        width: 200,
        height: 100,
      });

      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 100;
      mockOptions.h = 100;
      mockOptions.fit = 'contain';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
    });

    it('should handle rectangular source images with cover fit', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'bitmap',
        bmp: {
          width: 200,
          height: 100,
          close: vi.fn(),
        } as never,
        width: 200,
        height: 100,
      });

      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 100;
      mockOptions.h = 100;
      mockOptions.fit = 'cover';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
    });

    it('should handle bitmap resize with high quality when enabled', async () => {
      const mockBitmap = {
        width: 100,
        height: 100,
        close: vi.fn(),
      };
      const mockResizedBitmap = {
        width: 50,
        height: 50,
        close: vi.fn(),
      };

      vi.stubGlobal('createImageBitmap', vi.fn()
        .mockResolvedValueOnce(mockBitmap)
        .mockResolvedValueOnce(mockResizedBitmap));

      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'bitmap',
        bmp: mockBitmap as never,
        width: 100,
        height: 100,
      });

      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 50;
      mockOptions.h = 50;
      mockOptions.fit = 'stretch';
      mockOptions.bmpResizeQuality = 'high';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      expect(mockBitmap.close).toHaveBeenCalled();
    });

    it('should handle tall rectangular images with contain fit', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'bitmap',
        bmp: {
          width: 100,
          height: 200,
          close: vi.fn(),
        } as never,
        width: 100,
        height: 200,
      });

      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 100;
      mockOptions.h = 100;
      mockOptions.fit = 'contain';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
    });

    it('should handle tall rectangular images with cover fit', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'bitmap',
        bmp: {
          width: 100,
          height: 200,
          close: vi.fn(),
        } as never,
        width: 100,
        height: 200,
      });

      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 100;
      mockOptions.h = 100;
      mockOptions.fit = 'cover';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
    });

    it('should handle low scale percentage clamping', async () => {
      mockOptions.sizeMode = 'scale';
      mockOptions.scalePct = 0.5; // Below minimum of 1

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      // Should clamp to 1%, resulting in 1x1 image (minimum)
      expect(mockItem.output?.width).toBe(1);
      expect(mockItem.output?.height).toBe(1);
    });

    it('should handle keep fit mode with matching dimensions', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'bitmap',
        bmp: {
          width: 100,
          height: 100,
          close: vi.fn(),
        } as never,
        width: 100,
        height: 100,
      });

      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 100;
      mockOptions.h = 100;
      mockOptions.fit = 'keep';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      expect(mockItem.output?.width).toBe(100);
      expect(mockItem.output?.height).toBe(100);
    });

    it('should convert keep to stretch when dimensions do not match', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'bitmap',
        bmp: {
          width: 100,
          height: 100,
          close: vi.fn(),
        } as never,
        width: 100,
        height: 100,
      });

      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 200;
      mockOptions.h = 150;
      mockOptions.fit = 'keep';

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      // Should stretch to new dimensions
      expect(mockItem.output?.width).toBe(200);
      expect(mockItem.output?.height).toBe(150);
    });

    it('should handle no destination dimensions', async () => {
      mockOptions.sizeMode = 'pixels';
      mockOptions.w = 0;
      mockOptions.h = 0;

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      // Should keep original dimensions
      expect(mockItem.output?.width).toBe(100);
      expect(mockItem.output?.height).toBe(100);
    });

    it('should handle non-Error exceptions', async () => {
      vi.spyOn(canvasModule, 'decodeImage').mockRejectedValue('String error');

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('error');
      expect(mockItem.error).toBe('String error');
    });

    it('should close bitmap after drawing', async () => {
      const mockClose = vi.fn();
      vi.spyOn(canvasModule, 'decodeImage').mockResolvedValue({
        kind: 'bitmap',
        bmp: {
          width: 100,
          height: 100,
          close: mockClose,
        } as never,
        width: 100,
        height: 100,
      });

      await convertImage(mockItem, mockOptions);

      expect(mockItem.status).toBe('done');
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
