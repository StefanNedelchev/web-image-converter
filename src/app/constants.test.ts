import { describe, it, expect } from 'vitest';
import { supports } from './constants';

describe('constants', () => {
  describe('supports', () => {
    it('should have createImageBitmap property', () => {
      expect(supports).toHaveProperty('createImageBitmap');
    });

    it('should have offscreenCanvas property', () => {
      expect(supports).toHaveProperty('offscreenCanvas');
    });

    it('should have boolean values', () => {
      expect(typeof supports.createImageBitmap).toBe('boolean');
      expect(typeof supports.offscreenCanvas).toBe('boolean');
    });

    it('should detect createImageBitmap correctly', () => {
      const hasCreateImageBitmap = typeof createImageBitmap === 'function';
      expect(supports.createImageBitmap).toBe(hasCreateImageBitmap);
    });

    it('should detect OffscreenCanvas correctly', () => {
      const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
      expect(supports.offscreenCanvas).toBe(hasOffscreenCanvas);
    });
  });
});
