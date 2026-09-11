import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { enforceRateLimitMock, revalidatePathMock } = vi.hoisted(() => ({
  enforceRateLimitMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/shared/lib/content/rate-limit', () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

import revalidateAssets from '@/features/assets/server/revalidateAssetsHandler';
import revalidateContent from '@/features/blog/server/revalidateContentHandler';
import revalidateTweets from '@/features/tweets/server/revalidateHandler';

const ORIGINAL_SECRET = process.env.REVALIDATE_SECRET;

function postRequest(path: string, body: Record<string, unknown>) {
  return new Request(`https://arsvine.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const endpointCases = [
  ['assets', '/api/revalidate-assets', revalidateAssets],
  ['content', '/api/revalidate-content', revalidateContent],
  ['tweets', '/api/revalidate', revalidateTweets],
] as const;

beforeEach(() => {
  process.env.REVALIDATE_SECRET = 'test-secret';
  enforceRateLimitMock.mockReset();
  enforceRateLimitMock.mockResolvedValue({ ok: true, remaining: 29, retryAfterMs: 60_000 });
  revalidatePathMock.mockReset();
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.REVALIDATE_SECRET;
  else process.env.REVALIDATE_SECRET = ORIGINAL_SECRET;
});

describe('revalidation handlers', () => {
  it.each(endpointCases)('accepts a valid %s POST secret', async (_name, path, handler) => {
    const response = await handler(postRequest(path, { secret: 'test-secret' }));

    expect(response.status).toBe(200);
    expect((await response.json()).revalidated).toBe(true);
  });

  it.each(endpointCases)('rejects an invalid %s secret', async (_name, path, handler) => {
    const invalid = await handler(postRequest(path, { secret: 'wrong' }));
    expect(invalid.status).toBe(401);
    expect(await invalid.json()).toEqual({ message: 'Invalid token' });
  });

  it.each(endpointCases)('rejects a missing %s request secret', async (_name, path, handler) => {
    const missing = await handler(postRequest(path, {}));

    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({ message: 'Invalid token' });
  });

  it('rejects requests when the server secret is not configured', async () => {
    delete process.env.REVALIDATE_SECRET;
    const missing = await revalidateAssets(
      postRequest('/api/revalidate-assets', { secret: 'test-secret' }),
    );
    expect(missing.status).toBe(401);
  });

  it('preserves the legacy tweets GET query secret', async () => {
    const response = await revalidateTweets(
      new Request('https://arsvine.com/api/revalidate?secret=test-secret'),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).revalidated).toBe(true);
  });

  it.each(endpointCases)(
    'rate limits the %s endpoint before authentication',
    async (_name, path, handler) => {
      enforceRateLimitMock.mockResolvedValue({ ok: false, remaining: 0, retryAfterMs: 12_400 });
      const response = await handler(postRequest(path, { secret: 'test-secret' }));

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('13');
      expect(await response.json()).toEqual({ message: 'Too many requests' });
      expect(revalidatePathMock).not.toHaveBeenCalled();
    },
  );

  it('uses the dedicated assets limiter key', async () => {
    const response = await revalidateAssets(
      postRequest('/api/revalidate-assets', { secret: 'test-secret' }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).revalidated).toBe(true);
    expect(enforceRateLimitMock).toHaveBeenCalledWith('revalidate-assets:unknown', 30, 60_000);
    expect(revalidatePathMock).toHaveBeenCalled();
  });
});
