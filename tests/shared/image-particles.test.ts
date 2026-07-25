import { describe, expect, it } from 'vitest';

import {
  buildImageParticleFrame,
  createImageParticleIntroFrame,
  easeImageParticleProgress,
  IMAGE_PARTICLE_DEFAULT_POINT_SIZE,
  imageParticleSourceCacheKey,
  nextImageParticleSequenceIndex,
  resolveImageParticleSampleSize,
  sampleImageParticlePixels,
} from '@/shared/lib/image-particles';

function pixels(
  values: ReadonlyArray<readonly [number, number, number, number]>,
): Uint8ClampedArray {
  return new Uint8ClampedArray(values.flatMap((value) => [...value]));
}

describe('image particle sampling', () => {
  it('culls transparent pixels and respects the particle limit', () => {
    const source = pixels([
      [255, 0, 0, 255],
      [0, 255, 0, 0],
      [0, 0, 255, 255],
      [255, 255, 255, 255],
    ]);

    const sampled = sampleImageParticlePixels(source, 2, 2, 2);

    expect(sampled.count).toBe(2);
    expect(sampled.positions).toHaveLength(6);
    expect(sampled.alphas).toHaveLength(2);
    expect([...sampled.alphas]).toEqual([1, 1]);
    expect([...sampled.positions].every(Number.isFinite)).toBe(true);
  });

  it('pads sparse targets with invisible deterministic particles', () => {
    const source = pixels([
      [128, 64, 32, 255],
      [0, 0, 0, 0],
    ]);

    const first = sampleImageParticlePixels(source, 2, 1, 4);
    const second = sampleImageParticlePixels(source, 2, 1, 4);

    expect(first.count).toBe(1);
    expect([...first.alphas]).toEqual([1, 0, 0, 0]);
    expect([...first.positions]).toEqual([...second.positions]);
    expect([...first.seeds]).toEqual([...second.seeds]);
  });

  it('places sampled particles on a uniform image grid', () => {
    const source = pixels(
      Array.from({ length: 36 }, () => [255, 255, 255, 255] as const),
    );

    const sampled = sampleImageParticlePixels(source, 6, 6, 9);
    const xCoordinates = Array.from(
      { length: sampled.count },
      (_, index) => sampled.positions[index * 3],
    );
    const yCoordinates = Array.from(
      { length: sampled.count },
      (_, index) => sampled.positions[index * 3 + 1],
    );
    const uniqueX = [...new Set(xCoordinates)];
    const uniqueY = [...new Set(yCoordinates)];

    expect(sampled.count).toBe(9);
    expect(uniqueX).toHaveLength(3);
    expect(uniqueY).toHaveLength(3);
    expect(uniqueX[1] - uniqueX[0]).toBeCloseTo(uniqueX[2] - uniqueX[1]);
    expect(uniqueY[0] - uniqueY[1]).toBeCloseTo(uniqueY[1] - uniqueY[2]);
  });
});

describe('image particle colors and intro', () => {
  const sampled = sampleImageParticlePixels(
    pixels([[240, 120, 60, 255]]),
    1,
    1,
    2,
  );

  it('supports source colors and normal/inverted tint colors', () => {
    const sourceFrame = buildImageParticleFrame(sampled, { mode: 'source' }, false);
    const normalTint = buildImageParticleFrame(sampled, {
      mode: 'tint',
      normal: '#888',
      inverted: '#444444',
    }, false);
    const invertedTint = buildImageParticleFrame(sampled, {
      mode: 'tint',
      normal: '#888',
      inverted: '#444444',
    }, true);

    expect(sourceFrame.colors[0]).toBeCloseTo(240 / 255);
    expect(sourceFrame.colors[1]).toBeCloseTo(120 / 255);
    expect(sourceFrame.colors[2]).toBeCloseTo(60 / 255);
    expect(normalTint.colors[0]).toBeCloseTo(136 / 255);
    expect(normalTint.colors[1]).toBeCloseTo(136 / 255);
    expect(normalTint.colors[2]).toBeCloseTo(136 / 255);
    expect(invertedTint.colors[0]).toBeCloseTo(68 / 255);
    expect(invertedTint.colors[1]).toBeCloseTo(68 / 255);
    expect(invertedTint.colors[2]).toBeCloseTo(68 / 255);
  });

  it('uses a larger configurable point size with a safe lower bound', () => {
    const defaultFrame = buildImageParticleFrame(sampled, { mode: 'source' }, false);
    const customFrame = buildImageParticleFrame(
      sampled,
      { mode: 'source' },
      false,
      6,
    );
    const clampedFrame = buildImageParticleFrame(
      sampled,
      { mode: 'source' },
      false,
      0,
    );

    expect(defaultFrame.pointSize).toBe(IMAGE_PARTICLE_DEFAULT_POINT_SIZE);
    expect(customFrame.pointSize).toBe(6);
    expect(clampedFrame.pointSize).toBe(1);
  });

  it('starts visible particles near the center with reduced alpha', () => {
    const target = buildImageParticleFrame(sampled, { mode: 'source' }, false);
    const intro = createImageParticleIntroFrame(target);

    expect(Math.hypot(intro.positions[0], intro.positions[1])).toBeLessThan(0.3);
    expect(intro.alphas[0]).toBeGreaterThan(0);
    expect(intro.alphas[0]).toBeLessThan(target.alphas[0]);
    expect([...intro.colors]).toEqual([...target.colors]);
    expect(intro.pointSize).toBe(target.pointSize);
  });
});

describe('image particle sequence helpers', () => {
  it('wraps in order and skips unavailable sources', () => {
    expect(nextImageParticleSequenceIndex(0, 1)).toBe(0);
    expect(nextImageParticleSequenceIndex(0, 3)).toBe(1);
    expect(nextImageParticleSequenceIndex(2, 3)).toBe(0);
    expect(nextImageParticleSequenceIndex(0, 3, new Set([1]))).toBe(2);
    expect(nextImageParticleSequenceIndex(1, 3, new Set([0, 2]))).toBe(1);
  });

  it('uses a bounded cubic easing curve', () => {
    expect(easeImageParticleProgress(-1)).toBe(0);
    expect(easeImageParticleProgress(0.5)).toBe(0.5);
    expect(easeImageParticleProgress(2)).toBe(1);
  });

  it('normalizes sample sizes and isolates cache keys by resolution', () => {
    expect(resolveImageParticleSampleSize(undefined)).toBe(256);
    expect(resolveImageParticleSampleSize(384.9)).toBe(384);
    expect(resolveImageParticleSampleSize(Number.NaN)).toBe(256);
    expect(imageParticleSourceCacheKey({ src: '/image.png', sampleSize: 256 }))
      .not.toBe(imageParticleSourceCacheKey({ src: '/image.png', sampleSize: 384 }));
  });
});
