import { beforeEach, describe, expect, it, vi } from 'vitest';

const { currentPost, hasGrant, readAsset } = vi.hoisted(() => ({
  currentPost: vi.fn(),
  hasGrant: vi.fn(),
  readAsset: vi.fn(),
}));

vi.mock('@/shared/lib/content/content-api', () => ({
  fetchPublishedPostEntry: currentPost,
  fetchProtectedAsset: readAsset,
}));
vi.mock('@/shared/lib/content/access-grant', () => ({ hasValidAccessGrant: hasGrant }));

import { GET } from '@/app/api/post-asset/[slug]/[id]/route';

const id = '11111111-2222-4333-a444-555555555555';
const slug = 'private-post';
const path = `https://arsvine.com/api/post-asset/${slug}/${id}`;
const context = { params: Promise.resolve({ slug, id }) };

beforeEach(() => {
  vi.resetAllMocks();
  currentPost.mockResolvedValue({ access: { mode: 'totp', group: 'readers' } });
});

describe('protected post media', () => {
  it('checks the current group before issuing a media request', async () => {
    hasGrant.mockReturnValue(false);
    const response = await GET(new Request(path), context);
    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Cookie');
    expect(readAsset).not.toHaveBeenCalled();
  });

  it('passes the verified group and preserves partial response headers', async () => {
    hasGrant.mockReturnValue(true);
    readAsset.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 206,
        headers: {
          'Content-Type': 'image/png',
          'Content-Range': 'bytes 0-2/21',
          'Accept-Ranges': 'bytes',
        },
      }),
    );
    const request = new Request(path, {
      headers: { Range: 'bytes=0-2', Cookie: 'arsvine_post_access=example' },
    });
    const response = await GET(request, context);
    expect(hasGrant).toHaveBeenCalledWith(expect.anything(), 'readers');
    expect(readAsset).toHaveBeenCalledWith(slug, id, 'readers', {
      range: 'bytes=0-2',
      signal: request.signal,
    });
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 0-2/21');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('retains range metadata without relaying an upstream error body', async () => {
    hasGrant.mockReturnValue(true);
    readAsset.mockResolvedValue(
      new Response('internal details', {
        status: 416,
        headers: { 'Content-Range': 'bytes */21' },
      }),
    );
    const response = await GET(new Request(path, { headers: { Range: 'bytes=22-' } }), context);
    expect(response.status).toBe(416);
    expect(response.headers.get('Content-Range')).toBe('bytes */21');
    expect(await response.text()).toBe('');
  });
});
