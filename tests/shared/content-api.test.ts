import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchPublishedBlogIndex,
  fetchPublishedPostVariant,
} from '@/shared/lib/content/content-api';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('CONTENT_BASE_URL', 'https://content.example.com');
  vi.stubEnv('AUTH_ISSUER', 'https://auth.example.com');
  vi.stubEnv('CONTENT_SERVICE_CLIENT_ID', 'realm-reader');
  vi.stubEnv('CONTENT_SERVICE_CLIENT_SECRET', 'reader-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('published Content client', () => {
  it('reads public data from the configured Content origin', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ publishedAt: '2026-09-15T00:00:00.000Z', posts: [] }),
    );

    await expect(fetchPublishedBlogIndex()).resolves.toEqual({
      version: 1,
      updatedAt: '2026-09-15T00:00:00.000Z',
      posts: [],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://content.example.com/v1/posts',
      expect.objectContaining({
        next: { revalidate: 300 },
        headers: expect.any(Headers),
      }),
    );
  });

  it('obtains protected-content tokens from the stable Auth issuer', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'service-token', expires_in: 300 }))
      .mockResolvedValueOnce(
        jsonResponse({
          variant: {
            slug: 'private-post',
            locale: 'zh-CN',
            bodyMdx: '# private',
          },
        }),
      );

    await expect(
      fetchPublishedPostVariant('private-post', 'zh-CN', { protected: true }),
    ).resolves.toMatchObject({ bodyMdx: '# private' });

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] ?? [];
    expect(tokenUrl).toBe('https://auth.example.com/api/auth/oauth2/token');
    expect(tokenInit?.method).toBe('POST');
    expect(new Headers(tokenInit?.headers).get('Authorization')).toBe(
      `Basic ${Buffer.from('realm-reader:reader-secret', 'utf8').toString('base64')}`,
    );
    expect(new URLSearchParams(String(tokenInit?.body)).get('scope')).toBe(
      'content:protected:read',
    );

    const [contentUrl, contentInit] = fetchMock.mock.calls[1] ?? [];
    expect(contentUrl).toBe(
      'https://content.example.com/v1/internal/posts/private-post/variants/zh-CN',
    );
    expect(new Headers(contentInit?.headers).get('Authorization')).toBe('Bearer service-token');
    expect(contentInit?.cache).toBe('no-store');
  });
});
