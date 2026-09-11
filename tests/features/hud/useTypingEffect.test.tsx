import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { translate } = vi.hoisted(() => {
  const translations = {
    taglinePrimary: 'A',
    taglineSecondary: '中',
  };

  return {
    translate: (key: keyof typeof translations) => translations[key],
  };
});

vi.mock('@/features/navigation/model/NavigationRuntime', () => ({
  useNavigationRuntime: () => ({
    pathname: '/zh-CN',
    asPath: '/zh-CN',
    query: { locale: 'zh-CN' },
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => translate,
}));

import {
  useEnvParamsTypingEffect,
  useFateTypingEffect,
} from '@/features/hud/model/useTypingEffect';

describe('typing effect hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('aborts an in-flight hitokoto request and clears the Fate buffer when hidden', () => {
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(
      ({ textVisible }: { textVisible: boolean }) => useFateTypingEffect(textVisible),
      { initialProps: { textVisible: true } },
    );

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/hitokoto', expect.anything());
    expect(requestSignal).toBeDefined();
    expect(requestSignal?.aborted).toBe(false);

    rerender({ textVisible: false });

    expect(requestSignal?.aborted).toBe(true);
    expect(result.current).toEqual({
      displayedFateText: '',
      isFateTypingActive: false,
    });
  });

  it('aborts the in-flight hitokoto request and clears the buffer when the tab becomes hidden', () => {
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      ({ textVisible }: { textVisible: boolean }) => useFateTypingEffect(textVisible),
      { initialProps: { textVisible: true } },
    );

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/hitokoto', expect.anything());
    expect(requestSignal?.aborted).toBe(false);

    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(requestSignal?.aborted).toBe(true);
    expect(result.current.displayedFateText).toBe('');
    // isFateTypingActive 跟随 textVisible，不受 tab 可见性影响
    expect(result.current.isFateTypingActive).toBe(true);
  });

  it('boots Env telemetry after one second and resets it when text becomes hidden', () => {
    const { result, rerender } = renderHook(
      ({ textVisible, routeEnabled }: { textVisible: boolean; routeEnabled: boolean }) =>
        useEnvParamsTypingEffect(textVisible, routeEnabled),
      { initialProps: { textVisible: true, routeEnabled: true } },
    );

    expect(result.current.envData).toBeNull();
    expect(result.current.envDataVersion).toBe(0);

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(result.current.envData).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.envData).not.toBeNull();
    expect(result.current.envDataVersion).toBe(1);
    expect(result.current.envArtifactStage).toBe(0);
    expect(result.current.isEnvParamsTyping).toBe(true);
    expect(result.current.displayedEnvParams).not.toBe('');

    rerender({ textVisible: false, routeEnabled: true });

    expect(result.current).toEqual({
      displayedEnvParams: '',
      isEnvParamsTyping: false,
      envData: null,
      envDataVersion: 0,
      envArtifactStage: 0,
    });
  });
});
