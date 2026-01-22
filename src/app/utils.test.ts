import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  safeFilename,
  escapeHtml,
  extFromMime,
  formatBytes,
  clamp,
  downloadBlob,
} from './utils';

describe('utils', () => {
  describe('safeFilename', () => {
    it('should remove invalid characters from filename', () => {
      expect(safeFilename('file:name*test?.txt')).toBe('file_name_test_.txt');
    });

    it('should replace backslashes and forward slashes', () => {
      expect(safeFilename('path/to\\file.txt')).toBe('path_to_file.txt');
    });

    it('should replace angle brackets and pipes', () => {
      expect(safeFilename('file<>|name.txt')).toBe('file_name.txt');
    });

    it('should handle filenames with no invalid characters', () => {
      expect(safeFilename('valid-filename_123.txt')).toBe('valid-filename_123.txt');
    });

    it('should handle empty strings', () => {
      expect(safeFilename('')).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const output = escapeHtml(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toContain('&amp;');
    });

    it('should not escape quotes (textContent behavior)', () => {
      const input = 'He said "Hello"';
      const output = escapeHtml(input);
      expect(output).toBe('He said "Hello"');
    });

    it('should handle text without special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('extFromMime', () => {
    it('should return "jpg" for image/jpeg', () => {
      expect(extFromMime('image/jpeg')).toBe('jpg');
    });

    it('should return "png" for image/png', () => {
      expect(extFromMime('image/png')).toBe('png');
    });

    it('should return "webp" for image/webp', () => {
      expect(extFromMime('image/webp')).toBe('webp');
    });

    it('should return "avif" for image/avif', () => {
      expect(extFromMime('image/avif')).toBe('avif');
    });

    it('should return "img" for unknown MIME types', () => {
      expect(extFromMime('image/unknown')).toBe('img');
      expect(extFromMime('application/octet-stream')).toBe('img');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes without decimals', () => {
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format kilobytes with one decimal', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2048)).toBe('2.0 KB');
    });

    it('should format megabytes with one decimal', () => {
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
    });

    it('should format gigabytes with one decimal', () => {
      expect(formatBytes(1073741824)).toBe('1.0 GB');
      expect(formatBytes(2147483648)).toBe('2.0 GB');
    });

    it('should handle large values without exceeding GB', () => {
      expect(formatBytes(10737418240)).toBe('10.0 GB');
    });
  });

  describe('clamp', () => {
    it('should return the value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should clamp to minimum value', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 10)).toBe(0);
    });

    it('should clamp to maximum value', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, 0, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it('should handle decimal values', () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(1.5, 0, 1)).toBe(1);
    });
  });

  describe('downloadBlob', () => {
    let createdElements: HTMLAnchorElement[] = [];

    beforeEach(() => {
      createdElements = [];
    });

    afterEach(() => {
      createdElements.forEach((el) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });

    it('should create and trigger download link', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      // Element is immediately removed after click
      expect(() => { downloadBlob(blob, filename) }).not.toThrow();
    });

    it('should set correct download attribute', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const filename = 'myfile.txt';

      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const originalCreateElement = document.createElement;
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement.call(document, tagName);
        if (tagName === 'a') {
          createdElements.push(element as HTMLAnchorElement);
        }
        return element;
      });

      downloadBlob(blob, filename);

      createElementSpy.mockRestore();

      const lastAnchor = createdElements[createdElements.length - 1];
      expect(lastAnchor?.download).toBe(filename);
    });

    it('should create blob URL', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });

      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const originalCreateElement = document.createElement;
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement.call(document, tagName);
        if (tagName === 'a') {
          createdElements.push(element as HTMLAnchorElement);
        }
        return element;
      });

      downloadBlob(blob, 'test.txt');

      createElementSpy.mockRestore();

      const lastAnchor = createdElements[createdElements.length - 1];
      expect(lastAnchor?.href).toMatch(/^blob:/);
    });
  });
});
