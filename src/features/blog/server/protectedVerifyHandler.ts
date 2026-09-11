import { createAccessGrantCookie } from '@/shared/lib/content/access-grant';
import { normalizeNextPath } from '@/shared/lib/content/access-api';
import { enforceRateLimit } from '@/shared/lib/content/rate-limit';
import { verifyTotpGroupToken } from '@/shared/lib/content/totp';
import { getClientAddress, jsonResponse, readJsonObject } from '@/shared/server/http';

export default async function handler(request: Request) {
  const body = await readJsonObject(request);
  const group = typeof body.group === 'string' ? body.group.trim() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const next = normalizeNextPath(body.next);
  const headers = { 'Cache-Control': 'private, no-store' };

  if (!group || !token) {
    return jsonResponse(
      {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'Missing group or token.' },
      },
      { status: 400, headers },
    );
  }

  const limiter = await enforceRateLimit(`totp:${getClientAddress(request)}:${group}`, 5, 60_000);
  if (!limiter.ok) {
    return jsonResponse(
      {
        ok: false,
        error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
      },
      {
        status: 429,
        headers: { ...headers, 'Retry-After': String(Math.ceil(limiter.retryAfterMs / 1000)) },
      },
    );
  }

  const result = verifyTotpGroupToken(group, token);
  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: result.reason === 'group_not_found' ? 'GROUP_NOT_FOUND' : 'TOTP_INVALID',
          message:
            result.reason === 'group_not_found'
              ? 'Access group not found.'
              : 'Token is invalid or expired.',
        },
      },
      { status: result.reason === 'group_not_found' ? 404 : 401, headers },
    );
  }

  return jsonResponse(
    { ok: true, redirectTo: next },
    {
      headers: { ...headers, 'Set-Cookie': createAccessGrantCookie(group) },
    },
  );
}
