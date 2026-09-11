import { readFile } from 'node:fs/promises';
import path from 'node:path';
import COS from 'cos-nodejs-sdk-v5';
import { parseCatalogSection } from './catalog-validator';

const PROJECT_NAMESPACE = 'realm';
const DEFAULT_PRIVATE_ROOT = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  'dist',
  'cos-upload',
  'private-root',
);
const DEFAULT_WORKS_PAGE_SIZE = 12;

type CatalogSectionName = 'home' | 'works' | 'collections' | 'links' | 'audio' | 'static-assets';
type CatalogStatus = 'published' | 'draft' | 'hidden';

interface CatalogCurrentPointer {
  version?: string;
  current?: string;
  path?: string;
}

interface CatalogImageRecord {
  id: string;
  status?: CatalogStatus;
  title?: string;
  description?: string;
  alt?: string;
  objectKey?: string;
  width?: number;
  height?: number;
  tags?: string[];
  collection?: string;
  order?: number;
  date?: string;
}

interface CatalogAudioRecord {
  id: string;
  status?: CatalogStatus;
  title?: string;
  artist?: string;
  objectKey?: string;
  order?: number;
  date?: string;
  duration?: number;
}

export interface PublicCatalogImageRecord {
  id: string;
  title: string;
  description: string;
  alt: string;
  objectKey: string;
  width?: number;
  height?: number;
  tags: string[];
  collection?: string;
  order?: number;
  date?: string;
}

export interface PublicCatalogAudioRecord {
  id: string;
  title: string;
  artist: string;
  objectKey: string;
  order?: number;
  date?: string;
  duration?: number;
}

export interface PublicCatalogStaticAsset {
  objectKey: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface CatalogCollectionsFile {
  collections?: Array<{
    slug: string;
    title?: string;
    description?: string;
    items?: CatalogImageRecord[];
  }>;
  items?: CatalogImageRecord[];
}

function readJson<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

function normalizePrefix(prefix = process.env.COS_PRIVATE_CATALOG_PREFIX || '') {
  return prefix.replace(/^\/+|\/+$/g, '');
}

function buildCatalogKey(relativeKey: string) {
  const prefix = normalizePrefix();
  return prefix ? `${prefix}/${relativeKey}` : relativeKey;
}

function getCosClient() {
  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  if (!secretId || !secretKey) {
    return null;
  }

  return new COS({
    SecretId: secretId,
    SecretKey: secretKey,
  });
}

async function readCosObjectText(key: string) {
  const bucket = process.env.COS_PRIVATE_BUCKET;
  const region = process.env.COS_PRIVATE_REGION;
  const client = getCosClient();
  if (!bucket || !region || !client) {
    return null;
  }

  const result = await client.getObject({
    Bucket: bucket,
    Region: region,
    Key: key,
  });

  const body = result.Body;
  if (typeof body === 'string') {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString('utf-8');
  }
  if (ArrayBuffer.isView(body)) {
    const view = body as Uint8Array;
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength).toString('utf-8');
  }

  return null;
}

async function readLocalObjectText(key: string) {
  const localRoot =
    process.env.NODE_ENV === 'test' && process.env.COS_PRIVATE_LOCAL_ROOT
      ? process.env.COS_PRIVATE_LOCAL_ROOT
      : DEFAULT_PRIVATE_ROOT;
  const fullPath = path.join(/* turbopackIgnore: true */ localRoot, ...key.split('/'));
  return readFile(fullPath, 'utf-8');
}

function extractCurrentVersion(pointer: CatalogCurrentPointer | string) {
  if (typeof pointer === 'string') {
    return pointer.replace(/\/+$/, '').split('/').pop() || pointer;
  }
  return (
    pointer.version || pointer.current || pointer.path?.replace(/\/+$/, '').split('/').pop() || null
  );
}

function isCatalogVersion(value: string): boolean {
  return /^\d{8}T\d{6}Z$/.test(value);
}

async function loadCurrentVersion(read: (relativeKey: string) => Promise<string | null>) {
  const currentRaw = await read(`${PROJECT_NAMESPACE}/catalog/current.json`);
  if (currentRaw == null) return null;
  const current = readJson<CatalogCurrentPointer | string>(currentRaw);
  const version = extractCurrentVersion(current);
  if (!version || !isCatalogVersion(version)) {
    throw new Error('Catalog current.json does not contain a version pointer');
  }
  return version;
}

async function loadSection(section: CatalogSectionName) {
  const readRemote = (relativeKey: string) => readCosObjectText(buildCatalogKey(relativeKey));
  const readLocal = (relativeKey: string) => readLocalObjectText(buildCatalogKey(relativeKey));
  const loadFrom = async (read: (relativeKey: string) => Promise<string | null>) => {
    const version = await loadCurrentVersion(read);
    if (!version) return null;
    const raw = await read(`${PROJECT_NAMESPACE}/catalog/versions/${version}/${section}.json`);
    if (raw == null) return null;
    return parseCatalogSection(section, raw);
  };

  try {
    const remote = await loadFrom(readRemote);
    if (remote != null) return remote;
  } catch (error) {
    console.warn(
      `[catalog] remote ${section} is invalid; using local fallback:`,
      (error as Error).message,
    );
  }

  const local = await loadFrom(readLocal);
  if (local == null) throw new Error(`[catalog] ${section} is unavailable remotely and locally`);
  return local;
}

