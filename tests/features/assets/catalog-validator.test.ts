import { describe, expect, it } from 'vitest';

import { parseCatalogSection } from '@/features/assets/server/catalog/catalog-validator';

describe('catalog validator', () => {
  it('accepts valid list, collection, and static asset sections', () => {
    expect(parseCatalogSection('works', '[{"id":"one","objectKey":"realm/one.webp"}]')).toEqual([
      { id: 'one', objectKey: 'realm/one.webp' },
    ]);
    expect(() =>
      parseCatalogSection(
        'collections',
        JSON.stringify({
          collections: [{ slug: 'one', items: [{ id: 'asset', objectKey: 'realm/asset.webp' }] }],
        }),
      ),
    ).not.toThrow();
    expect(() =>
      parseCatalogSection(
        'static-assets',
        JSON.stringify({
          assets: { logo: { objectKey: 'realm/logo.webp' } },
        }),
      ),
    ).not.toThrow();
  });

  it('fails fast for duplicate IDs, missing references, and malformed fields', () => {
    expect(() =>
      parseCatalogSection('works', '[{"id":"one","objectKey":"a"},{"id":"one","objectKey":"b"}]'),
    ).toThrow(/duplicate id/);
    expect(() => parseCatalogSection('audio', '[{"id":"track"}]')).toThrow(/missing objectKey/);
    expect(() =>
      parseCatalogSection('works', '[{"id":"one","objectKey":"a","tags":"web"}]'),
    ).toThrow(/tags must be an array/);
  });
});
