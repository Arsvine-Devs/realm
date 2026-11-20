import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAudioAssets,
  getCollectionAssets,
  getHomeAssets,
  getWorksAssets,
} from '@/features/assets/server/catalog/catalog-provider';

describe('catalog provider', () => {
  beforeEach(() => {
    const root = resolve('tests/fixtures/private-root');
    vi.stubEnv('REALM_CATALOG_ROOT', root);
    vi.stubEnv('REALM_CATALOG_POINTER', resolve(root, 'realm/catalog/current.json'));
  });

  afterEach(() => vi.unstubAllEnvs());

  it('reports a missing current pointer without falling back to a different release', async () => {
    vi.stubEnv('REALM_CATALOG_POINTER', resolve('tests/fixtures/missing-pointer.json'));
    await expect(getAudioAssets()).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('returns only published audio records in stable order', async () => {
    const items = await getAudioAssets();

    expect(items).toEqual([
      {
        id: 'track-one',
        title: 'Track One',
        artist: 'Artist One',
        objectKey: 'realm/audio/2026/07/08/track-one.feedbead.m4a',
        order: 1,
        date: '2026-07-09',
        duration: 111,
      },
      {
        id: 'track-two',
        title: 'Track Two',
        artist: 'Artist Two',
        objectKey: 'realm/audio/2026/07/08/track-two.deadbeef.m4a',
        order: 2,
        date: '2026-07-08',
        duration: 222,
      },
    ]);
  });

  it('projects only published home images with object keys from an items envelope', async () => {
    const items = await getHomeAssets();

    expect(items.map((item) => item.id)).toEqual(['home-default', 'home-published']);
    expect(items[0]).toMatchObject({
      id: 'home-default',
      title: '',
      description: '',
      alt: '',
      objectKey: 'realm/images/home/home-default.a1b2c3d4.webp',
      tags: [],
    });
  });

  it('filters, sorts, and paginates works after projecting published images', async () => {
    const firstPage = await getWorksAssets();
    const secondPage = await getWorksAssets({ page: 2 });
    const filtered = await getWorksAssets({ collection: 'alpha', tag: 'web' });

    expect(firstPage).toMatchObject({ page: 1, pageSize: 12, total: 13, totalPages: 2 });
    expect(firstPage.items.map((item) => item.id)).toEqual([
      'work-alpha-new',
      'work-alpha-old',
      'work-alpha-api',
      'work-beta-web',
      'work-05',
      'work-06',
      'work-07',
      'work-08',
      'work-09',
      'work-10',
      'work-11',
      'work-12',
    ]);
    expect(secondPage).toMatchObject({ page: 2, pageSize: 12, total: 13, totalPages: 2 });
    expect(secondPage.items.map((item) => item.id)).toEqual(['work-13']);
    expect(filtered).toMatchObject({ page: 1, pageSize: 12, total: 2, totalPages: 1 });
    expect(filtered.items.map((item) => item.id)).toEqual(['work-alpha-new', 'work-alpha-old']);
  });

  it('reads a nested collection envelope before projecting published images', async () => {
    const result = await getCollectionAssets('alpha');

    expect(result).toMatchObject({ page: 1, pageSize: 12, total: 2, totalPages: 1 });
    expect(result.items.map((item) => item.id)).toEqual(['collection-new', 'collection-old']);
  });
});
