import type { PublicCatalogStaticAsset } from './catalog-provider';
import { isCatalogAssetReference, managedAsset } from '@/shared/lib/cdn';

export function hydrateCatalogAssets<T>(
  value: T,
  assets: Record<string, PublicCatalogStaticAsset>,
): T {
  if (Array.isArray(value)) return value.map((item) => hydrateCatalogAssets(item, assets)) as T;
  if (!value || typeof value !== 'object') return value;
  if (isCatalogAssetReference(value as never)) {
    const catalogReference = value as unknown as { catalogKey: string; alt?: string };
    const catalogAsset = assets[catalogReference.catalogKey];
    if (!catalogAsset) {
      if (Object.keys(assets).length === 0) return value;
      throw new Error(`Catalog does not contain ${catalogReference.catalogKey}`);
    }
    const metadata = Object.fromEntries(
      Object.entries({
        alt: catalogReference.alt || catalogAsset.alt,
        width: catalogAsset.width,
        height: catalogAsset.height,
      }).filter(([, entry]) => entry !== undefined),
    );
    return managedAsset(catalogAsset.objectKey, metadata) as T;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      hydrateCatalogAssets(item, assets),
    ]),
  ) as T;
}
