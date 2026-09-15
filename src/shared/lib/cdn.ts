import type {
  AssetReference,
  CatalogAssetReference,
  ExternalAssetReference,
  ManagedAssetReference,
} from '@/shared/types';
import { cdnOrigin } from '@/shared/config/site-endpoints';

const REALM_NAMESPACE = 'realm/';
const SHARED_NAMESPACE = 'shared/';

const IMAGE_PRESET_PARAMS = {
  thumb: 'eo-img.resize=w/320&eo-img.format=webp',
  card: 'eo-img.resize=w/720&eo-img.format=webp',
  large: 'eo-img.resize=l/1800&eo-img.format=webp',
  blur: 'eo-img.resize=w/32&eo-img.format=webp',
  rawDisplay: 'eo-img.format=webp',
  thumbAvif: 'eo-img.resize=w/320&eo-img.format=avif',
  cardAvif: 'eo-img.resize=w/720&eo-img.format=avif',
  largeAvif: 'eo-img.resize=l/1800&eo-img.format=avif',
} as const;
export type ImagePreset = keyof typeof IMAGE_PRESET_PARAMS;
const AVIF_FALLBACK_PRESET: Partial<Record<ImagePreset, ImagePreset>> = {
  thumb: 'thumbAvif',
  card: 'cardAvif',
  large: 'largeAvif',
};

export function normalizeCdnBase(base = cdnOrigin) {
  return base.replace(/\/+$/, '');
}
function normalizeObjectKey(objectKey: string) {
  return objectKey.replace(/^\/+/, '');
}
export function hasAllowedCdnNamespace(objectKey: string) {
  const key = normalizeObjectKey(objectKey);
  return key.startsWith(REALM_NAMESPACE) || key.startsWith(SHARED_NAMESPACE);
}
function isManagedObjectKey(value: string) {
  return hasAllowedCdnNamespace(value);
}
function isManagedAssetReference(value: AssetReference): value is ManagedAssetReference {
  return typeof value === 'object' && !!value && 'objectKey' in value;
}
function isExternalAssetReference(value: AssetReference): value is ExternalAssetReference {
  return typeof value === 'object' && !!value && 'url' in value;
}
export function isCatalogAssetReference(value: AssetReference): value is CatalogAssetReference {
  return typeof value === 'object' && !!value && 'catalogKey' in value;
}
function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}
function assertAllowedManagedObjectKey(objectKey: string) {
  const key = normalizeObjectKey(objectKey);
  if (!hasAllowedCdnNamespace(key))
    throw new Error(`Unsupported CDN objectKey namespace: ${objectKey}`);
  return key;
}
export function managedAsset(
  objectKey: string,
  meta: Omit<ManagedAssetReference, 'objectKey'> = {},
): ManagedAssetReference {
  return { objectKey: assertAllowedManagedObjectKey(objectKey), ...meta };
}
function catalogAsset(catalogKey: string, alt?: string): CatalogAssetReference {
  return alt ? { catalogKey, alt } : { catalogKey };
}
export function buildManagedAssetUrl(objectKey: string) {
  return `${normalizeCdnBase()}/${assertAllowedManagedObjectKey(objectKey)}`;
}
export function buildImageUrl(objectKey: string, preset: ImagePreset) {
  return `${buildManagedAssetUrl(objectKey)}?${IMAGE_PRESET_PARAMS[preset]}`;
}
export function buildImagePictureSources(objectKey: string, preset: ImagePreset) {
  const avif = AVIF_FALLBACK_PRESET[preset];
  return {
    avifUrl: avif ? buildImageUrl(objectKey, avif) : null,
    webpUrl: buildImageUrl(objectKey, preset),
  };
}
export function resolveRawAssetUrl(asset: AssetReference | null | undefined) {
  if (!asset) return '';
  if (typeof asset === 'string')
    return isAbsoluteUrl(asset) || asset.startsWith('/') ? asset : buildManagedAssetUrl(asset);
  if (isCatalogAssetReference(asset)) return '';
  if (isManagedAssetReference(asset)) return buildManagedAssetUrl(asset.objectKey);
  return isExternalAssetReference(asset) ? asset.url : '';
}
export function resolveImageUrl(asset: AssetReference | null | undefined, preset: ImagePreset) {
  if (!asset) return '';
  if (typeof asset === 'string')
    return isAbsoluteUrl(asset) || asset.startsWith('/') ? asset : buildImageUrl(asset, preset);
  if (isCatalogAssetReference(asset)) return '';
  if (isManagedAssetReference(asset)) return buildImageUrl(asset.objectKey, preset);
  return isExternalAssetReference(asset) ? asset.url : '';
}
export function resolveImagePictureSources(
  asset: AssetReference | null | undefined,
  preset: ImagePreset,
) {
  if (!asset || typeof asset === 'string')
    return typeof asset === 'string' && isManagedObjectKey(asset)
      ? buildImagePictureSources(asset, preset)
      : null;
  if (isCatalogAssetReference(asset)) return null;
  return isManagedAssetReference(asset) ? buildImagePictureSources(asset.objectKey, preset) : null;
}
export function resolveAssetAlt(asset: AssetReference | null | undefined, fallback = '') {
  return !asset || typeof asset === 'string' ? fallback : asset.alt || fallback;
}
// These are stable catalog identities, not COS object paths. The private
// catalog resolves them to the current immutable objectKey at render time.
const cdn = (key: string) => catalogAsset(normalizeObjectKey(key));
export const cover = (key: string) => cdn(`covers/${key}`);
export const gallery = (key: string) => cdn(`gallery/${key}`);
export const post = (key: string) => cdn(`posts/${key}`);
export const avatar = (key: string) => cdn(`avatar/${key}`);
export const music = (key: string) => cdn(`music/${key}`);
