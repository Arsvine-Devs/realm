import { revalidatePath } from 'next/cache';
import { locales } from '@/shared/contracts/locale';
import { getAssetRevalidationPaths as getPortfolioPaths } from '@/features/portfolio/contracts/data';
import { getAssetRevalidationPaths as getLifePaths } from '@/features/life/contracts/data';
import { enforceRateLimit } from '@/shared/lib/content/rate-limit';
import { getClientAddress, jsonResponse } from '@/shared/server/http';
import { authenticateRevalidation } from '@/shared/server/revalidation';

export default async function handler(request: Request) {
  const limiter = await enforceRateLimit(
    `revalidate-assets:${getClientAddress(request)}`,
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

  const paths = locales.flatMap((locale) => [
    `/${locale}`,
    `/${locale}/content`,
    `/${locale}/friends`,
    ...getPortfolioPaths(locale),
    ...getLifePaths(locale),
  ]);
  const results = await Promise.allSettled(paths.map(async (route) => revalidatePath(route)));
  const failed: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const route = paths[index];
      failed.push(route);
      console.error('[api/revalidate-assets] failed for', route, result.reason);
    }
  });

  if (failed.length === paths.length) {
    return jsonResponse(
      { revalidated: false, paths, failed, message: 'All revalidations failed' },
      { status: 500 },
    );
  }
  if (failed.length > 0) {
    return jsonResponse({ revalidated: false, paths, failed, partial: true });
  }
  return jsonResponse({ revalidated: true, paths, failed: [] });
}
