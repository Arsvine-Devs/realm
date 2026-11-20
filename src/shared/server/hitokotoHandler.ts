import { enforceRateLimit } from '@/shared/lib/content/rate-limit';
import { getClientAddress, jsonResponse } from './http';

const UPSTREAM =
  'https://v1.hitokoto.cn/?c=d&c=i&c=k&min_length=10&max_length=30&encode=json&charset=utf-8';
const CACHE_TTL_MS = 60_000;
const CACHE_HEADERS = { 'Cache-Control': `public, max-age=${CACHE_TTL_MS / 1000}` };
const FETCH_TIMEOUT_MS = 5_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 600_000; // 10 min

let cache: { text: string; expiresAt: number } | null = null;

export default async function handler(request: Request) {
  const limiter = await enforceRateLimit(
    `hitokoto:${getClientAddress(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!limiter.ok) {
    return jsonResponse(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'private, no-store',
          'Retry-After': String(Math.ceil(limiter.retryAfterMs / 1000)),
        },
      },
    );
  }

  if (cache && cache.expiresAt > Date.now()) {
    return jsonResponse({ text: cache.text }, { headers: CACHE_HEADERS });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(UPSTREAM, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const data = await upstream.json();
    const text = typeof data?.hitokoto === 'string' ? data.hitokoto.trim() : '';
    if (!text) throw new Error('empty hitokoto');
    cache = { text, expiresAt: Date.now() + CACHE_TTL_MS };
    return jsonResponse({ text }, { headers: CACHE_HEADERS });
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[hitokoto] upstream failed:', (err as Error).message);
    return jsonResponse({ error: 'upstream_unavailable' }, { status: 502 });
  }
}
