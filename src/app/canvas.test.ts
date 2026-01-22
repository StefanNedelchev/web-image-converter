import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeCanvas, canvasToBlob, decodeImage, detectExportFormats } from './canvas';

describe('canvas', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('makeCanvas', () => {
    it('should create canvas with correct dimensions', () => {
      const canvas = makeCanvas(100, 200);
      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(200);
    });

    it('should create HTMLCanvasElement when OffscreenCanvas not available', () => {
      vi.stubGlobal('OffscreenCanvas', undefined);

      const canvas = makeCanvas(50, 50);
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    });

    it('should handle zero dimensions', () => {
      const canvas = makeCanvas(0, 0);
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
    });
  });

  describe('canvasToBlob', () => {
    it('should convert HTMLCanvasElement to blob', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d');
      ctx?.fillRect(0, 0, 10, 10);

      const blob = await canvasToBlob(canvas, 'image/png', 1);

      expect(blob).toBeInstanceOf(Blob);
      // happy-dom doesn't encode properly, so we just verify blob is returned
    });

    it('should handle OffscreenCanvas with convertToBlob for JPEG', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const mockCanvas = {
        width: 10,
        height: 10,
        convertToBlob: vi.fn().mockResolvedValue(mockBlob),
      };

      const blob = await canvasToBlob(mockCanvas as never, 'image/jpeg', 0.9);

      expect(blob).toBe(mockBlob);
      expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({ type: 'image/jpeg', quality: 0.9 });
    });

    it('should handle OffscreenCanvas without quality for PNG', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockCanvas = {
        width: 10,
        height: 10,
        convertToBlob: vi.fn().mockResolvedValue(mockBlob),
      };

      const blob = await canvasToBlob(mockCanvas as never, 'image/png', 1);

      expect(blob).toBe(mockBlob);
      // PNG is not in QUALITY_MIMES, so quality is not included
      expect(mockCanvas.convertToBlob).toHaveBeenCalledWith({ type: 'image/png' });
    });

    it('should reject on encoding failure', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;

      // Mock toBlob to return null
      const originalToBlob = canvas.toBlob.bind(canvas);
      canvas.toBlob = function (callback) {
        callback(null);
      };

      await expect(canvasToBlob(canvas, 'image/png', 1)).rejects.toThrow('Canvas encoding failed');

      canvas.toBlob = originalToBlob;
    });

    it('should use quality parameter for lossy formats with HTMLCanvas', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;

      const toBlobSpy = vi.spyOn(canvas, 'toBlob');
      await canvasToBlob(canvas, 'image/webp', 0.75);

      // Verify toBlob was called with quality for lossy format
      expect(toBlobSpy).toHaveBeenCalled();
      const call = toBlobSpy.mock.calls[0];
      expect(call?.[1]).toBe('image/webp');
      expect(call?.[2]).toBe(0.75);
    });

    it('should not pass quality parameter for PNG with HTMLCanvas', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;

      const toBlobSpy = vi.spyOn(canvas, 'toBlob');
      await canvasToBlob(canvas, 'image/png', 1);

      // Verify toBlob was called without quality for lossless format
      expect(toBlobSpy).toHaveBeenCalled();
      const call = toBlobSpy.mock.calls[0];
      expect(call?.[1]).toBe('image/png');
      expect(call?.[2]).toBeUndefined();
    });
  });

  describe('decodeImage', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
      });
    });

    it.skip('should decode image using createImageBitmap when available', async () => {
      // Skipping: difficult to test due to module-level supports constant
      // The actual implementation is tested in conversion.test.ts via integration
    });

    it('should fall back to Image element when createImageBitmap unavailable', async () => {
      vi.stubGlobal('createImageBitmap', undefined);

      const file = new File(['fake image data'], 'test.png', { type: 'image/png' });

      class MockImage {
        naturalWidth = 150;
        naturalHeight = 250;
        src = '';
        decoding = 'auto';

        decode() {
          return Promise.resolve();
        }
      }

      vi.stubGlobal('Image', MockImage as never);

      const result = await decodeImage(file);

      expect(result.kind).toBe('img');
      expect(result.width).toBe(150);
      expect(result.height).toBe(250);
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should revoke object URL after loading image', async () => {
      vi.stubGlobal('createImageBitmap', undefined);

      const file = new File(['fake image data'], 'test.png', { type: 'image/png' });

      class MockImage {
        naturalWidth = 100;
        naturalHeight = 100;
        src = '';
        decoding = 'auto';

        decode() {
          return Promise.resolve();
        }
      }

      vi.stubGlobal('Image', MockImage as never);

      await decodeImage(file);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('detectExportFormats', () => {
    it('should return empty array when context is not available', async () => {
      const mockCanvas = {
        width: 2,
        height: 2,
        getContext: vi.fn(() => null),
      };
      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockCanvas as never);

      const formats = await detectExportFormats();
      expect(formats).toEqual([]);
    });

    it('should detect supported export formats', async () => {
      const formats = await detectExportFormats();

      // Should return an array (actual formats depend on environment)
      expect(Array.isArray(formats)).toBe(true);
    });
  });
});
