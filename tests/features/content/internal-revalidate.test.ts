import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

import handler from '@/features/content/server/internalRevalidateHandler';

const SECRET = 'revalidation-secret';

function signedRequest(
  event: Record<string, unknown>,
  options: { secret?: string; timestamp?: number } = {},
) {
  const timestamp = String(options.timestamp ?? Date.now());
  const body = JSON.stringify({
    ...event,
    timestamp: new Date(Number(timestamp)).toISOString(),
  });
  const signature = createHmac('sha256', options.secret ?? SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return new Request('https://arsvine.com/api/internal/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-arsvine-timestamp': timestamp,
      'x-arsvine-signature': signature,
    },
    body,
  });
}

beforeEach(() => {
  vi.stubEnv('REVALIDATE_WEBHOOK_SECRET', SECRET);
  revalidatePathMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/internal/revalidate', () => {
  it('accepts a signed content event and refreshes the affected routes', async () => {
    const response = await handler(
      signedRequest({
        event: 'content.published',
        releaseId: 'release-1',
        resources: ['posts:hello-world', 'tweets'],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ revalidated: true, releaseId: 'release-1' });
    expect(body.paths).toEqual(
      expect.arrayContaining(['/zh-CN/content', '/zh-CN/tweets', '/zh-CN/blog/hello-world']),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/zh-CN/blog/hello-world');
  });

  it('rejects invalid and stale signatures before revalidating', async () => {
    const invalid = await handler(
      signedRequest(
        { event: 'content.published', releaseId: 'release-1', resources: [] },
        { secret: 'wrong-secret' },
      ),
    );
    const stale = await handler(
      signedRequest(
        { event: 'content.published', releaseId: 'release-1', resources: [] },
        { timestamp: Date.now() - 10 * 60 * 1000 },
      ),
    );

    expect(invalid.status).toBe(401);
    expect(stale.status).toBe(401);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rejects events outside the signed resource contract', async () => {
    const response = await handler(
      signedRequest({
        event: 'content.published',
        releaseId: 'release-1',
        resources: ['integrations:secrets'],
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: { code: 'INVALID_EVENT' } });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('reports partial route refresh failures without hiding the release id', async () => {
    revalidatePathMock.mockImplementationOnce(() => Promise.reject(new Error('refresh failed')));

    const response = await handler(
      signedRequest({
        event: 'assets.published',
        releaseId: '20260915T000000Z',
        resources: ['assets'],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      revalidated: false,
      partial: true,
      releaseId: '20260915T000000Z',
    });
    expect(body.failed).toHaveLength(1);
  });
});
