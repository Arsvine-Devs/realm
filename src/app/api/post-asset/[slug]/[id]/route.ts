import { isSafeBlogSlugSegment } from '@/features/blog/model/blogClient';
import { hasValidAccessGrant } from '@/shared/lib/content/access-grant';
import { fetchProtectedAsset, fetchPublishedPostEntry } from '@/shared/lib/content/content-api';
import { parseCookieHeader } from '@/shared/server/http';

const assetId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  if (!isSafeBlogSlugSegment(slug) || !assetId.test(id)) {
    return new Response(null, { status: 404, headers });
  }

  try {
    const post = await fetchPublishedPostEntry(slug);
    const group = post?.access.mode === 'totp' ? post.access.group : undefined;
    if (!group) return new Response(null, { status: 404, headers });
    const cookies = parseCookieHeader(request.headers.get('cookie'));
    if (!hasValidAccessGrant({ cookies }, group)) {
      return new Response(null, { status: 403, headers });
    }

    const asset = await fetchProtectedAsset(slug, id, group, {
      range: request.headers.get('range'),
      signal: request.signal,
    });
    if (!asset.ok) {
      if (asset.status === 416) {
        const range = asset.headers.get('Content-Range');
        if (range) headers.set('Content-Range', range);
      }
      await asset.body?.cancel();
      const status = [403, 404, 416].includes(asset.status) ? asset.status : 502;
      return new Response(null, { status, headers });
    }
    for (const name of [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Content-Disposition',
      'Accept-Ranges',
    ]) {
      const value = asset.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(asset.body, { status: asset.status, headers });
  } catch {
    return new Response(null, { status: 502, headers });
  }
}
