import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTweetTypewriter } from '@/features/tweets/ui/TweetsSection';
import { DEFAULT_TYPEWRITER_DURATION_MS } from '@/shared/lib/typewriter';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Tweets typewriter', () => {
  it('animates on first display and resolves changed targets after the scramble sequence', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ target }) => useTweetTypewriter(target, false), {
      initialProps: { target: 'first' },
    });

    expect(result.current.displayText).toBe('first');
    expect(result.current.isAnimating).toBe(false);

    act(() => vi.advanceTimersByTime(16));
    expect(result.current.isAnimating).toBe(true);
    expect(result.current.displayText).not.toBe('first');

    rerender({ target: '世界' });
    expect(result.current.isAnimating).toBe(true);
    expect(result.current.displayText).not.toBe('世界');

    act(() => vi.runAllTimers());
    expect(result.current.displayText).toBe('世界');
    expect(result.current.isAnimating).toBe(false);
  });

  it('shows the complete target without animation when reduced motion is enabled', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ target, reducedMotion }) => useTweetTypewriter(target, reducedMotion),
      { initialProps: { target: 'first', reducedMotion: false } },
    );

    rerender({ target: '日本語', reducedMotion: true });

    expect(result.current.displayText).toBe('日本語');
    expect(result.current.isAnimating).toBe(false);
  });

  it('deletes a long previous message at a faster per-character pace', () => {
    vi.useFakeTimers();
    const previous = 'A'.repeat(120);
    const { result, rerender } = renderHook(({ target }) => useTweetTypewriter(target, false), {
      initialProps: { target: previous },
    });

    rerender({ target: 'new message' });
    act(() => vi.advanceTimersByTime(192));

    expect(result.current.displayText.length).toBeLessThan(60);
    expect(result.current.isAnimating).toBe(true);
  });

  it('keeps the animation active until its full duration even when a frame matches punctuation-only text', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ target }) => useTweetTypewriter(target, false), {
      initialProps: { target: 'previous text' },
    });

    rerender({ target: '—' });
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.displayText).toBe('—');
    expect(result.current.isAnimating).toBe(true);

    act(() => vi.advanceTimersByTime(DEFAULT_TYPEWRITER_DURATION_MS - 1000));
    expect(result.current.isAnimating).toBe(false);
  });

  it('keeps the whole transition duration constant as the text gets longer', () => {
    vi.useFakeTimers();

    const measureTransition = (target: string) => {
      vi.setSystemTime(0);
      const view = renderHook(({ text }) => useTweetTypewriter(text, false), {
        initialProps: { text: 'previous text' },
      });
      view.rerender({ text: target });
      act(() => vi.runAllTimers());
      const elapsed = Date.now();
      view.unmount();
      return elapsed;
    };

    expect(measureTransition('Short')).toBe(DEFAULT_TYPEWRITER_DURATION_MS);
    vi.clearAllTimers();
    expect(measureTransition('A longer message '.repeat(12))).toBe(DEFAULT_TYPEWRITER_DURATION_MS);
  });
});
