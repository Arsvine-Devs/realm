import { describe, expect, it } from 'vitest';

import { clamp, isAtRest, lerp, lowPass } from '@/features/hud/model/raf-lerp';

describe('rAF math helpers', () => {
  it('interpolates in both directions and preserves endpoints', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 0, 0.5)).toBe(5);
  });

  it('clamps values while preserving both bounds', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('applies the low-pass endpoints and midpoint', () => {
    expect(lowPass(0, 10, 0.5)).toBe(5);
    expect(lowPass(99, 10, 1)).toBe(10);
    expect(lowPass(99, 10, 0)).toBe(99);
  });

  it('uses the default and explicit rest thresholds', () => {
    expect(isAtRest(1.0, 1.04)).toBe(true);
    expect(isAtRest(1.0, 1.5)).toBe(false);
    expect(isAtRest(1.0, 1.5, 1)).toBe(true);
  });
});
