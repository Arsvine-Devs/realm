import { hasValidAccessGrant } from '@/shared/lib/content/access-grant';
import { jsonResponse, parseCookieHeader } from '@/shared/server/http';

export default function handler(request: Request) {
  const group = new URL(request.url).searchParams.get('group')?.trim() ?? '';
  if (!group) {
    return jsonResponse(
      {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'Missing group parameter.' },
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
    );
  }

  const granted = hasValidAccessGrant(
    {
      cookies: parseCookieHeader(request.headers.get('cookie')),
    },
    group,
  );
  return jsonResponse(
    { ok: true, granted },
    {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    },
  );
}
