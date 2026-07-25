import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stageMocks = vi.hoisted(() => ({
  desktop: vi.fn(),
  canvasProps: null as Record<string, unknown> | null,
  intersectionCallback: null as IntersectionObserverCallback | null,
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  default: () => stageMocks.desktop(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockImageParticleCanvas(props: Record<string, unknown>) {
    stageMocks.canvasProps = props;
    return <div data-testid="particle-canvas" />;
  },
}));

import AboutParticleImage, {
  buildAboutParticleSequence,
} from '@/features/profile/ui/AboutParticleImage';
import {
  IMAGE_PARTICLE_READY_TIMEOUT_MS,
  IMAGE_PARTICLE_ROTATION_MS,
} from '@/shared/lib/image-particles';

function renderImage(
  overrides: Partial<React.ComponentProps<typeof AboutParticleImage>> = {},
) {
  return render(
    <AboutParticleImage
      enabled
      inverted={false}
      {...overrides}
    />,
  );
}

function setIntersection(isIntersecting: boolean) {
  act(() => {
    stageMocks.intersectionCallback?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

describe('AboutParticleImage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stageMocks.desktop.mockReturnValue(true);
    stageMocks.canvasProps = null;
    stageMocks.intersectionCallback = null;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });

    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        stageMocks.intersectionCallback = callback;
      }

      observe() {}

      disconnect() {}
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps production single-source and development demo sequences', () => {
    const production = buildAboutParticleSequence(false);
    const development = buildAboutParticleSequence(true);

    expect(production.map((source) => source.src)).toEqual([
      '/icons/android-chrome-512x512.png',
    ]);
    expect(development.map((source) => source.src)).toEqual([
      '/icons/android-chrome-512x512.png',
      '/image-particle-sequence/fusang-avatar.webp',
    ]);
    expect(development[0]).toMatchObject({
      pointSize: 4.5,
      sampleSize: 384,
      color: {
        mode: 'tint',
        normal: '#e8e8e8',
        inverted: '#202020',
      },
    });
    expect(development[1].color).toEqual({ mode: 'source' });
  });

  it('stays dormant until entering the viewport', () => {
    const view = renderImage();
    const stage = view.container.querySelector('[data-image-particle-state]');

    expect(stage?.getAttribute('data-image-particle-state')).toBe('dormant');
    expect(view.queryByTestId('particle-canvas')).toBeNull();

    setIntersection(true);
    expect(stage?.getAttribute('data-image-particle-state')).toBe('preparing');
    expect(view.getByTestId('particle-canvas')).not.toBeNull();
  });

  it('uses the static fallback when disabled or below desktop width', () => {
    const disabled = renderImage({ enabled: false });

    expect(
      disabled.container.querySelector('[data-image-particle-state]')
        ?.getAttribute('data-image-particle-state'),
    ).toBe('static');
    setIntersection(true);
    expect(disabled.queryByTestId('particle-canvas')).toBeNull();

    disabled.unmount();
    stageMocks.desktop.mockReturnValue(false);
    const mobile = renderImage();
    setIntersection(true);
    expect(
      mobile.container.querySelector('[data-image-particle-state]')
        ?.getAttribute('data-image-particle-state'),
    ).toBe('static');
    expect(mobile.queryByTestId('particle-canvas')).toBeNull();
  });

  it('runs intro once, pauses offscreen, and resumes assembled', () => {
    const view = renderImage();
    setIntersection(true);

    act(() => {
      (stageMocks.canvasProps?.onReady as (() => void))();
    });
    expect(
      view.container.querySelector('[data-image-particle-state]')
        ?.getAttribute('data-image-particle-state'),
    ).toBe('intro');
    expect(stageMocks.canvasProps?.introStarted).toBe(true);
    expect(stageMocks.canvasProps?.interactionEnabled).toBe(false);

    act(() => {
      (stageMocks.canvasProps?.onIntroComplete as (() => void))();
    });
    expect(stageMocks.canvasProps?.interactionEnabled).toBe(true);

    setIntersection(false);
    expect(
      view.container.querySelector('[data-image-particle-state]')
        ?.getAttribute('data-image-particle-state'),
    ).toBe('paused');
    expect(stageMocks.canvasProps?.paused).toBe(true);

    setIntersection(true);
    expect(stageMocks.canvasProps?.assembleImmediately).toBe(true);
    expect(stageMocks.canvasProps?.introStarted).toBe(false);
  });

  it('falls back when readiness exceeds the deadline', () => {
    const view = renderImage();
    setIntersection(true);
    act(() => {
      (stageMocks.canvasProps?.onMount as (() => void))();
    });

    act(() => {
      vi.advanceTimersByTime(IMAGE_PARTICLE_READY_TIMEOUT_MS);
    });

    expect(
      view.container.querySelector('[data-image-particle-state]')
        ?.getAttribute('data-image-particle-state'),
    ).toBe('timeout');
    expect(view.queryByTestId('particle-canvas')).toBeNull();
    expect(
      view.container.querySelector('[class*="aboutParticleFallbackHidden"]'),
    ).toBeNull();
  });

  it('cycles the development sequence while visible', () => {
    const view = renderImage({ sequence: buildAboutParticleSequence(true) });
    setIntersection(true);
    act(() => {
      (stageMocks.canvasProps?.onReady as (() => void))();
    });
    act(() => {
      (stageMocks.canvasProps?.onIntroComplete as (() => void))();
    });

    act(() => {
      vi.advanceTimersByTime(IMAGE_PARTICLE_ROTATION_MS);
    });
    expect(
      view.container.querySelector('[data-image-particle-source]')
        ?.getAttribute('data-image-particle-source'),
    ).toBe('/image-particle-sequence/fusang-avatar.webp');

    act(() => {
      vi.advanceTimersByTime(IMAGE_PARTICLE_ROTATION_MS);
    });
    expect(
      view.container.querySelector('[data-image-particle-source]')
        ?.getAttribute('data-image-particle-source'),
    ).toBe('/icons/android-chrome-512x512.png');
  });

  it('pauses animation and rotation while the page is hidden', () => {
    const view = renderImage();
    setIntersection(true);
    act(() => {
      (stageMocks.canvasProps?.onReady as (() => void))();
      (stageMocks.canvasProps?.onIntroComplete as (() => void))();
    });

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(
      view.container.querySelector('[data-image-particle-state]')
        ?.getAttribute('data-image-particle-state'),
    ).toBe('paused');
    expect(stageMocks.canvasProps?.paused).toBe(true);
  });

  it('returns to the static fallback after a fatal Canvas error', () => {
    const view = renderImage();
    setIntersection(true);

    act(() => {
      (stageMocks.canvasProps?.onReady as (() => void))();
      (stageMocks.canvasProps?.onFatalError as (() => void))();
    });

    expect(
      view.container.querySelector('[data-image-particle-state]')
        ?.getAttribute('data-image-particle-state'),
    ).toBe('failed');
    expect(view.queryByTestId('particle-canvas')).toBeNull();
  });
});
