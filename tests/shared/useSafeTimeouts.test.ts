import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSafeTimeouts } from '@/shared/hooks/useSafeTimeouts';

afterEach(() => {
  vi.useRealTimers();
});

describe('useSafeTimeouts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fires scheduled callbacks after the delay', () => {
    const { result } = renderHook(() => useSafeTimeouts());
    const fn = vi.fn();
    act(() => {
      result.current.setTimeout(fn, 100);
    });
    expect(fn).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clears a single timeout via clearTimeout', () => {
    const { result } = renderHook(() => useSafeTimeouts());
    const fn = vi.fn();
    let id: number | undefined;
    act(() => {
      id = result.current.setTimeout(fn, 100);
    });
    act(() => {
      result.current.clearTimeout(id);
      vi.advanceTimersByTime(200);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancels all pending timeouts on unmount', () => {
    const { result, unmount } = renderHook(() => useSafeTimeouts());
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    act(() => {
      result.current.setTimeout(fn1, 100);
      result.current.setTimeout(fn2, 200);
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it('intercepts a firing timeout that beats clearTimeout on unmount', () => {
    const { result, unmount } = renderHook(() => useSafeTimeouts());
    const fn = vi.fn();
    act(() => {
      result.current.setTimeout(fn, 100);
    });
    // 模拟"clearTimeout 来不及拦下"：在 schedule 内部，setTimeout 即将执行
    // 的瞬间调 unmount；fn 仍会进入 setTimeout 队列但被 cancelled 标志拦截。
    vi.advanceTimersByTime(99);
    unmount();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('schedules and cancels intervals', () => {
    const { result, unmount } = renderHook(() => useSafeTimeouts());
    const fn = vi.fn();
    let id: number | undefined;
    act(() => {
      id = result.current.setInterval(fn, 100);
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(fn).toHaveBeenCalledTimes(3);
    act(() => {
      result.current.clearInterval(id);
      vi.advanceTimersByTime(500);
    });
    expect(fn).toHaveBeenCalledTimes(3);
    unmount();
  });

  it('stops an interval on unmount', () => {
    const { result, unmount } = renderHook(() => useSafeTimeouts());
    const fn = vi.fn();
    act(() => {
      result.current.setInterval(fn, 100);
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(fn).toHaveBeenCalledTimes(2);
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('clearTimeout on an undefined id is a no-op', () => {
    const { result } = renderHook(() => useSafeTimeouts());
    expect(() => {
      act(() => {
        result.current.clearTimeout(undefined);
        result.current.clearInterval(undefined);
      });
    }).not.toThrow();
  });

  it('returns a stable api reference across rerenders', () => {
    const { result, rerender } = renderHook(() => useSafeTimeouts());
    const initialApi = result.current;

    rerender();

    expect(result.current).toBe(initialApi);
    expect(result.current.setTimeout).toBe(initialApi.setTimeout);
    expect(result.current.setInterval).toBe(initialApi.setInterval);
    expect(result.current.clearTimeout).toBe(initialApi.clearTimeout);
    expect(result.current.clearInterval).toBe(initialApi.clearInterval);
  });

  it('still fires callbacks when mounted under React.StrictMode', () => {
    const StrictModeWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children);
    const { result } = renderHook(() => useSafeTimeouts(), {
      wrapper: StrictModeWrapper,
    });
    const fn = vi.fn();

    act(() => {
      result.current.setTimeout(fn, 100);
      vi.advanceTimersByTime(100);
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
