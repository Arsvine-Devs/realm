import { revalidatePath } from 'next/cache';
import { locales } from '@/shared/contracts/locale';
import { enforceRateLimit } from '@/shared/lib/content/rate-limit';
import { getClientAddress, jsonResponse } from '@/shared/server/http';
import { authenticateRevalidation } from '@/shared/server/revalidation';

export default async function handler(request: Request) {
  const limiter = await enforceRateLimit(
    `revalidate-tweets:${getClientAddress(request)}`,
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

  const auth = await authenticateRevalidation(request, { allowQuerySecret: true });
  if (!auth.ok) return auth.response;

  try {
    const paths = locales.map((locale) => `/${locale}/tweets`);

    for (const path of paths) {
      revalidatePath(path);
    }

    return jsonResponse({
      revalidated: true,
      paths,
    });
  } catch (error) {
    console.error('[api/revalidate] tweets revalidate failed:', error);
    return jsonResponse({ message: 'Revalidate failed' }, { status: 500 });
  }
}
