import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  useLeftPanelNavigation,
  useTesseractDragFeedback,
} from '@/app/shell/useMainLayoutNavigation';

afterEach(() => vi.useRealTimers());

describe('MainLayout navigation hooks', () => {
  it('derives displayed drag feedback from activation without cleanup state effects', () => {
    const { result, rerender } = renderHook(({ active }) => useTesseractDragFeedback(active), {
      initialProps: { active: true },
    });
    act(() => result.current.onDraggingChange(true));
    expect(result.current.displayedDragging).toBe(true);
    rerender({ active: false });
    expect(result.current.displayedDragging).toBe(false);
  });

  it('uses delayed hash alignment when closing an open detail', () => {
    vi.useFakeTimers();
    const closeDrawer = vi.fn();
    const handleBack = vi.fn();
    const navigateTo = vi.fn();
    const scrollIntoView = vi.fn();
    const target = document.createElement('div');
    target.id = 'section-life';
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);
    const { result } = renderHook(() =>
      useLeftPanelNavigation({
        closeDrawer,
        isContentPage: true,
        isDetailOpen: () => true,
        handleBack,
        navigateTo,
      }),
    );

    act(() =>
      result.current({ label: 'Life', href: '/en/content#life', group: 'content', hash: 'life' }),
    );
    expect(closeDrawer).toHaveBeenCalledOnce();
    expect(handleBack).toHaveBeenCalledOnce();
    expect(scrollIntoView).not.toHaveBeenCalled();
    act(() => vi.runAllTimers());
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(navigateTo).not.toHaveBeenCalled();
    target.remove();
  });
});
