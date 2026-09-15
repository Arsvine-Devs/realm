import { describe, expect, it } from 'vitest';

import { GET as getLive } from '@/app/api/health/live/route';
import { GET as getReady } from '@/app/api/health/ready/route';

describe('Realm health routes', () => {
  it('reports liveness without requiring external configuration', async () => {
    const response = getLive();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'live', service: 'realm' });
  });

  it('reports ready with source-controlled service origins', async () => {
    const response = getReady();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready', service: 'realm' });
  });
});
