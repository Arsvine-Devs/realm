import { revalidatePath } from 'next/cache';
import { locales } from '@/shared/contracts/locale';
import { jsonResponse } from '@/shared/server/http';
import { withRevalidationRequest } from '@/shared/server/revalidation';

export default async function handler(request: Request) {
  return withRevalidationRequest(request, { limiterName: 'revalidate-content' }, async (body) => {
    const slug =
      typeof body.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)
        ? body.slug
        : '';
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
      console.error('[api/revalidate-content] revalidate failed:', error);
      return jsonResponse({ message: 'Revalidate failed' }, { status: 500 });
    }
  });
}
