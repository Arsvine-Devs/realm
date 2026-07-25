export type ImageParticleRgb = readonly [number, number, number];

export type ImageParticleColor =
  | { mode: 'source' }
  | { mode: 'tint'; normal: string; inverted: string };

export interface ImageParticleSource {
  src: string;
  color: ImageParticleColor;
  pointSize?: number;
  sampleSize?: number;
}

export interface SampledImageParticles {
  readonly count: number;
  readonly positions: Float32Array;
  readonly sourceColors: Float32Array;
  readonly alphas: Float32Array;
  readonly seeds: Float32Array;
}

export interface ImageParticleFrame {
  readonly count: number;
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly alphas: Float32Array;
  readonly seeds: Float32Array;
  readonly pointSize: number;
}

export const IMAGE_PARTICLE_LIMIT = 6000;
export const IMAGE_PARTICLE_DEFAULT_SAMPLE_SIZE = 256;
export const IMAGE_PARTICLE_ALPHA_THRESHOLD = 18;
export const IMAGE_PARTICLE_DEFAULT_POINT_SIZE = 4.5;
export const IMAGE_PARTICLE_INTRO_MS = 1400;
export const IMAGE_PARTICLE_MORPH_MS = 1200;
export const IMAGE_PARTICLE_READY_TIMEOUT_MS = 700;
export const IMAGE_PARTICLE_ROTATION_MS = 12_000;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function resolveImageParticleSampleSize(
  sampleSize: number | undefined,
): number {
  return Number.isFinite(sampleSize) && sampleSize !== undefined
    ? Math.max(1, Math.floor(sampleSize))
    : IMAGE_PARTICLE_DEFAULT_SAMPLE_SIZE;
}

export function imageParticleSourceCacheKey(
  source: Pick<ImageParticleSource, 'src' | 'sampleSize'>,
): string {
  return `${source.src}@${resolveImageParticleSampleSize(source.sampleSize)}`;
}

function deterministicNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function parseHexColor(value: string): ImageParticleRgb {
  const normalized = value.trim().replace(/^#/, '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((channel) => channel + channel).join('')
    : normalized;

  if (!/^[\da-f]{6}$/i.test(expanded)) {
    throw new Error(`Invalid image particle tint: ${value}`);
  }

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function resolveTint(color: ImageParticleColor, inverted: boolean): ImageParticleRgb | null {
  if (color.mode === 'source') return null;
  return parseHexColor(inverted ? color.inverted : color.normal);
}

interface SampleCandidate {
  readonly x: number;
  readonly y: number;
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export function sampleImageParticlePixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  limit = IMAGE_PARTICLE_LIMIT,
  alphaThreshold = IMAGE_PARTICLE_ALPHA_THRESHOLD,
): SampledImageParticles {
  const candidates: SampleCandidate[] = [];
  const gridColumns = Math.min(
    width,
    Math.max(1, Math.ceil(Math.sqrt(limit * (width / height)))),
  );
  const gridRows = Math.min(
    height,
    Math.max(1, Math.floor(limit / gridColumns)),
  );

  for (let row = 0; row < gridRows; row += 1) {
    const sampleY = Math.min(
      height - 1,
      Math.floor(((row + 0.5) / gridRows) * height),
    );

    for (let column = 0; column < gridColumns; column += 1) {
      const sampleX = Math.min(
        width - 1,
        Math.floor(((column + 0.5) / gridColumns) * width),
      );
      const pixelIndex = (sampleY * width + sampleX) * 4;
      const alpha = pixels[pixelIndex + 3];
      if (alpha < alphaThreshold) continue;

      candidates.push({
        x: column,
        y: row,
        red: pixels[pixelIndex],
        green: pixels[pixelIndex + 1],
        blue: pixels[pixelIndex + 2],
        alpha,
      });
    }
  }

  const positions = new Float32Array(limit * 3);
  const sourceColors = new Float32Array(limit * 3);
  const alphas = new Float32Array(limit);
  const seeds = new Float32Array(limit);
  const aspectScaleX = width >= height ? 1 : width / height;
  const aspectScaleY = height >= width ? 1 : height / width;

  for (let index = 0; index < limit; index += 1) {
    const positionOffset = index * 3;
    const candidate = candidates[index];
    const seed = deterministicNoise(index + 1);
    seeds[index] = seed;

    if (!candidate) {
      const angle = deterministicNoise(index + 11) * Math.PI * 2;
      const radius = 0.025 + deterministicNoise(index + 29) * 0.12;
      positions[positionOffset] = Math.cos(angle) * radius;
      positions[positionOffset + 1] = Math.sin(angle) * radius;
      positions[positionOffset + 2] = 0;
      sourceColors[positionOffset] = 0.5;
      sourceColors[positionOffset + 1] = 0.5;
      sourceColors[positionOffset + 2] = 0.5;
      alphas[index] = 0;
      continue;
    }

    positions[positionOffset] = (
      ((candidate.x + 0.5) / gridColumns) * 2 - 1
    ) * aspectScaleX;
    positions[positionOffset + 1] = (
      1 - ((candidate.y + 0.5) / gridRows) * 2
    ) * aspectScaleY;
    positions[positionOffset + 2] = (seed - 0.5) * 0.012;
    sourceColors[positionOffset] = candidate.red / 255;
    sourceColors[positionOffset + 1] = candidate.green / 255;
    sourceColors[positionOffset + 2] = candidate.blue / 255;
    alphas[index] = candidate.alpha / 255;
  }

  return {
    count: candidates.length,
    positions,
    sourceColors,
    alphas,
    seeds,
  };
}

export function buildImageParticleFrame(
  sampled: SampledImageParticles,
  color: ImageParticleColor,
  inverted: boolean,
  pointSize = IMAGE_PARTICLE_DEFAULT_POINT_SIZE,
): ImageParticleFrame {
  const colors = new Float32Array(sampled.sourceColors.length);
  const tint = resolveTint(color, inverted);
  const resolvedPointSize = Number.isFinite(pointSize)
    ? Math.max(1, pointSize)
    : IMAGE_PARTICLE_DEFAULT_POINT_SIZE;

  if (tint) {
    for (let index = 0; index < sampled.alphas.length; index += 1) {
      const offset = index * 3;
      colors[offset] = tint[0] / 255;
      colors[offset + 1] = tint[1] / 255;
      colors[offset + 2] = tint[2] / 255;
    }
  } else {
    colors.set(sampled.sourceColors);
  }

  return {
    count: sampled.count,
    positions: sampled.positions,
    colors,
    alphas: sampled.alphas,
    seeds: sampled.seeds,
    pointSize: resolvedPointSize,
  };
}

export function createImageParticleIntroFrame(target: ImageParticleFrame): ImageParticleFrame {
  const positions = new Float32Array(target.positions.length);
  const alphas = new Float32Array(target.alphas.length);

  for (let index = 0; index < target.alphas.length; index += 1) {
    const offset = index * 3;
    const angle = target.seeds[index] * Math.PI * 2;
    const radius = 0.035 + deterministicNoise(index + 101) * 0.24;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = Math.sin(angle) * radius;
    positions[offset + 2] = (deterministicNoise(index + 211) - 0.5) * 0.08;
    alphas[index] = target.alphas[index] > 0 ? 0.08 + target.seeds[index] * 0.12 : 0;
  }

  return {
    count: target.count,
    positions,
    colors: target.colors,
    alphas,
    seeds: target.seeds,
    pointSize: target.pointSize,
  };
}

export function nextImageParticleSequenceIndex(
  currentIndex: number,
  sequenceLength: number,
  unavailableIndices: ReadonlySet<number> = new Set(),
): number {
  if (sequenceLength <= 1) return 0;

  for (let offset = 1; offset <= sequenceLength; offset += 1) {
    const candidate = (currentIndex + offset) % sequenceLength;
    if (!unavailableIndices.has(candidate)) return candidate;
  }

  return currentIndex;
}

export function easeImageParticleProgress(progress: number): number {
  const value = clamp(progress);
  return value < 0.5
    ? 4 * value * value * value
    : 1 - ((-2 * value + 2) ** 3) / 2;
}
