import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useResponsive: () => ({ isMobile: false, isDesktop: true }),
}));

import {
  LayoutAnchorsProvider,
  useLayoutAnchors,
} from '@/features/navigation/model/LayoutAnchorsContext';
import { createContentHashNavigationRequest } from '@/features/navigation/model/contentHashNavigation';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LayoutAnchorsProvider>{children}</LayoutAnchorsProvider>
);

describe('LayoutAnchorsProvider', () => {
  it('aligns a registered content section and resolves once', async () => {
    const container = document.createElement('div');
    const target = document.createElement('div');
    target.id = 'section-life';
    target.scrollIntoView = vi.fn();
    target.getBoundingClientRect = () => new DOMRect(0, 0, 100, 20);
    document.body.appendChild(target);
    const { result } = renderHook(() => useLayoutAnchors(), { wrapper });
    act(() => result.current.registerScrollContainer(container));

    const alignment = result.current.align('life');
    await act(async () => vi.advanceTimersByTime(50));

    await expect(alignment).resolves.toBe('aligned');
    expect(target.scrollIntoView).toHaveBeenCalledOnce();
    target.remove();
  });

  it('cancels an older alignment and times out missing targets', async () => {
    const { result } = renderHook(() => useLayoutAnchors(), { wrapper });
    const cancelled = result.current.align('missing-one');
    act(() => result.current.cancel());
    await expect(cancelled).resolves.toBe('cancelled');

    const timedOut = result.current.align('missing-two');
    await act(async () => vi.advanceTimersByTime(1000));
    await expect(timedOut).resolves.toBe('timeout');
  });

  it('does not let an older request cleanup cancel a newer alignment', async () => {
    const container = document.createElement('div');
    const target = document.createElement('div');
    target.id = 'section-blog';
    target.scrollIntoView = vi.fn();
    target.getBoundingClientRect = () => new DOMRect(0, 0, 100, 20);
    document.body.appendChild(target);
    const { result } = renderHook(() => useLayoutAnchors(), { wrapper });
    act(() => result.current.registerScrollContainer(container));

    const olderRequest = createContentHashNavigationRequest('blog');
    const newerRequest = createContentHashNavigationRequest('blog');
    const olderAlignment = result.current.align(olderRequest);
    const newerAlignment = result.current.align(newerRequest);

    act(() => result.current.cancel(olderRequest.requestId));
    await act(async () => vi.advanceTimersByTime(100));

    await expect(olderAlignment).resolves.toBe('cancelled');
    await expect(newerAlignment).resolves.toBe('aligned');
    expect(target.scrollIntoView).toHaveBeenCalled();
    target.remove();
  });
});
