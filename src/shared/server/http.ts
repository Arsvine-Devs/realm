import { timingSafeEqual } from 'node:crypto';

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', JSON_CONTENT_TYPE);
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function parseCookieHeader(rawCookie: string | null): Record<string, string> {
  if (!rawCookie) return {};

  return Object.fromEntries(
    rawCookie.split(';').flatMap((part) => {
      const [rawName, ...rawValue] = part.trim().split('=');
      if (!rawName || rawValue.length === 0) return [];
      try {
        return [[rawName, decodeURIComponent(rawValue.join('='))]];
      } catch {
        return [];
      }
    }),
  );
}

export function secureStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isProxyTrusted() {
  const configured = process.env.TRUST_PROXY?.trim().toLowerCase();
  if (configured) {
    return configured === '1' || configured === 'true' || configured === 'yes';
  }
  return process.env.VERCEL === '1';
}

export function getClientAddress(request: Request) {
  if (!isProxyTrusted()) return 'unknown';

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}
