import { describe, expect, it } from 'vitest';

import {
  computeBatteryAttractionOffset,
  createTesseractLineGeometry,
  createTesseractVertices,
  resolveBatteryAnchorPosition,
  TESSERACT_EDGES,
} from '@/features/hud/model/tesseract-geometry';

describe('tesseract geometry helpers', () => {
  it('resolves battery anchor from canvas and icon rects', () => {
    const position = resolveBatteryAnchorPosition(
      new DOMRect(0, 0, 200, 100),
      new DOMRect(20, 30, 20, 20),
    );

    expect(position).not.toBeNull();
    expect(position?.x).toBeGreaterThan(-1);
    expect(position?.x).toBeLessThan(1);
    expect(position?.y).toBeGreaterThan(-1);
    expect(position?.y).toBeLessThan(1);
  });

  it('computes attraction offset toward the projected tesseract point', () => {
    const offset = computeBatteryAttractionOffset({
      tesseractScreen: { x: 120, y: 60 },
      iconRect: new DOMRect(40, 40, 20, 20),
      currentOffset: { x: 0, y: 0 },
    });

    expect(offset.x).toBeGreaterThan(0);
    expect(Math.abs(offset.y)).toBeLessThan(14);
  });

  it('creates the full 16-vertex, 32-edge tesseract topology', () => {
    const vertices = createTesseractVertices();
    const geometry = createTesseractLineGeometry();

    expect(vertices).toHaveLength(16);
    expect(TESSERACT_EDGES).toHaveLength(32);
    expect(geometry.getAttribute('position').count).toBe(64);
    geometry.dispose();
  });
});
