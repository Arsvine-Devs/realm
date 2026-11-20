import { describe, expect, it, vi } from 'vitest';

import { GET as getLive } from '@/app/api/health/live/route';
import { GET as getReady } from '@/app/api/health/ready/route';
import { checkCatalogReady } from '@/features/assets/server/catalog/catalog-provider';

vi.mock('@/features/assets/server/catalog/catalog-provider', () => ({
  checkCatalogReady: vi.fn(),
}));
vi.mock('@/shared/lib/content/content-api', () => ({ checkContentReady: vi.fn() }));

describe('Realm health routes', () => {
  it('reports liveness without requiring external configuration', async () => {
    const response = getLive();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'live', service: 'realm' });
  });

  it('reports readiness after the catalog and Content are available', async () => {
    const response = await getReady();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready', service: 'realm' });
  });

  it('reports unavailable when the active catalog cannot be read', async () => {
    vi.mocked(checkCatalogReady).mockRejectedValueOnce(new Error('unavailable'));
    const response = await getReady();
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
