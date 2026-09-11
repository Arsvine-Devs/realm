import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { enforceRateLimitMock, verifyTotpGroupTokenMock } = vi.hoisted(() => ({
  enforceRateLimitMock: vi.fn(),
  verifyTotpGroupTokenMock: vi.fn(),
}));

vi.mock('@/shared/lib/content/rate-limit', () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock('@/shared/lib/content/totp', () => ({
  verifyTotpGroupToken: verifyTotpGroupTokenMock,
}));

vi.mock('@/shared/lib/content/access-grant', () => ({
  createAccessGrantCookie: (group: string) => `arsvine_post_access=grant-${group}; HttpOnly`,
}));

import handler from '@/features/blog/server/protectedVerifyHandler';

const ORIGINAL_TRUST_PROXY = process.env.TRUST_PROXY;
const ORIGINAL_VERCEL = process.env.VERCEL;

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://arsvine.com/api/protected-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  enforceRateLimitMock.mockReset().mockResolvedValue({ ok: true });
  verifyTotpGroupTokenMock.mockReset().mockReturnValue({ ok: true });
  delete process.env.VERCEL;
  process.env.TRUST_PROXY = '0';
});

afterEach(() => {
  if (ORIGINAL_TRUST_PROXY === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = ORIGINAL_TRUST_PROXY;
  if (ORIGINAL_VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = ORIGINAL_VERCEL;
});

describe('/api/protected-verify', () => {
  it('does not trust caller-provided forwarding headers by default', async () => {
    const response = await handler(
      request(
        { group: 'friends', token: '123456', next: '/en/blog/private' },
        { 'X-Forwarded-For': '203.0.113.25' },
      ),
    );

    expect(response.status).toBe(200);
    expect(enforceRateLimitMock).toHaveBeenCalledWith('totp:unknown:friends', 5, 60_000);
    expect(response.headers.get('Set-Cookie')).toContain('grant-friends');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('uses the trusted address when proxy trust is explicitly enabled', async () => {
    process.env.TRUST_PROXY = '1';
    await handler(
      request(
        { group: 'friends', token: '123456' },
        { 'X-Forwarded-For': '203.0.113.25, 10.0.0.1' },
      ),
    );

    expect(enforceRateLimitMock).toHaveBeenCalledWith('totp:203.0.113.25:friends', 5, 60_000);
  });

  it('returns Retry-After when the limiter rejects an attempt', async () => {
    enforceRateLimitMock.mockResolvedValue({ ok: false, retryAfterMs: 1_250 });
    const response = await handler(request({ group: 'friends', token: '123456' }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('2');
    expect(verifyTotpGroupTokenMock).not.toHaveBeenCalled();
  });
});
