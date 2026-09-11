import { act, renderHook } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useAdaptivePerformance from '@/features/hud/model/useAdaptivePerformance';

const matchesByQuery: Map<string, boolean> = new Map();
const listenersByQuery: Map<string, Set<(event: MediaQueryListEvent) => void>> = new Map();
const originalConnectionDescriptor = Object.getOwnPropertyDescriptor(
  window.navigator,
  'connection',
);
const originalDeviceMemoryDescriptor = Object.getOwnPropertyDescriptor(
  window.navigator,
  'deviceMemory',
);
const originalHardwareConcurrencyDescriptor = Object.getOwnPropertyDescriptor(
  window.navigator,
  'hardwareConcurrency',
);

let nextRafId = 0;
let rafCallbacks: Map<number, FrameRequestCallback>;
let currentTimestamp = 0;

class MockMediaQueryList {
  readonly media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;

  constructor(media: string) {
    this.media = media;
  }

  get matches(): boolean {
    return matchesByQuery.get(this.media) ?? false;
  }

  addEventListener(_type: 'change', listener: (ev: MediaQueryListEvent) => void): void {
    let set = listenersByQuery.get(this.media);
    if (!set) {
      set = new Set();
      listenersByQuery.set(this.media, set);
    }
    set.add(listener);
  }

  removeEventListener(_type: 'change', listener: (ev: MediaQueryListEvent) => void): void {
    listenersByQuery.get(this.media)?.delete(listener);
  }
}

function fireMediaQueryChange(query: string) {
  const listeners = listenersByQuery.get(query);
  if (!listeners) return;
  for (const listener of [...listeners]) {
    listener({ matches: matchesByQuery.get(query) ?? false, media: query } as MediaQueryListEvent);
  }
}

function setNavigatorProperty(
  key: 'connection' | 'deviceMemory' | 'hardwareConcurrency',
  value: unknown,
) {
  Object.defineProperty(window.navigator, key, {
    configurable: true,
    value,
  });
}

function restoreNavigatorProperty(
  key: 'connection' | 'deviceMemory' | 'hardwareConcurrency',
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(window.navigator, key, descriptor);
    return;
  }

  delete (window.navigator as unknown as Record<string, unknown>)[key];
}

function flushNextAnimationFrame(timestamp: number) {
  const nextEntry = rafCallbacks.entries().next().value as
    [number, FrameRequestCallback] | undefined;
  if (!nextEntry) {
    throw new Error('No queued animation frame callback to flush.');
  }

  const [id, callback] = nextEntry;
  rafCallbacks.delete(id);
  act(() => {
    callback(timestamp);
  });
}

function flushPoorWindow() {
  for (let frame = 0; frame < 64; frame += 1) {
    currentTimestamp += 40;
    flushNextAnimationFrame(currentTimestamp);
  }
}

function flushHealthyWindow() {
  for (let frame = 0; frame < 121; frame += 1) {
    currentTimestamp += 16;
    flushNextAnimationFrame(currentTimestamp);
  }
}

beforeEach(() => {
  matchesByQuery.clear();
  listenersByQuery.clear();
  rafCallbacks = new Map();
  nextRafId = 0;
  currentTimestamp = 0;

  vi.stubGlobal('matchMedia', (query: string) => new MockMediaQueryList(query));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextRafId += 1;
    rafCallbacks.set(nextRafId, callback);
    return nextRafId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });

  matchesByQuery.set('(prefers-reduced-motion: reduce)', false);
  setNavigatorProperty('connection', { saveData: false, effectiveType: '4g' });
  setNavigatorProperty('deviceMemory', 8);
  setNavigatorProperty('hardwareConcurrency', 8);
  document.documentElement.removeAttribute('data-performance-tier');
  document.documentElement.removeAttribute('data-logo-effects');
  document.documentElement.removeAttribute('data-custom-cursor');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreNavigatorProperty('connection', originalConnectionDescriptor);
  restoreNavigatorProperty('deviceMemory', originalDeviceMemoryDescriptor);
  restoreNavigatorProperty('hardwareConcurrency', originalHardwareConcurrencyDescriptor);
  document.documentElement.removeAttribute('data-performance-tier');
  document.documentElement.removeAttribute('data-logo-effects');
  document.documentElement.removeAttribute('data-custom-cursor');
});

