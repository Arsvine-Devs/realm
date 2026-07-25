import React, {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { listenForWebglContextLoss } from '@/shared/lib/webgl-context-loss';
import {
  buildImageParticleFrame,
  createImageParticleIntroFrame,
  easeImageParticleProgress,
  IMAGE_PARTICLE_INTRO_MS,
  IMAGE_PARTICLE_MORPH_MS,
  imageParticleSourceCacheKey,
  resolveImageParticleSampleSize,
  sampleImageParticlePixels,
  type ImageParticleFrame,
  type ImageParticleSource,
  type SampledImageParticles,
} from '@/shared/lib/image-particles';

export interface ImageParticleCanvasProps {
  source: ImageParticleSource;
  inverted: boolean;
  introStarted: boolean;
  assembleImmediately: boolean;
  interactionEnabled: boolean;
  paused: boolean;
  className?: string;
  onMount: () => void;
  onReady: () => void;
  onFatalError: () => void;
  onSourceError: (src: string) => void;
  onIntroComplete: () => void;
}

interface LoadedImageSource {
  source: ImageParticleSource;
  sampled: SampledImageParticles;
}

interface ParticleTransition {
  active: boolean;
  kind: 'intro' | 'morph';
  startedAt: number;
  duration: number;
}

const VERTEX_SHADER = `
  attribute vec3 aFromPosition;
  attribute vec3 aToPosition;
  attribute vec3 aFromColor;
  attribute vec3 aToColor;
  attribute float aFromAlpha;
  attribute float aToAlpha;
  attribute float aSeed;

  uniform float uProgress;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uPointSize;

  varying vec3 vColor;
  varying float vAlpha;

  float easeInOutCubic(float value) {
    return value < 0.5
      ? 4.0 * value * value * value
      : 1.0 - pow(-2.0 * value + 2.0, 3.0) / 2.0;
  }

  void main() {
    float staggered = clamp((uProgress - aSeed * 0.14) / 0.86, 0.0, 1.0);
    float progress = easeInOutCubic(staggered);
    vec3 particlePosition = mix(aFromPosition, aToPosition, progress);

    vec2 delta = particlePosition.xy - uPointer;
    float distanceToPointer = length(delta);
    float influence = 1.0 - smoothstep(0.0, 0.34, distanceToPointer);
    vec2 direction = distanceToPointer > 0.0001
      ? delta / distanceToPointer
      : vec2(cos(aSeed * 6.283185), sin(aSeed * 6.283185));
    particlePosition.xy += direction * influence * uPointerStrength * (0.12 + aSeed * 0.035);
    particlePosition.z += influence * uPointerStrength * (0.03 + aSeed * 0.025);

    vColor = mix(aFromColor, aToColor, progress);
    vAlpha = mix(aFromAlpha, aToAlpha, progress);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(particlePosition, 1.0);
    gl_PointSize = uPointSize;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    if (distanceToCenter > 0.5) discard;
    float edge = 1.0 - smoothstep(0.28, 0.5, distanceToCenter);
    gl_FragColor = vec4(vColor, vAlpha * edge * 0.9);
  }
`;

function copyFrame(
  fromPositions: Float32Array,
  fromColors: Float32Array,
  fromAlphas: Float32Array,
  frame: ImageParticleFrame,
) {
  fromPositions.set(frame.positions);
  fromColors.set(frame.colors);
  fromAlphas.set(frame.alphas);
}

function captureInterpolatedFrame(
  outputPositions: Float32Array,
  outputColors: Float32Array,
  outputAlphas: Float32Array,
  fromPositions: Float32Array,
  fromColors: Float32Array,
  fromAlphas: Float32Array,
  toPositions: Float32Array,
  toColors: Float32Array,
  toAlphas: Float32Array,
  progress: number,
) {
  const eased = easeImageParticleProgress(progress);

  for (let index = 0; index < outputPositions.length; index += 1) {
    outputPositions[index] = fromPositions[index] + (toPositions[index] - fromPositions[index]) * eased;
    outputColors[index] = fromColors[index] + (toColors[index] - fromColors[index]) * eased;
  }

  for (let index = 0; index < outputAlphas.length; index += 1) {
    outputAlphas[index] = fromAlphas[index] + (toAlphas[index] - fromAlphas[index]) * eased;
  }
}

function markAttributesDirty(attributes: ReadonlyArray<React.RefObject<THREE.BufferAttribute | null>>) {
  for (const attribute of attributes) {
    if (attribute.current) attribute.current.needsUpdate = true;
  }
}

function ParticleField({
  target,
  introStarted,
  assembleImmediately,
  interactionEnabled,
  paused,
  onReady,
  onIntroComplete,
}: {
  target: ImageParticleFrame;
  introStarted: boolean;
  assembleImmediately: boolean;
  interactionEnabled: boolean;
  paused: boolean;
  onReady: () => void;
  onIntroComplete: () => void;
}) {
  const [buffers] = useState(() => {
    const introFrame = createImageParticleIntroFrame(target);
    return {
      fromPositions: new Float32Array(
        assembleImmediately ? target.positions : introFrame.positions,
      ),
      fromColors: new Float32Array(
        assembleImmediately ? target.colors : introFrame.colors,
      ),
      fromAlphas: new Float32Array(
        assembleImmediately ? target.alphas : introFrame.alphas,
      ),
      toPositions: new Float32Array(target.positions),
      toColors: new Float32Array(target.colors),
      toAlphas: new Float32Array(target.alphas),
      seeds: new Float32Array(target.seeds),
    };
  });
  const {
    fromPositions,
    fromColors,
    fromAlphas,
    toPositions,
    toColors,
    toAlphas,
    seeds,
  } = buffers;

  const positionRef = useRef<THREE.BufferAttribute>(null);
  const fromPositionRef = useRef<THREE.BufferAttribute>(null);
  const toPositionRef = useRef<THREE.BufferAttribute>(null);
  const fromColorRef = useRef<THREE.BufferAttribute>(null);
  const toColorRef = useRef<THREE.BufferAttribute>(null);
  const fromAlphaRef = useRef<THREE.BufferAttribute>(null);
  const toAlphaRef = useRef<THREE.BufferAttribute>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const transitionRef = useRef<ParticleTransition>({
    active: false,
    kind: 'intro',
    startedAt: 0,
    duration: IMAGE_PARTICLE_INTRO_MS,
  });
  const targetRef = useRef(target);
  const introRequestedRef = useRef(assembleImmediately);
  const readyReportedRef = useRef(false);
  const introCompleteReportedRef = useRef(false);
  const pausedAtRef = useRef<number | null>(null);
  const currentProgressRef = useRef(assembleImmediately ? 1 : 0);
  const pointerTargetRef = useRef(new THREE.Vector2(4, 4));
  const pointerCurrentRef = useRef(new THREE.Vector2(4, 4));
  const pointerStrengthTargetRef = useRef(0);
  const pointerStrengthRef = useRef(0);

  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const [initialUniforms] = useState(() => ({
    uProgress: { value: assembleImmediately ? 1 : 0 },
    uPointer: { value: new THREE.Vector2(4, 4) },
    uPointerStrength: { value: 0 },
    uPointSize: { value: target.pointSize * gl.getPixelRatio() },
  }));

  useEffect(() => {
    if (targetRef.current === target) return;

    const previousProgress = currentProgressRef.current;
    const nextFromPositions = new Float32Array(fromPositions.length);
    const nextFromColors = new Float32Array(fromColors.length);
    const nextFromAlphas = new Float32Array(fromAlphas.length);
    captureInterpolatedFrame(
      nextFromPositions,
      nextFromColors,
      nextFromAlphas,
      fromPositions,
      fromColors,
      fromAlphas,
      toPositions,
      toColors,
      toAlphas,
      previousProgress,
    );

    fromPositions.set(nextFromPositions);
    fromColors.set(nextFromColors);
    fromAlphas.set(nextFromAlphas);
    copyFrame(toPositions, toColors, toAlphas, target);
    targetRef.current = target;
    transitionRef.current = {
      active: true,
      kind: 'morph',
      startedAt: performance.now() + 16,
      duration: IMAGE_PARTICLE_MORPH_MS,
    };
    currentProgressRef.current = 0;
    if (materialRef.current) materialRef.current.uniforms.uProgress.value = 0;
    if (materialRef.current) {
      materialRef.current.uniforms.uPointSize.value = target.pointSize * gl.getPixelRatio();
    }
    markAttributesDirty([
      positionRef,
      fromPositionRef,
      toPositionRef,
      fromColorRef,
      toColorRef,
      fromAlphaRef,
      toAlphaRef,
    ]);
    invalidate();
  }, [
    fromAlphas,
    fromColors,
    fromPositions,
    gl,
    invalidate,
    target,
    toAlphas,
    toColors,
    toPositions,
  ]);

  useEffect(() => {
    if (!introStarted || introRequestedRef.current || assembleImmediately) return;
    introRequestedRef.current = true;
    transitionRef.current = {
      active: true,
      kind: 'intro',
      startedAt: performance.now() + 16,
      duration: IMAGE_PARTICLE_INTRO_MS,
    };
    currentProgressRef.current = 0;
    if (materialRef.current) materialRef.current.uniforms.uProgress.value = 0;
    invalidate();
  }, [assembleImmediately, introStarted, invalidate]);

  useEffect(() => {
    if (paused) {
      pausedAtRef.current = performance.now();
      pointerStrengthTargetRef.current = 0;
      return;
    }

    if (pausedAtRef.current !== null && transitionRef.current.active) {
      transitionRef.current.startedAt += performance.now() - pausedAtRef.current;
    }
    pausedAtRef.current = null;
    invalidate();
  }, [invalidate, paused]);

  useEffect(() => {
    if (!interactionEnabled || paused) return;

    const movePointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = gl.domElement.getBoundingClientRect();
      const pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const pointerY = 1 - ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2;
      const inside = pointerX >= -1.25 && pointerX <= 1.25 && pointerY >= -1.25 && pointerY <= 1.25;

      if (inside) {
        pointerTargetRef.current.set(pointerX, pointerY);
        pointerStrengthTargetRef.current = 1;
      } else {
        pointerStrengthTargetRef.current = 0;
      }
      invalidate();
    };

    const resetPointer = () => {
      pointerStrengthTargetRef.current = 0;
      invalidate();
    };

    window.addEventListener('pointermove', movePointer, { passive: true });
    window.addEventListener('blur', resetPointer);
    return () => {
      window.removeEventListener('pointermove', movePointer);
      window.removeEventListener('blur', resetPointer);
    };
  }, [gl, interactionEnabled, invalidate, paused]);

  useFrame((state) => {
    if (!readyReportedRef.current) {
      readyReportedRef.current = true;
      queueMicrotask(onReady);
    }
    if (assembleImmediately && !introCompleteReportedRef.current) {
      introCompleteReportedRef.current = true;
      queueMicrotask(onIntroComplete);
    }
    if (paused) return;
    const material = materialRef.current;
    if (!material) return;

    const transition = transitionRef.current;
    if (transition.active) {
      const rawProgress = Math.max(
        0,
        Math.min(1, (performance.now() - transition.startedAt) / transition.duration),
      );
      currentProgressRef.current = rawProgress;
      material.uniforms.uProgress.value = rawProgress;

      if (rawProgress >= 1) {
        transition.active = false;
        if (transition.kind === 'intro' && !introCompleteReportedRef.current) {
          introCompleteReportedRef.current = true;
          queueMicrotask(onIntroComplete);
        }
      } else {
        state.invalidate();
      }
    }

    const pointer = pointerCurrentRef.current;
    pointer.lerp(pointerTargetRef.current, 0.18);
    pointerStrengthRef.current += (
      pointerStrengthTargetRef.current - pointerStrengthRef.current
    ) * 0.16;
    material.uniforms.uPointer.value.copy(pointer);
    material.uniforms.uPointerStrength.value = pointerStrengthRef.current;

    const pointerMoving = pointer.distanceToSquared(pointerTargetRef.current) > 0.00001;
    const strengthMoving = Math.abs(
      pointerStrengthTargetRef.current - pointerStrengthRef.current,
    ) > 0.002;
    if (pointerMoving || strengthMoving) state.invalidate();
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={positionRef} attach="attributes-position" args={[toPositions, 3]} />
        <bufferAttribute ref={fromPositionRef} attach="attributes-aFromPosition" args={[fromPositions, 3]} />
        <bufferAttribute ref={toPositionRef} attach="attributes-aToPosition" args={[toPositions, 3]} />
        <bufferAttribute ref={fromColorRef} attach="attributes-aFromColor" args={[fromColors, 3]} />
        <bufferAttribute ref={toColorRef} attach="attributes-aToColor" args={[toColors, 3]} />
        <bufferAttribute ref={fromAlphaRef} attach="attributes-aFromAlpha" args={[fromAlphas, 1]} />
        <bufferAttribute ref={toAlphaRef} attach="attributes-aToAlpha" args={[toAlphas, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={initialUniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </points>
  );
}

function WebglContextLossListener({ onContextLost }: { onContextLost: () => void }) {
  const gl = useThree((state) => state.gl);

  useEffect(
    () => listenForWebglContextLoss(gl.domElement, onContextLost),
    [gl, onContextLost],
  );

  return null;
}

const imageSourceCache = new Map<string, Promise<SampledImageParticles>>();

async function loadImageSourceUncached(
  src: string,
  sampleSize: number,
): Promise<SampledImageParticles> {
  const image = new Image();
  image.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => reject(new Error(`Failed to load image particle source: ${src}`)), {
      once: true,
    });
    image.src = src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image particle sampling canvas is unavailable');

  const scale = Math.min(
    sampleSize / image.naturalWidth,
    sampleSize / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (sampleSize - width) / 2;
  const y = (sampleSize - height) / 2;
  context.clearRect(0, 0, sampleSize, sampleSize);
  context.drawImage(image, x, y, width, height);

  const pixels = context.getImageData(
    0,
    0,
    sampleSize,
    sampleSize,
  ).data;
  const sampled = sampleImageParticlePixels(
    pixels,
    sampleSize,
    sampleSize,
  );
  if (sampled.count === 0) throw new Error(`Image particle source contains no visible pixels: ${src}`);
  return sampled;
}

function loadImageSource(source: ImageParticleSource): Promise<SampledImageParticles> {
  const cacheKey = imageParticleSourceCacheKey(source);
  const cached = imageSourceCache.get(cacheKey);
  if (cached) return cached;

  const request = loadImageSourceUncached(
    source.src,
    resolveImageParticleSampleSize(source.sampleSize),
  ).catch((error: unknown) => {
    imageSourceCache.delete(cacheKey);
    throw error;
  });
  imageSourceCache.set(cacheKey, request);
  return request;
}

class ImageParticleErrorBoundary extends Component<{
  children: ReactNode;
  onError: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function ImageParticleCanvas({
  source,
  inverted,
  introStarted,
  assembleImmediately,
  interactionEnabled,
  paused,
  className,
  onMount,
  onReady,
  onFatalError,
  onSourceError,
  onIntroComplete,
}: ImageParticleCanvasProps) {
  const [loaded, setLoaded] = useState<LoadedImageSource | null>(null);
  const loadedRef = useRef<LoadedImageSource | null>(null);
  const sourceVersionRef = useRef(0);

  useEffect(() => {
    onMount();
  }, [onMount]);

  useEffect(() => {
    const sourceVersion = ++sourceVersionRef.current;

    loadImageSource(source)
      .then((sampled) => {
        if (sourceVersion !== sourceVersionRef.current) return;
        const next = { source, sampled };
        loadedRef.current = next;
        setLoaded(next);
      })
      .catch(() => {
        if (sourceVersion !== sourceVersionRef.current) return;
        if (loadedRef.current) onSourceError(source.src);
        else onFatalError();
      });
    return () => {
      sourceVersionRef.current += 1;
    };
  }, [onFatalError, onSourceError, source]);

  const frame = useMemo(
    () => loaded
      ? buildImageParticleFrame(
        loaded.sampled,
        loaded.source.color,
        inverted,
        loaded.source.pointSize,
      )
      : null,
    [inverted, loaded],
  );

  if (!frame) return null;

  return (
    <ImageParticleErrorBoundary onError={onFatalError}>
      <Canvas
        className={className}
        frameloop="demand"
        orthographic
        camera={{ position: [0, 0, 2], left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <WebglContextLossListener onContextLost={onFatalError} />
        <ParticleField
          target={frame}
          introStarted={introStarted}
          assembleImmediately={assembleImmediately}
          interactionEnabled={interactionEnabled}
          paused={paused}
          onReady={onReady}
          onIntroComplete={onIntroComplete}
        />
      </Canvas>
    </ImageParticleErrorBoundary>
  );
}
