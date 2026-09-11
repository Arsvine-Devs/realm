import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getBlogPostEntryMock,
  getPostBySlugAndContentLocaleMock,
  hasValidAccessGrantMock,
  serializeMock,
} = vi.hoisted(() => ({
  getBlogPostEntryMock: vi.fn(),
  getPostBySlugAndContentLocaleMock: vi.fn(),
  hasValidAccessGrantMock: vi.fn(),
  serializeMock: vi.fn(),
}));

vi.mock('@/features/blog/server/blog', () => ({
  getBlogPostEntry: getBlogPostEntryMock,
  getPostBySlugAndContentLocale: getPostBySlugAndContentLocaleMock,
  isBlogContentLocale: (value: unknown) =>
    typeof value === 'string' && ['zh-CN', 'zh-TW', 'en', 'ja', 'ru', 'fr'].includes(value),
}));

vi.mock('@/shared/lib/content/access-grant', () => ({
  hasValidAccessGrant: hasValidAccessGrantMock,
}));

vi.mock('next-mdx-remote/serialize', () => ({
  serialize: serializeMock,
}));

import handler from '@/features/blog/server/postVariantHandler';

function createRequest(cookie?: string) {
  return new Request('https://arsvine.com/api/post-variant?locale=zh-CN&slug=protected-post', {
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}

describe('/api/post-variant', () => {
  beforeEach(() => {
    getBlogPostEntryMock.mockReset();
    getPostBySlugAndContentLocaleMock.mockReset();
    hasValidAccessGrantMock.mockReset();
    serializeMock.mockReset();
  });

  it('rejects unauthorized protected requests before fetching article content', async () => {
    getBlogPostEntryMock.mockResolvedValue({
      slug: 'protected-post',
      access: { mode: 'totp', group: 'family' },
    });
    hasValidAccessGrantMock.mockReturnValue(false);

    const response = await handler(createRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Access grant required.' },
    });
    expect(getPostBySlugAndContentLocaleMock).not.toHaveBeenCalled();
    expect(serializeMock).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Cookie');
  });

  it('allows protected content only after a valid access grant', async () => {
    getBlogPostEntryMock.mockResolvedValue({
      slug: 'protected-post',
      access: { mode: 'totp', group: 'family' },
    });
    hasValidAccessGrantMock.mockReturnValue(true);
    getPostBySlugAndContentLocaleMock.mockResolvedValue({
      meta: {
        slug: 'protected-post',
        title: 'Protected Post',
        date: '2026-06-08',
        excerpt: 'Secret',
        tags: [],
        readingMinutes: 1,
        access: { mode: 'totp', group: 'family' },
      },
      content: '# secret',
    });
    serializeMock.mockResolvedValue({
      compiledSource: 'compiled',
      frontmatter: {},
      scope: {},
    });

    const response = await handler(createRequest('arsvine_post_access=signed-token'));

    expect(response.status).toBe(200);
    expect(getPostBySlugAndContentLocaleMock).toHaveBeenCalledWith('protected-post', 'zh-CN');
    expect(serializeMock).toHaveBeenCalledWith('# secret');
  });
});
