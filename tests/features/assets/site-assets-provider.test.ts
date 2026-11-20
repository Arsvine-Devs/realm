import { expect, it } from 'vitest';
import { getSiteAssetManifestUrl } from '@/features/assets/model/SiteAssetsProvider';

it('resolves the versioned public manifest through the same origin', () => {
  expect(getSiteAssetManifestUrl('20260710T163617Z')).toBe(
    '/media/realm/site-catalog/versions/20260710T163617Z/assets.json',
  );
});
