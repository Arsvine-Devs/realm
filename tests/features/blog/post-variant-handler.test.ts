import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getBlogPostEntryMock, getPostBySlugAndContentLocaleMock, hasValidAccessGrantMock } =
  vi.hoisted(() => ({
    getBlogPostEntryMock: vi.fn(),
    getPostBySlugAndContentLocaleMock: vi.fn(),
    hasValidAccessGrantMock: vi.fn(),
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
      assets: {},
    });

    const response = await handler(createRequest('arsvine_post_access=signed-token'));

    expect(response.status).toBe(200);
    expect(getPostBySlugAndContentLocaleMock).toHaveBeenCalledWith(
      'protected-post',
      'zh-CN',
      'family',
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      bodyDocument: { markdown: '# secret', assets: {} },
    });
  });

  it('checks the access group returned with the body if publication changed during the request', async () => {
    getBlogPostEntryMock.mockResolvedValue({ access: { mode: 'totp', group: 'old-group' } });
    hasValidAccessGrantMock.mockImplementation((_, group) => group === 'old-group');
    getPostBySlugAndContentLocaleMock.mockResolvedValue({
      meta: { access: { mode: 'totp', group: 'new-group' } },
      content: '# secret',
    });

    const response = await handler(createRequest('arsvine_post_access=signed-token'));

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('# secret');
  });
});
