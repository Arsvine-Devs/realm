import { revalidatePath } from 'next/cache';
import { locales } from '@/shared/contracts/locale';
import { jsonResponse } from '@/shared/server/http';
import { withRevalidationRequest } from '@/shared/server/revalidation';

export default async function handler(request: Request) {
  return withRevalidationRequest(
    request,
    { limiterName: 'revalidate-tweets', allowQuerySecret: true },
    async () => {
      try {
        const paths = locales.map((locale) => `/${locale}/tweets`);

        for (const path of paths) {
          revalidatePath(path);
        }

        return jsonResponse({ revalidated: true, paths });
      } catch (error) {
        console.error('[api/revalidate] tweets revalidate failed:', error);
        return jsonResponse({ message: 'Revalidate failed' }, { status: 500 });
      }
    },
  );
}
