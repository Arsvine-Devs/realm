import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/shared/hooks/useMediaQuery', () => ({
  useReducedMotion: () => false,
}));

import BlogSection from '@/features/blog/ui/blog/BlogSection';
import styles from '@/features/blog/styles/BlogSection.module.scss';

afterEach(cleanup);

describe('BlogSection layout', () => {
  it('uses blog-owned section and list styles', () => {
    const { container } = render(
      <BlogSection
        blogSectionRef={{ current: null }}
        locale="en"
        navigateTo={vi.fn()}
        posts={[
          {
            slug: 'signal',
            title: 'Signal',
            date: '2026-07-12',
            excerpt: 'A layout regression test post.',
            tags: [],
            readingMinutes: 1,
            access: { mode: 'public' },
          },
        ]}
      />,
    );

    expect(container.firstElementChild?.classList.contains(styles.contentSection)).toBe(true);
    const postList = container.querySelector(`.${styles.postList}`);
    expect(postList).toBeTruthy();
    expect(postList?.contains(screen.getByText('Signal'))).toBe(true);
  });

  it('exposes a localized native link for the live article', () => {
    render(
      <BlogSection
        blogSectionRef={{ current: null }}
        locale="en"
        navigateTo={vi.fn()}
        posts={[
          {
            slug: 'signal',
            title: 'Signal',
            date: '2026-07-12',
            excerpt: 'A navigation intent test post.',
            tags: [],
            readingMinutes: 1,
            access: { mode: 'public' },
          },
        ]}
      />,
    );
    const card = screen.getByRole('link', { name: 'Signal' });
    expect(card.tagName).toBe('A');
    expect(card.getAttribute('href')).toBe('/en/blog/signal?lang=en');
  });
});
