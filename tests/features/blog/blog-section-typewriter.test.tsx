import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useReducedMotion: () => false,
}));

import BlogSection from '@/features/blog/ui/blog/BlogSection';
import { DEFAULT_TYPEWRITER_DURATION_MS } from '@/shared/lib/typewriter';

let intersectionCallback: IntersectionObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  observe() {}

  disconnect() {}

  unobserve() {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  intersectionCallback = null;
});

describe('BlogSection excerpt typewriter', () => {
  it('scrambles an excerpt on entry and exposes its canonical text until the fixed duration ends', () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const excerptText = 'A blog introduction';
    const { container } = render(
      <BlogSection
        blogSectionRef={{ current: null }}
        locale="en"
        handleBlogItemClick={vi.fn()}
        posts={[
          {
            slug: 'introduction',
            title: 'Introduction',
            date: '2026-09-25',
            excerpt: excerptText,
            tags: [],
            readingMinutes: 1,
            access: { mode: 'public' },
          },
        ]}
      />,
    );

    const excerpt = container.querySelector('p');
    expect(excerpt?.textContent).toBe(excerptText);
    expect(intersectionCallback).not.toBeNull();

    act(() => {
      intersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(
      [...(excerpt?.querySelectorAll('[class*=wordVisual]') ?? [])]
        .map((element) => element.textContent)
        .join(''),
    ).toBe('');
    expect(excerpt?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText(excerptText, { selector: 'span' })).toBeTruthy();

    act(() => vi.advanceTimersByTime(DEFAULT_TYPEWRITER_DURATION_MS));

    expect(excerpt?.textContent).toBe(excerptText);
    expect(excerpt?.getAttribute('aria-hidden')).toBe('false');
    expect(screen.queryByText(excerptText, { selector: 'span' })).toBeNull();
  });
});
