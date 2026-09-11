import { revalidatePath } from 'next/cache';
import { locales } from '@/shared/contracts/locale';
import { enforceRateLimit } from '@/shared/lib/content/rate-limit';
import { getClientAddress, jsonResponse } from '@/shared/server/http';
import { authenticateRevalidation } from '@/shared/server/revalidation';

export default async function handler(request: Request) {
  // Cap how often the revalidate endpoint can fire even with a valid secret —
  // a leaked secret should be replaceable by rotating env, but until that
  // happens it shouldn't enable unbounded cache thrash.
  const limiter = await enforceRateLimit(
    `revalidate-content:${getClientAddress(request)}`,
    30,
    60_000,
  );
  if (!limiter.ok) {
    return jsonResponse(
      { message: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limiter.retryAfterMs / 1000)) },
      },
    );
  }

  const auth = await authenticateRevalidation(request);
  if (!auth.ok) return auth.response;
  const { body } = auth;

  const slug =
    typeof body.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) ? body.slug : '';
  const contentPaths = locales.map((locale) => `/${locale}/content`);
  const blogPaths = slug ? locales.map((locale) => `/${locale}/blog/${slug}`) : [];

  try {
    for (const path of contentPaths) {
      revalidatePath(path);
    }

    const skipped: string[] = [];
    for (const path of blogPaths) {
      try {
        revalidatePath(path);
      } catch {
        skipped.push(path);
      }
    }

    return jsonResponse({
      revalidated: true,
      paths: [...contentPaths, ...blogPaths.filter((path) => !skipped.includes(path))],
      ...(skipped.length > 0 ? { skipped } : {}),
    });
  } catch (error) {
    // Log details server-side; never echo internal error text back to a
    // possibly-malicious caller.
    console.error('[api/revalidate-content] revalidate failed:', error);
    return jsonResponse({ message: 'Revalidate failed' }, { status: 500 });
  }
}
