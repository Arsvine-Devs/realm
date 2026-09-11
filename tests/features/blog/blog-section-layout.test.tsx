import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
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
        handleBlogItemClick={vi.fn()}
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

  it('signals navigation intent only on primary pointer or keyboard activation', () => {
    const handleBlogItemClick = vi.fn();
    const handleBlogItemIntent = vi.fn();
    render(
      <BlogSection
        blogSectionRef={{ current: null }}
        locale="en"
        handleBlogItemClick={handleBlogItemClick}
        handleBlogItemIntent={handleBlogItemIntent}
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
    const card = screen.getByRole('link');

    fireEvent.mouseEnter(card);
    fireEvent.focus(card);
    fireEvent.pointerDown(card, { button: 2 });
    expect(handleBlogItemIntent).not.toHaveBeenCalled();

    fireEvent.pointerDown(card, { button: 0 });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(handleBlogItemIntent).toHaveBeenCalledTimes(3);
    expect(handleBlogItemClick).toHaveBeenCalledTimes(2);
  });
});
