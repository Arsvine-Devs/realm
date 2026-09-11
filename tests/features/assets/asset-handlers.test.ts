import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAudioAssetsMock, getCollectionAssetsMock, getHomeAssetsMock, getWorksAssetsMock } =
  vi.hoisted(() => ({
    getAudioAssetsMock: vi.fn(),
    getCollectionAssetsMock: vi.fn(),
    getHomeAssetsMock: vi.fn(),
    getWorksAssetsMock: vi.fn(),
  }));

vi.mock('@/features/assets/server/catalog/catalog-provider', () => ({
  getAudioAssets: getAudioAssetsMock,
  getCollectionAssets: getCollectionAssetsMock,
  getHomeAssets: getHomeAssetsMock,
  getWorksAssets: getWorksAssetsMock,
}));

import audioHandler from '@/features/assets/server/audioHandler';
import collectionHandler from '@/features/assets/server/handlers/collectionHandler';
import homeHandler from '@/features/assets/server/handlers/homeHandler';
import worksHandler from '@/features/assets/server/handlers/worksHandler';

beforeEach(() => {
  getAudioAssetsMock.mockReset();
  getCollectionAssetsMock.mockReset();
  getHomeAssetsMock.mockReset();
  getWorksAssetsMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('asset Route Handlers', () => {
  it('returns catalog data with no-store caching', async () => {
    getHomeAssetsMock.mockResolvedValue([{ catalogKey: 'hero' }]);
    const response = await homeHandler();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ items: [{ catalogKey: 'hero' }] });
  });

  it('exposes catalog failures as 502 instead of an empty successful payload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getAudioAssetsMock.mockRejectedValue(new Error('COS unavailable'));
    const response = await audioHandler();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'asset_catalog_unavailable' });
  });

  it('parses works filters from Web URL search parameters', async () => {
    getWorksAssetsMock.mockResolvedValue({ items: [], page: 3 });
    const response = await worksHandler(
      new Request('https://arsvine.com/api/assets/works?page=3&collection=featured&tag=web'),
    );

    expect(response.status).toBe(200);
    expect(getWorksAssetsMock).toHaveBeenCalledWith({
      page: 3,
      collection: 'featured',
      tag: 'web',
    });
  });

  it('passes the App Router slug and normalized page to a collection query', async () => {
    getCollectionAssetsMock.mockResolvedValue({ items: [], page: 1 });
    const response = await collectionHandler(
      new Request('https://arsvine.com/api/assets/collections/maps?page=-2'),
      'maps',
    );

    expect(response.status).toBe(200);
    expect(getCollectionAssetsMock).toHaveBeenCalledWith('maps', 1);
  });
});
