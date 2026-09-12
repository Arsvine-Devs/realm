import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useMediaQuery, { useReducedMotion, useResponsive } from '@/shared/hooks/useMediaQuery';

const matchesByQuery: Map<string, boolean> = new Map();
const listenersByQuery: Map<string, Set<(event: MediaQueryListEvent) => void>> = new Map();

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

  addListener(listener: (this: MediaQueryList, ev: MediaQueryListEvent) => unknown): void {
    this.addEventListener('change', listener);
  }

  removeListener(listener: (this: MediaQueryList, ev: MediaQueryListEvent) => unknown): void {
    this.removeEventListener('change', listener);
  }

  dispatchEvent(event: MediaQueryListEvent): boolean {
    this.onchange?.call(this as unknown as MediaQueryList, event);
    return true;
  }
}

beforeEach(() => {
  matchesByQuery.clear();
  listenersByQuery.clear();
  vi.stubGlobal('matchMedia', (query: string) => new MockMediaQueryList(query));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fireChange(query: string) {
  const listeners = listenersByQuery.get(query);
  if (!listeners) return;
  for (const listener of [...listeners]) {
    listener({ matches: matchesByQuery.get(query) ?? false, media: query } as MediaQueryListEvent);
  }
}

describe('useMediaQuery', () => {
  it('reads the initial matchMedia value synchronously', () => {
    matchesByQuery.set('(max-width: 767px)', true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
  });

  it('reacts to a media-query change event', () => {
    matchesByQuery.set('(max-width: 767px)', true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);

    matchesByQuery.set('(max-width: 767px)', false);
    act(() => fireChange('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });
});

describe('useResponsive', () => {
  it('exposes the three documented breakpoints', () => {
    matchesByQuery.set('(max-width: 767px)', true);
    matchesByQuery.set('(min-width: 768px) and (max-width: 1023px)', false);
    matchesByQuery.set('(min-width: 1024px)', false);
    const { result } = renderHook(() => useResponsive());
    expect(result.current).toEqual({ isMobile: true, isTablet: false, isDesktop: false });
  });
});

describe('useReducedMotion', () => {
  it('returns true when prefers-reduced-motion is set', () => {
    matchesByQuery.set('(prefers-reduced-motion: reduce)', true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('returns false when prefers-reduced-motion is not set', () => {
    matchesByQuery.set('(prefers-reduced-motion: reduce)', false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
