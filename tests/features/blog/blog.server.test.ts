import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchPublishedBlogIndexMock, fetchPublishedPostVariantMock } = vi.hoisted(() => ({
  fetchPublishedBlogIndexMock: vi.fn(),
  fetchPublishedPostVariantMock: vi.fn(),
}));

vi.mock('@/shared/lib/content/content-api', () => ({
  fetchPublishedBlogIndex: fetchPublishedBlogIndexMock,
  fetchPublishedPostVariant: fetchPublishedPostVariantMock,
}));

import {
  getAllPostsForLocale,
  getPostBySlugAndContentLocale,
  getPostMetaBySlugAndLocale,
  getProtectedPostPublicMeta,
  normalizeAccess,
} from '@/features/blog/server/blog';

beforeEach(() => {
  fetchPublishedBlogIndexMock.mockReset();
  fetchPublishedPostVariantMock.mockReset();
});

describe('normalizeAccess', () => {
  it('returns the public shape when mode is not totp', () => {
    expect(normalizeAccess({ mode: 'public' })).toEqual({ mode: 'public' });
  });

  it('returns public when input is undefined', () => {
    expect(normalizeAccess(undefined)).toEqual({ mode: 'public' });
  });

  it('trims the totp group and falls back to undefined on empty', () => {
    expect(normalizeAccess({ mode: 'totp', group: '  friends-a  ' })).toEqual({
      mode: 'totp',
      group: 'friends-a',
    });
    expect(normalizeAccess({ mode: 'totp', group: '   ' })).toEqual({
      mode: 'totp',
      group: undefined,
    });
  });

  it('omits group key when none provided', () => {
    const result = normalizeAccess({ mode: 'totp' });
    expect(result).toEqual({ mode: 'totp', group: undefined });
  });
});

describe('getAllPostsForLocale', () => {
  it('prefers variant-localized tags for the requested locale', async () => {
    fetchPublishedBlogIndexMock.mockResolvedValue({
      version: 1,
      updatedAt: '2026-06-17T00:00:00.000Z',
      posts: [
        {
          slug: 'stop',
          date: '2026-05-12',
          updatedAt: '2026-05-12T00:00:00.000Z',
          tags: ['随笔'],
          pinned: false,
          access: { mode: 'public' },
          availableLocales: ['zh-CN', 'en'],
          variants: {
            'zh-CN': {
              title: '停',
              excerpt: '中文摘要',
              tags: ['随笔'],
            },
            en: {
              title: 'Where We Stop',
              excerpt: 'English excerpt',
              tags: ['Essay'],
              originLocale: 'zh-CN',
            },
          },
        },
      ],
    });

    const posts = await getAllPostsForLocale('en');

    expect(posts).toHaveLength(1);
    expect(posts[0]?.tags).toEqual(['Essay']);
  });

  it('falls back to top-level tags when variant tags are missing', async () => {
    fetchPublishedBlogIndexMock.mockResolvedValue({
      version: 1,
      updatedAt: '2026-06-17T00:00:00.000Z',
      posts: [
        {
          slug: 'legacy-post',
          date: '2026-05-12',
          updatedAt: '2026-05-12T00:00:00.000Z',
          tags: ['随笔'],
          pinned: false,
          access: { mode: 'public' },
          availableLocales: ['zh-CN', 'en'],
          variants: {
            'zh-CN': {
              title: '旧文章',
              excerpt: '中文摘要',
            },
            en: {
              title: 'Legacy Post',
              excerpt: 'English excerpt',
            },
          },
        },
      ],
    });

    const posts = await getAllPostsForLocale('en');

    expect(posts).toHaveLength(1);
    expect(posts[0]?.tags).toEqual(['随笔']);
  });

  it('sanitizes protected posts in list-facing metadata', async () => {
    fetchPublishedBlogIndexMock.mockResolvedValue({
      version: 1,
      updatedAt: '2026-06-17T00:00:00.000Z',
      posts: [
        {
          slug: 'protected-post',
          date: '2026-05-12',
          updatedAt: '2026-05-12T00:00:00.000Z',
          tags: ['private'],
          pinned: false,
          access: { mode: 'totp', group: 'family' },
          availableLocales: ['zh-CN'],
          variants: {
            'zh-CN': {
              title: 'Protected Post',
              excerpt: 'Secret excerpt',
              tags: ['private'],
              readingMinutes: 9,
            },
          },
        },
      ],
    });

    const posts = await getAllPostsForLocale('zh-CN');

    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      slug: 'protected-post',
      title: 'Protected Post',
      excerpt: '',
      tags: [],
      readingMinutes: 0,
      access: { mode: 'totp', group: 'family' },
    });
  });
});

describe('post variant metadata', () => {
  it('keeps shared metadata aligned while using the appropriate reading-time source', async () => {
    fetchPublishedBlogIndexMock.mockResolvedValue({
      version: 1,
      updatedAt: '2026-06-17T00:00:00.000Z',
      posts: [
        {
          slug: 'metadata-paths',
          date: '2026-05-12',
          updatedAt: '2026-05-13T00:00:00.000Z',
          tags: ['fallback'],
          pinned: true,
          access: { mode: 'public' },
          availableLocales: ['en'],
          variants: {
            en: {
              title: 'Shared Metadata',
              excerpt: 'Entry excerpt',
              tags: ['essay'],
              originLocale: 'zh-CN',
              readingMinutes: 9,
            },
          },
        },
      ],
    });
    fetchPublishedPostVariantMock.mockResolvedValue({
      title: 'Ignored frontmatter title',
      excerpt: 'Entry excerpt',
      date: '2026-05-12',
      updatedAt: '2026-05-13T00:00:00.000Z',
      tags: ['essay'],
      originLocale: 'zh-CN',
      bodyMdx: 'word '.repeat(116),
    });

    const indexed = await getPostMetaBySlugAndLocale('metadata-paths', 'en');
    const loaded = await getPostBySlugAndContentLocale('metadata-paths', 'en');

    const { readingMinutes: indexedReadingMinutes, ...indexedFields } = indexed.meta;
    const { readingMinutes: loadedReadingMinutes, ...loadedFields } = loaded.meta;

    expect(indexedFields).toEqual(loadedFields);
    expect(indexedReadingMinutes).toBe(9);
    expect(loadedReadingMinutes).toBe(2);
  });
});

describe('getProtectedPostPublicMeta', () => {
  it('strips preview fields for protected content', () => {
    expect(
      getProtectedPostPublicMeta({
        slug: 'protected-post',
        title: 'Protected Post',
        date: '2026-05-12',
        excerpt: 'Secret excerpt',
        tags: ['private'],
        readingMinutes: 9,
        access: { mode: 'totp', group: 'family' },
      }),
    ).toMatchObject({
      slug: 'protected-post',
      title: 'Protected Post',
      date: '2026-05-12',
      excerpt: '',
      tags: [],
      readingMinutes: 0,
      access: { mode: 'totp', group: 'family' },
    });
  });
});
