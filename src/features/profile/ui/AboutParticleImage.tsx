/* eslint-disable @next/next/no-img-element -- decorative local artwork keeps the existing static fallback and sizing contract */
import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import styles from '../styles/ProfileSections.module.scss';
import useMediaQuery from '@/shared/hooks/useMediaQuery';
import {
  IMAGE_PARTICLE_READY_TIMEOUT_MS,
  IMAGE_PARTICLE_ROTATION_MS,
  nextImageParticleSequenceIndex,
  type ImageParticleSource,
} from '@/shared/lib/image-particles';
import type { ImageParticleCanvasProps } from '@/shared/ui/effects/ImageParticleCanvas';

const DESKTOP_QUERY = '(min-width: 1024px)';

const PRIMARY_ABOUT_IMAGE: ImageParticleSource = {
  src: '/icons/android-chrome-512x512.png',
  pointSize: 4.5,
  sampleSize: 384,
  color: {
    mode: 'tint',
    normal: '#e8e8e8',
    inverted: '#202020',
  },
};

const FUSANG_DEMO_IMAGE: ImageParticleSource = {
  src: '/image-particle-sequence/fusang-avatar.webp',
  pointSize: 4.5,
  sampleSize: 384,
  color: { mode: 'source' },
};

export function buildAboutParticleSequence(
  includeDevelopmentDemo: boolean,
): readonly ImageParticleSource[] {
  return includeDevelopmentDemo
    ? [PRIMARY_ABOUT_IMAGE, FUSANG_DEMO_IMAGE]
    : [PRIMARY_ABOUT_IMAGE];
}

const ABOUT_PARTICLE_SEQUENCE = buildAboutParticleSequence(
  process.env.NODE_ENV === 'development',
);

function ImageParticleImportFailure({ onFatalError }: ImageParticleCanvasProps) {
  useEffect(() => {
    onFatalError();
  }, [onFatalError]);
  return null;
}

const ImageParticleCanvas = dynamic<ImageParticleCanvasProps>(
  () => import('@/shared/ui/effects/ImageParticleCanvas').catch(() => ({
    default: ImageParticleImportFailure,
  })),
  { ssr: false, loading: () => null },
);

function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return visible;
}

interface AboutParticleImageProps {
  enabled: boolean;
  inverted: boolean;
  sequence?: readonly ImageParticleSource[];
}

export default function AboutParticleImage({
  enabled,
  inverted,
  sequence = ABOUT_PARTICLE_SEQUENCE,
}: AboutParticleImageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const pageVisible = usePageVisibility();
  const [inView, setInView] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [canvasStarted, setCanvasStarted] = useState(false);
  const [particleReady, setParticleReady] = useState(false);
  const [particleFailed, setParticleFailed] = useState(false);
  const [readyWaitExpired, setReadyWaitExpired] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [unavailableIndices, setUnavailableIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const eligible = enabled && isDesktop && hasEntered && !particleFailed;
  const canvasMounted = eligible && !readyWaitExpired;
  const particleVisible = canvasMounted && particleReady;
  const assembledImmediately = introComplete;
  const source = sequence[sourceIndex] ?? sequence[0] ?? PRIMARY_ABOUT_IMAGE;

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setInView(visible);
        if (visible) setHasEntered(true);
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      !inView
      || !eligible
      || !canvasStarted
      || particleReady
      || readyWaitExpired
    ) {
      return;
    }
    const timeoutId = window.setTimeout(
      () => setReadyWaitExpired(true),
      IMAGE_PARTICLE_READY_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [
    canvasStarted,
    eligible,
    inView,
    particleReady,
    readyWaitExpired,
  ]);

  useEffect(() => {
    if (canvasMounted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Capability loss must reset transient Canvas state before a future remount.
    if (canvasStarted) setCanvasStarted(false);
    if (particleReady) setParticleReady(false);
  }, [canvasMounted, canvasStarted, particleReady]);

  useEffect(() => {
    if (
      sequence.length <= 1
      || !particleVisible
      || !inView
      || !pageVisible
      || !introComplete
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSourceIndex((current) => nextImageParticleSequenceIndex(
        current,
        sequence.length,
        unavailableIndices,
      ));
    }, IMAGE_PARTICLE_ROTATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [
    inView,
    introComplete,
    pageVisible,
    particleVisible,
    sequence.length,
    sourceIndex,
    unavailableIndices,
  ]);

  const handleReady = useCallback(() => {
    setParticleReady(true);
  }, []);

  const handleCanvasMount = useCallback(() => {
    setCanvasStarted(true);
  }, []);

  const handleFatalError = useCallback(() => {
    setParticleFailed(true);
    setParticleReady(false);
  }, []);

  const handleSourceError = useCallback((src: string) => {
    const failedIndex = sequence.findIndex((entry) => entry.src === src);
    if (failedIndex < 0) return;

    const nextUnavailable = new Set(unavailableIndices);
    nextUnavailable.add(failedIndex);
    setUnavailableIndices(nextUnavailable);
    setSourceIndex((index) => nextImageParticleSequenceIndex(
      index,
      sequence.length,
      nextUnavailable,
    ));
  }, [sequence, unavailableIndices]);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  let stageState = 'active';
  if (particleFailed) stageState = 'failed';
  else if (!enabled || !isDesktop) stageState = 'static';
  else if (!hasEntered) stageState = 'dormant';
  else if (readyWaitExpired) stageState = 'timeout';
  else if (!particleReady) stageState = inView ? 'preparing' : 'paused';
  else if (!introComplete) stageState = 'intro';
  else if (!inView || !pageVisible) stageState = 'paused';

  return (
    <div
      ref={wrapperRef}
      className={styles.aboutNewImageWrapper}
      aria-hidden="true"
      data-image-particle-state={stageState}
      data-image-particle-source={source.src}
    >
      <div className={styles.aboutNewImageContainer}>
        <div
          className={`${styles.aboutParticleFallback} ${
            particleVisible ? styles.aboutParticleFallbackHidden : ''
          }`}
        >
          <img
            src="/icons/android-chrome-512x512.png"
            alt=""
            className={`${styles.aboutNewImageBase} ${styles.aboutNewImageNormal}`}
            draggable={false}
          />
          <img
            src="/icons/android-chrome-512x512.png"
            alt=""
            className={`${styles.aboutNewImageBase} ${styles.aboutNewImageInverted}`}
            draggable={false}
          />
        </div>
        {canvasMounted ? (
          <div
            className={`${styles.aboutParticleLayer} ${
              particleVisible ? styles.aboutParticleLayerVisible : ''
            }`}
          >
            <ImageParticleCanvas
              source={source}
              inverted={inverted}
              introStarted={inView && particleVisible && !introComplete}
              assembleImmediately={assembledImmediately}
              interactionEnabled={inView && particleVisible && introComplete}
              paused={!pageVisible || !inView}
              className={styles.aboutParticleCanvas}
              onMount={handleCanvasMount}
              onReady={handleReady}
              onFatalError={handleFatalError}
              onSourceError={handleSourceError}
              onIntroComplete={handleIntroComplete}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