function isPublished(status?: CatalogStatus) {
  return (status || 'published') === 'published';
}

function sortByOrderDate<T extends { order?: number; date?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const orderDelta = (left.order ?? 0) - (right.order ?? 0);
    if (orderDelta !== 0) {
      return orderDelta;
    }
    return (right.date || '').localeCompare(left.date || '');
  });
}

function toPublicImageRecord(record: CatalogImageRecord): PublicCatalogImageRecord | null {
  if (!isPublished(record.status) || !record.id || !record.objectKey) {
    return null;
  }

  return {
    id: record.id,
    title: record.title || '',
    description: record.description || '',
    alt: record.alt || '',
    objectKey: record.objectKey,
    width: record.width,
    height: record.height,
    tags: Array.isArray(record.tags) ? record.tags : [],
    collection: record.collection,
    order: record.order,
    date: record.date,
  };
}

function toPublishedImageRecords(records: CatalogImageRecord[]): PublicCatalogImageRecord[] {
  return records
    .map(toPublicImageRecord)
    .filter((item): item is PublicCatalogImageRecord => !!item);
}

function toPublicAudioRecord(record: CatalogAudioRecord): PublicCatalogAudioRecord | null {
  if (!isPublished(record.status) || !record.id || !record.objectKey) {
    return null;
  }

  return {
    id: record.id,
    title: record.title || '',
    artist: record.artist || '',
    objectKey: record.objectKey,
    order: record.order,
    date: record.date,
    duration: record.duration,
  };
}

function normalizeImageSection(section: unknown) {
  if (Array.isArray(section)) {
    return section as CatalogImageRecord[];
  }
  if (
    section &&
    typeof section === 'object' &&
    Array.isArray((section as { items?: unknown[] }).items)
  ) {
    return (section as { items: CatalogImageRecord[] }).items;
  }
  return [];
}

function paginate<T>(items: T[], page: number, pageSize = DEFAULT_WORKS_PAGE_SIZE) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const total = items.length;
  return {
    items: items.slice(start, end),
    page: safePage,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getHomeAssets() {
  const section = await loadSection('home');
  return sortByOrderDate(toPublishedImageRecords(normalizeImageSection(section)));
}

export async function getWorksAssets(
  options: { page?: number; collection?: string; tag?: string } = {},
) {
  const section = await loadSection('works');
  let items = toPublishedImageRecords(normalizeImageSection(section));

  if (options.collection) {
    items = items.filter((item) => item.collection === options.collection);
  }
  if (options.tag) {
    items = items.filter((item) => item.tags.includes(options.tag as string));
  }

  return paginate(sortByOrderDate(items), options.page ?? 1);
}

export async function getCollectionAssets(slug: string, page = 1) {
  const section = await loadSection('collections');
  const normalized = section as CatalogCollectionsFile;
  let items: CatalogImageRecord[] = [];

  if (Array.isArray(normalized.collections)) {
    items = normalized.collections.find((collection) => collection.slug === slug)?.items || [];
  } else if (Array.isArray(normalized.items)) {
    items = normalized.items.filter((item) => item.collection === slug);
  }

  return paginate(sortByOrderDate(toPublishedImageRecords(items)), page);
}

export async function getLinkAssets() {
  const section = await loadSection('links');
  return sortByOrderDate(toPublishedImageRecords(normalizeImageSection(section)));
}

export async function getAudioAssets() {
  const section = await loadSection('audio');
  const items = Array.isArray(section)
    ? (section as CatalogAudioRecord[])
    : Array.isArray((section as { items?: CatalogAudioRecord[] })?.items)
      ? (section as { items: CatalogAudioRecord[] }).items
      : [];

  return sortByOrderDate(
    items.map(toPublicAudioRecord).filter((item): item is PublicCatalogAudioRecord => !!item),
  );
}

export async function getStaticCatalogAssets(): Promise<Record<string, PublicCatalogStaticAsset>> {
  if (!process.env.COS_PRIVATE_BUCKET || !process.env.COS_PRIVATE_REGION || !getCosClient()) {
    return {};
  }

  const section = (await loadSection('static-assets')) as {
    assets?: Record<string, CatalogImageRecord>;
  };
  const assets: Record<string, PublicCatalogStaticAsset> = {};

  for (const [key, record] of Object.entries(section.assets || {})) {
    if (record.objectKey) {
      assets[key] = {
        objectKey: record.objectKey,
        alt: record.alt,
        width: record.width,
        height: record.height,
      };
    }
  }
  return assets;
}
