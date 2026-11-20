import { expect, it } from 'vitest';
import { hydrateCatalogAssets } from '@/features/assets/server/catalog/hydrate-catalog-assets';

it('resolves a catalog asset for either registered media origin', () => {
  const ref = { catalogKey: 'decor/noise' };
  const catalog = { 'decor/noise': { objectKey: 'realm/decor/noise.12345678.webp' } };
  expect(hydrateCatalogAssets(ref, catalog, 'https://cdn.arsvine.test/media')).toEqual({
    url: 'https://cdn.arsvine.test/media/realm/decor/noise.12345678.webp',
  });
  expect(hydrateCatalogAssets(ref, catalog, '/media')).toEqual({
    url: '/media/realm/decor/noise.12345678.webp',
  });
});
