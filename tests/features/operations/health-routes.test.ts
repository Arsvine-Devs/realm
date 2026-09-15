import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET as getLive } from '@/app/api/health/live/route';
import { GET as getReady } from '@/app/api/health/ready/route';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Realm health routes', () => {
  it('reports liveness without requiring external configuration', async () => {
    const response = getLive();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'live', service: 'realm' });
  });

  it('reports missing Content configuration as not ready', async () => {
    vi.stubEnv('CONTENT_BASE_URL', '');

    const response = getReady();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: 'not_ready',
      service: 'realm',
      reason: 'missing_configuration:CONTENT_BASE_URL',
    });
  });

  it('reports ready once required runtime origins are configured', async () => {
    vi.stubEnv('CONTENT_BASE_URL', 'https://content.example.com');

    const response = getReady();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready', service: 'realm' });
  });
});