describe('useAdaptivePerformance', () => {
  it('does not double-apply a poor sample window under StrictMode', () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children);
    const { result } = renderHook(() => useAdaptivePerformance(true), { wrapper });

    flushPoorWindow();

    expect(result.current.performanceTier).toBe('logo-reduced');
  });

  it('reduces immediately for prefers-reduced-motion', () => {
    matchesByQuery.set('(prefers-reduced-motion: reduce)', true);

    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('minimal');
    expect(result.current.performanceReason).toBe('reduced-motion');
    expect(result.current.allowDecorativeMotion).toBe(false);
    expect(document.documentElement.getAttribute('data-performance-tier')).toBe('minimal');
  });

  it('reduces immediately only when Save-Data is explicitly requested', () => {
    setNavigatorProperty('connection', { saveData: true, effectiveType: '4g' });

    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('motion-reduced');
    expect(result.current.performanceReason).toBe('save-data');
  });

  it('does not use network estimates as a visual-performance ceiling', () => {
    setNavigatorProperty('connection', { saveData: false, effectiveType: '3g' });

    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('full');
    expect(result.current.performanceReason).toBeNull();
  });

  it('does not use coarse hardware hints as a visual-performance ceiling', () => {
    setNavigatorProperty('deviceMemory', 4);

    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('full');
    expect(result.current.performanceReason).toBeNull();
  });

  it('uses the first poor window exclusively for logo effects', () => {
    const { result } = renderHook(() => useAdaptivePerformance(true));

    expect(result.current.performanceTier).toBe('full');
    flushPoorWindow();

    expect(result.current).toMatchObject({
      performanceTier: 'logo-reduced',
      performanceReason: 'runtime-fps',
      allowLogoEffects: false,
      allowAmbientWebGL: true,
      allowHeavyCssEffects: true,
      allowDecorativeMotion: true,
      allowInteractiveWebGL: true,
      allowCustomCursor: true,
    });
    expect(document.documentElement.getAttribute('data-performance-tier')).toBe('logo-reduced');
    expect(document.documentElement.getAttribute('data-logo-effects')).toBe('off');
    expect(document.documentElement.getAttribute('data-custom-cursor')).toBe('on');
  });

  it('degrades one capability group at a time after the logo stage', () => {
    const { result } = renderHook(() => useAdaptivePerformance(true));

    flushPoorWindow();
    expect(result.current.performanceTier).toBe('logo-reduced');

    const expectedStages = [
      ['ambient-reduced', 'allowAmbientWebGL'],
      ['css-reduced', 'allowHeavyCssEffects'],
      ['motion-reduced', 'allowDecorativeMotion'],
      ['webgl-reduced', 'allowInteractiveWebGL'],
      ['minimal', 'allowCustomCursor'],
    ] as const;

    for (const [tier, disabledCapability] of expectedStages) {
      flushPoorWindow();
      flushPoorWindow();
      expect(result.current.performanceTier).toBe(tier);
      expect(result.current[disabledCapability]).toBe(false);
      if (tier === 'webgl-reduced') expect(result.current.allowCustomCursor).toBe(true);
    }
  });

  it('recovers only to the session-level logo ceiling', () => {
    const { result } = renderHook(() => useAdaptivePerformance(true));

    flushPoorWindow();
    flushPoorWindow();
    flushPoorWindow();
    expect(result.current.performanceTier).toBe('ambient-reduced');

    for (let window = 0; window < 8; window += 1) flushHealthyWindow();
    expect(result.current.performanceTier).toBe('logo-reduced');
    expect(result.current.performanceReason).toBe('runtime-fps');

    for (let window = 0; window < 8; window += 1) flushHealthyWindow();
    expect(result.current.performanceTier).toBe('logo-reduced');
  });

  it('cancels frame sampling on unmount', () => {
    const { unmount } = renderHook(() => useAdaptivePerformance(true));
    expect(rafCallbacks.size).toBe(1);
    unmount();

    expect(rafCallbacks.size).toBe(0);
  });

  it('stays reduced after the triggering condition goes away', () => {
    matchesByQuery.set('(prefers-reduced-motion: reduce)', true);
    const { result } = renderHook(() => useAdaptivePerformance(false));

    expect(result.current.performanceTier).toBe('minimal');

    matchesByQuery.set('(prefers-reduced-motion: reduce)', false);
    act(() => {
      fireMediaQueryChange('(prefers-reduced-motion: reduce)');
    });

    expect(result.current.performanceTier).toBe('minimal');
    expect(result.current.performanceReason).toBe('reduced-motion');
  });
});
