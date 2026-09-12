import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useBlogPostState from '@/features/blog/model/useBlogPostState';
import type { BlogPostMeta } from '@/shared/types';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@xstate/react', () => ({
  useActor: (_machine: unknown, { input }: { input: Record<string, unknown> }) => [
    {
      context: {
        ...input,
        displayedContentLocale: input.actualContentLocale,
        authState: 'granted',
        errorMessage: '',
      },
      matches: (state: string) => state === 'ready',
    },
    send,
  ],
}));

const meta: BlogPostMeta = {
  slug: 'init',
  title: 'Init',
  date: '2026-01-01',
  excerpt: 'Excerpt',
  tags: [],
  readingMinutes: 1,
  access: { mode: 'public' },
};
const contentVariants = {};
const mdxSource = { compiledSource: 'test', frontmatter: {}, scope: {} };

function buildProps(hydrationReady: boolean) {
  return {
    currentUrl: '/en/blog/init',
    locale: 'en' as const,
    meta,
    mdxSource,
    translationStatus: 'source' as const,
    actualLocale: 'en' as const,
    actualContentLocale: 'en' as const,
    availableContentLocales: ['en' as const],
    contentVariants,
    access: { mode: 'public' },
    isProtected: false,
    hydrationReady,
  };
}

describe('useBlogPostState article synchronization', () => {
  beforeEach(() => send.mockReset());

  it('does not resend the initial article during Strict Mode effect replay', () => {
    const { rerender } = renderHook(
      ({ hydrationReady }) => useBlogPostState(buildProps(hydrationReady)),
      {
        initialProps: { hydrationReady: false },
        wrapper: StrictMode,
      },
    );

    expect(send).not.toHaveBeenCalled();

    rerender({ hydrationReady: true });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ARTICLE_CHANGED',
        hydrationReady: true,
        slug: 'init',
      }),
    );
  });
});
