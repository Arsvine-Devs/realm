import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { enforceRateLimitMock } = vi.hoisted(() => ({
  enforceRateLimitMock: vi.fn(),
}));

vi.mock('@/shared/lib/content/rate-limit', () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

import handler from '@/shared/server/hitokotoHandler';

const ORIGINAL_TRUST_PROXY = process.env.TRUST_PROXY;
const ORIGINAL_VERCEL = process.env.VERCEL;

function request(headers: Record<string, string> = {}) {
  return new Request('https://arsvine.com/api/hitokoto', { headers });
}

beforeEach(() => {
  enforceRateLimitMock.mockReset().mockResolvedValue({ ok: true, remaining: 29, retryAfterMs: 0 });
  delete process.env.VERCEL;
  process.env.TRUST_PROXY = '1';
});

afterEach(() => {
  if (ORIGINAL_TRUST_PROXY === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = ORIGINAL_TRUST_PROXY;
  if (ORIGINAL_VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = ORIGINAL_VERCEL;
});

describe('/api/hitokoto', () => {
  it('rate-limits by client IP and returns the sentence on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hitokoto: '  一言demo  ' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await handler(request({ 'X-Forwarded-For': '203.0.113.25' }));

    expect(enforceRateLimitMock).toHaveBeenCalledWith('hitokoto:203.0.113.25', 30, 600_000);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: '一言demo' });
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  it('returns 429 with Retry-After and skips the upstream call when limited', async () => {
    enforceRateLimitMock.mockResolvedValue({ ok: false, remaining: 0, retryAfterMs: 1_250 });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await handler(request({ 'X-Forwarded-For': '203.0.113.25' }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('2');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to the unknown bucket when proxy trust is off', async () => {
    process.env.TRUST_PROXY = '0';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hitokoto: 'x' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await handler(request({ 'X-Forwarded-For': '203.0.113.25' }));

    expect(enforceRateLimitMock).toHaveBeenCalledWith('hitokoto:unknown', 30, 600_000);
  });
});
