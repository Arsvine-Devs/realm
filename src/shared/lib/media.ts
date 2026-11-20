import type {
  AssetReference,
  CatalogAssetReference,
  ExternalAssetReference,
  ManagedAssetReference,
} from '@/shared/types';

const REALM_NAMESPACE = 'realm/';
const SHARED_NAMESPACE = 'shared/';

export const PUBLIC_MEDIA_PATH = '/media';

function normalizeObjectKey(objectKey: string) {
  return objectKey.replace(/^\/+/, '');
}
export function isManagedMediaKey(objectKey: string) {
  const key = normalizeObjectKey(objectKey);
  return (
    (key.startsWith(REALM_NAMESPACE) || key.startsWith(SHARED_NAMESPACE)) &&
    key.split('/').every((part) => part && part !== '.' && part !== '..' && !part.includes('\\'))
  );
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
  if (!isManagedMediaKey(key))
    throw new Error(`Unsupported media object key namespace: ${objectKey}`);
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
  const key = assertAllowedManagedObjectKey(objectKey);
  return `${PUBLIC_MEDIA_PATH}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
export function resolveRawAssetUrl(asset: AssetReference | null | undefined) {
  if (!asset) return '';
  if (typeof asset === 'string')
    return isAbsoluteUrl(asset) || asset.startsWith('/') ? asset : buildManagedAssetUrl(asset);
  if (isCatalogAssetReference(asset)) return '';
  if (isManagedAssetReference(asset)) return buildManagedAssetUrl(asset.objectKey);
  return isExternalAssetReference(asset) ? asset.url : '';
}
export function resolveAssetAlt(asset: AssetReference | null | undefined, fallback = '') {
  return !asset || typeof asset === 'string' ? fallback : asset.alt || fallback;
}
// Catalog identities resolve to the active release's immutable media keys.
export const cover = (key: string) => catalogAsset(`covers/${key}`);
export const gallery = (key: string) => catalogAsset(`gallery/${key}`);
export const post = (key: string) => catalogAsset(`posts/${key}`);
export const avatar = (key: string) => catalogAsset(`avatar/${key}`);
export const music = (key: string) => catalogAsset(`music/${key}`);
