import { renderHook } from '@testing-library/react';
import { createElement, useInsertionEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useAnimationSequence from '@/features/hud/model/useAnimationSequence';

const safeTimers = vi.hoisted(() => ({
  clearInterval: vi.fn(),
  clearTimeout: vi.fn(),
  setInterval: vi.fn(() => 1),
  setTimeout: vi.fn(() => 1),
}));

vi.mock('@/shared/hooks/useSafeTimeouts', () => ({
  useSafeTimeouts: () => safeTimers,
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useResponsive: () => ({ isMobile: false }),
}));

const BOOT_COMPLETE_ATTRIBUTE = 'data-initial-boot-complete';

function HtmlAttributeReconciler({ children }: { children: ReactNode }) {
  useInsertionEffect(() => {
    document.documentElement.removeAttribute(BOOT_COMPLETE_ATTRIBUTE);
  }, []);

  return createElement('div', null, children);
}

describe('useAnimationSequence initial state', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(BOOT_COMPLETE_ATTRIBUTE);
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.documentElement.removeAttribute(BOOT_COMPLETE_ATTRIBUTE);
  });

  it('keeps a fresh document in the original hidden loading state', () => {
    const { result } = renderHook(() => useAnimationSequence());

    expect(result.current).toMatchObject({
      animationsComplete: false,
      hudVisible: false,
      isLoading: true,
      leftPanelAnimated: false,
      leversVisible: false,
      linesAnimated: false,
      mainVisible: false,
      textVisible: false,
    });
  });

  it('initializes a remounted provider from the completed document state', () => {
    document.documentElement.setAttribute(BOOT_COMPLETE_ATTRIBUTE, 'true');

    const { result } = renderHook(() => useAnimationSequence(), {
      wrapper: HtmlAttributeReconciler,
    });

    expect(result.current).toMatchObject({
      animationsComplete: true,
      hudVisible: true,
      isLoading: false,
      leftPanelAnimated: true,
      leversVisible: true,
      linesAnimated: true,
      mainVisible: true,
      textVisible: true,
    });
    expect(document.documentElement.getAttribute(BOOT_COMPLETE_ATTRIBUTE)).toBe('true');
  });
});
